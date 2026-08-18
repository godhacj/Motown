const express  = require('express')
const mongoose = require('mongoose')
const { Message, Student, Teacher } = require('../schema')
const { emitToUser } = require('../socket')
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
        lastMsg: last?.text || '',
        time: last?.sentAt || t.updatedAt,
        unread,
        online: false,
        messages: t.messages.map(m => ({
          id: m._id, from: String(m.senderId) === String(uid) ? 'me' : String(m.senderId),
          text: m.text, time: m.sentAt, date: m.sentAt, attachments: m.attachments || [],
        })),
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
      const unread = g.messages.filter(m => String(m.senderId) !== String(uid) && !m.readBy?.some(r => String(r) === String(uid))).length

      return {
        id: g._id,
        name: g.groupName,
        type: g.groupType,
        initials: initials(g.groupName || ''),
        locked: g.isLocked,
        members: g.totalMembers ?? g.participants.length,
        lastMsg: last ? `${last.senderName}: ${last.text}` : '',
        time: last?.sentAt || g.updatedAt,
        unread,
        messages: g.messages.map(m => ({
          id: m._id, from: String(m.senderId) === String(uid) ? 'me' : String(m.senderId),
          name: m.senderName, text: m.text, time: m.sentAt, date: m.sentAt, attachments: m.attachments || [],
        })),
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

    await Message.updateOne(
      { _id: req.params.threadId },
      { $addToSet: { 'messages.$[].readBy': uid } }
    )
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
    const { senderId: rawSenderId, senderName, text, attachments } = req.body
    const cleanAttachments = Array.isArray(attachments) ? attachments.slice(0, 1) : []
    if (!rawSenderId || (!text?.trim() && !cleanAttachments.length))
      return res.status(400).json({ error: 'senderId and (text or an attachment) are required' })

    const senderId = await resolveUserId(rawSenderId)
    if (!senderId) return res.status(404).json({ error: 'Sender not found' })

    const thread = await Message.findById(req.params.threadId)
    if (!thread) return res.status(404).json({ error: 'Thread not found' })

    const msg = {
      senderId, senderName, text: text?.trim() || '',
      sentAt: new Date(), readBy: [senderId],
      attachments: cleanAttachments,
    }
    thread.messages.push(msg)
    await thread.save()

    const savedMsg = thread.messages[thread.messages.length - 1]
    const recipients = thread.participants.filter(p => String(p) !== String(senderId))
    recipients.forEach(rid => emitToUser(String(rid), 'new-message', {
      threadId: String(thread._id),
      type: thread.type,
      message: {
        id: savedMsg._id, from: String(senderId), text: savedMsg.text,
        time: savedMsg.sentAt, date: savedMsg.sentAt,
        attachments: savedMsg.attachments || [],
        name: savedMsg.senderName,
      },
      senderName,
    }))

    res.status(201).json(savedMsg)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
