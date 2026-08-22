const express  = require('express')
const mongoose = require('mongoose')
const { Message, Student, Teacher } = require('../schema')
const { emitToUser, isUserOnline } = require('../socket')
const router   = express.Router()

// Resolve a route param (Mongo ObjectId, studentId, or username) to a user's ObjectId
async function resolveUserId(param) {
  if (mongoose.isValidObjectId(param)) return param
  const student = await Student.findOne({ $or: [{ studentId: param }, { username: param }] }).select('_id').lean()
  if (student) return String(student._id)
  const teacher = await Teacher.findOne({ $or: [{ staffId: param }, { username: param }] }).select('_id').lean()
  if (teacher) return String(teacher._id)
  return null
}

// Resolve a Student or Teacher document (with display fields) by ObjectId
async function resolveParticipant(id) {
  const student = await Student.findById(id).select('firstName lastName passportPhoto').lean()
  if (student) return { name: `${student.firstName} ${student.lastName}`, photo: student.passportPhoto || null, role: 'Student' }
  const teacher = await Teacher.findById(id).select('firstName lastName photo role').lean()
  if (teacher) return { name: `${teacher.firstName} ${teacher.lastName}`, photo: teacher.photo || null, role: teacher.role === 'teacher' ? 'Teacher' : 'HOD' }
  return { name: 'Unknown', photo: null, role: 'Unknown' }
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Tick state for a message the requesting user sent:
//   sent      — stored on the server, recipient not connected yet
//   delivered — reached at least one recipient's device (double grey tick)
//   read      — opened by every other participant (double accent tick)
function receiptStatus(m, otherIds) {
  if (!otherIds.length) return 'sent'
  const has = (list, id) => (list || []).some(x => String(x) === String(id))
  if (otherIds.every(o => has(m.readBy, o))) return 'read'
  if (otherIds.some(o => has(m.deliveredTo, o))) return 'delivered'
  return 'sent'
}

// One shape for every message the client receives — from the initial thread
// fetch and from the live socket event alike, so the UI never has to branch.
//
// `status` keeps the strict all-recipients-read rule as its source of truth
// (matches direct messages, stays truthful — no fuzzy "some read" state).
// In a large group that makes the blue tick rare in practice, so messages
// with more than one other participant also carry readCount/totalRecipients
// — the UI shows "Read by 12/40" well before the last straggler catches up,
// instead of leaving the sender staring at grey ticks indefinitely.
function serializeMessage(m, uid, otherIds) {
  const isMine = String(m.senderId) === String(uid)
  const readCount = otherIds.length
    ? otherIds.filter(o => (m.readBy || []).some(r => String(r) === String(o))).length
    : 0
  return {
    id: m._id,
    from: isMine ? 'me' : String(m.senderId),
    name: m.senderName,
    text: m.text,
    time: m.sentAt,
    date: m.sentAt,
    attachments: m.attachments || [],
    replyTo: m.replyTo?.messageId
      ? { id: String(m.replyTo.messageId), name: m.replyTo.senderName, text: m.replyTo.text, type: m.replyTo.type }
      : null,
    status: isMine ? receiptStatus(m, otherIds) : null,
    ...(isMine && otherIds.length > 1 ? { readCount, totalRecipients: otherIds.length } : {}),
  }
}

// Trim a client-supplied reply quote down to the fields we store.
function cleanReplyTo(raw) {
  if (!raw?.id || !mongoose.isValidObjectId(raw.id)) return undefined
  return {
    messageId:  raw.id,
    senderName: String(raw.name || '').slice(0, 80),
    text:       String(raw.text || '').slice(0, 240),
    type:       String(raw.type || 'text').slice(0, 20),
  }
}

// A short preview of a message for thread lists and reply quotes.
function previewOf(msg) {
  if (msg?.text) return msg.text
  const type = msg?.attachments?.[0]?.type
  if (type === 'audio') return '🎤 Voice note'
  if (type) return '📎 Attachment'
  return ''
}

// GET /api/messages/inbox/:userId — direct-message threads for a user, newest first
router.get('/inbox/:userId', async (req, res) => {
  try {
    const uid = await resolveUserId(req.params.userId)
    if (!uid) return res.status(404).json({ error: 'User not found' })
    const threads = await Message.find({ type: 'direct', participants: uid }).sort({ updatedAt: -1 }).lean()

    const result = await Promise.all(threads.map(async t => {
      const otherId = t.participants.find(p => String(p) !== String(uid))
      const other = await resolveParticipant(otherId)
      const last = t.messages[t.messages.length - 1]
      const unread = t.messages.filter(m => String(m.senderId) !== String(uid) && !m.readBy?.some(r => String(r) === String(uid))).length

      return {
        id: t._id,
        name: other.name,
        initials: initials(other.name),
        role: other.role,
        photo: other.photo,
        lastMsg: previewOf(last),
        time: last?.sentAt || t.updatedAt,
        unread,
        online: isUserOnline(otherId),
        messages: t.messages.map(m => serializeMessage(m, uid, [otherId])),
      }
    }))

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/messages/groups/:userId — group threads for a user, newest first
router.get('/groups/:userId', async (req, res) => {
  try {
    const uid = await resolveUserId(req.params.userId)
    if (!uid) return res.status(404).json({ error: 'User not found' })
    const groups = await Message.find({ type: 'group', participants: uid }).sort({ updatedAt: -1 }).lean()

    const result = groups.map(g => {
      const last = g.messages[g.messages.length - 1]
      const otherIds = g.participants.filter(p => String(p) !== String(uid))
      const unread = g.messages.filter(m => String(m.senderId) !== String(uid) && !m.readBy?.some(r => String(r) === String(uid))).length

      return {
        id: g._id,
        name: g.groupName,
        type: g.groupType,
        initials: initials(g.groupName || ''),
        locked: g.isLocked,
        members: g.totalMembers ?? g.participants.length,
        lastMsg: last ? `${last.senderName}: ${previewOf(last)}` : '',
        time: last?.sentAt || g.updatedAt,
        unread,
        messages: g.messages.map(m => serializeMessage(m, uid, otherIds)),
      }
    })

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/messages/:threadId/read — mark every message in a thread as read by userId
router.patch('/:threadId/read', async (req, res) => {
  try {
    const { userId: rawUserId } = req.body
    const uid = await resolveUserId(rawUserId)
    if (!uid) return res.status(404).json({ error: 'User not found' })

    // Reading also implies delivery — a message you have open certainly reached you.
    const result = await Message.updateOne(
      { _id: req.params.threadId },
      { $addToSet: { 'messages.$[].readBy': uid, 'messages.$[].deliveredTo': uid } }
    )

    // Tell the other participants to flip their ticks. Only worth a round trip
    // when something actually changed.
    if (result.modifiedCount) {
      const thread = await Message.findById(req.params.threadId).select('participants type').lean()
      thread?.participants
        .filter(p => String(p) !== String(uid))
        .forEach(p => emitToUser(String(p), 'messages-read', {
          threadId: String(req.params.threadId),
          type: thread.type,
          readerId: String(uid),
        }))
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/messages/unread-count/:userId — total unread messages across all threads
router.get('/unread-count/:userId', async (req, res) => {
  try {
    const uid = await resolveUserId(req.params.userId)
    if (!uid) return res.status(404).json({ error: 'User not found' })
    const oid = new mongoose.Types.ObjectId(uid)

    const result = await Message.aggregate([
      { $match: { participants: oid } },
      { $unwind: '$messages' },
      { $match: {
          'messages.senderId': { $ne: oid },
          'messages.readBy': { $ne: oid },
      } },
      { $count: 'total' },
    ])
    res.json({ total: result[0]?.total || 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/messages/direct — find or create a direct thread with a recipient
router.post('/direct', async (req, res) => {
  try {
    const { userId: rawUserId, recipientId: rawRecipientId } = req.body
    if (!rawUserId || !rawRecipientId)
      return res.status(400).json({ error: 'userId and recipientId are required' })

    const uid = await resolveUserId(rawUserId)
    if (!uid) return res.status(404).json({ error: 'User not found' })
    const rid = await resolveUserId(rawRecipientId)
    if (!rid) return res.status(404).json({ error: 'Recipient not found' })
    if (String(uid) === String(rid))
      return res.status(400).json({ error: 'Cannot start a conversation with yourself' })

    let thread = await Message.findOne({
      type: 'direct',
      participants: { $all: [uid, rid], $size: 2 },
    })
    if (!thread) {
      thread = await Message.create({ type: 'direct', participants: [uid, rid], messages: [] })
    }

    const other = await resolveParticipant(rid)
    res.status(201).json({
      id: thread._id,
      name: other.name,
      initials: initials(other.name),
      role: other.role,
      photo: other.photo,
      lastMsg: '',
      time: thread.updatedAt,
      unread: 0,
      online: false,
      messages: [],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/messages/:threadId/send — append a message to a thread
router.post('/:threadId/send', async (req, res) => {
  try {
    const { senderId: rawSenderId, senderName, text, attachments, replyTo } = req.body
    // One attachment per message by design — the composer only ever uploads
    // a single image or voice note at a time (one preview slot, no multi-
    // select), so this just enforces what the client already guarantees.
    // Supporting more than one would need multi-file selection, a preview
    // list, and per-item upload progress on the frontend too.
    const cleanAttachments = Array.isArray(attachments) ? attachments.slice(0, 1) : []
    if (!rawSenderId || (!text?.trim() && !cleanAttachments.length))
      return res.status(400).json({ error: 'senderId and (text or an attachment) are required' })

    const senderId = await resolveUserId(rawSenderId)
    if (!senderId) return res.status(404).json({ error: 'Sender not found' })

    const thread = await Message.findById(req.params.threadId)
    if (!thread) return res.status(404).json({ error: 'Thread not found' })

    const recipients = thread.participants.filter(p => String(p) !== String(senderId))
    // Anyone with a live socket right now counts as delivered immediately;
    // the rest are caught up by the sweep in socket.js when they reconnect.
    const deliveredTo = recipients.filter(rid => isUserOnline(rid))

    const msg = {
      senderId, senderName, text: text?.trim() || '',
      sentAt: new Date(), readBy: [senderId], deliveredTo,
      attachments: cleanAttachments,
      replyTo: cleanReplyTo(replyTo),
    }
    thread.messages.push(msg)
    await thread.save()

    const savedMsg = thread.messages[thread.messages.length - 1]
    recipients.forEach(rid => emitToUser(String(rid), 'new-message', {
      threadId: String(thread._id),
      type: thread.type,
      // Serialized from the recipient's point of view — `from` is the sender's
      // id and `status` is null, exactly as the thread fetch would return it.
      message: serializeMessage(savedMsg, String(rid), [senderId]),
      senderName,
    }))

    // Echo the stored message back to the sender so the optimistic bubble can
    // swap in the real id (needed for replies) and the correct tick state.
    res.status(201).json(serializeMessage(savedMsg, String(senderId), recipients.map(String)))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
