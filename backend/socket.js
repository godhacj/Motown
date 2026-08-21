const { Server } = require('socket.io')
const mongoose = require('mongoose')
const { Conference, Message, Student, Teacher } = require('./schema')

// Resolve a studentId/staffId/username/ObjectId to { id, role, name } — same
// pattern used by routes/messages.js and routes/reports.js.
async function resolveUser(param) {
  if (mongoose.isValidObjectId(param)) {
    const student = await Student.findById(param).select('firstName lastName').lean()
    if (student) return { id: student._id, role: 'Student', name: `${student.firstName} ${student.lastName}` }
    const teacher = await Teacher.findById(param).select('firstName lastName').lean()
    if (teacher) return { id: teacher._id, role: 'Teacher', name: `${teacher.firstName} ${teacher.lastName}` }
    return null
  }
  const student = await Student.findOne({ $or: [{ studentId: param }, { username: param }] }).select('firstName lastName').lean()
  if (student) return { id: student._id, role: 'Student', name: `${student.firstName} ${student.lastName}` }
  const teacher = await Teacher.findOne({ $or: [{ staffId: param }, { username: param }] }).select('firstName lastName').lean()
  if (teacher) return { id: teacher._id, role: 'Teacher', name: `${teacher.firstName} ${teacher.lastName}` }
  return null
}

// Ad-hoc conference lookup/creation, keyed by a caller-supplied room key
// (e.g. an AchiClass id) — no separate "schedule a meeting" step required.
async function findOrCreateConference(roomKey, host) {
  let conf = await Conference.findOne({ title: roomKey, status: { $in: ['scheduled', 'live'] } })
  if (!conf) {
    conf = await Conference.create({
      title: roomKey,
      hostId: host.id,
      hostName: host.name,
      type: 'class',
      status: 'live',
      startedAt: new Date(),
      participants: [],
    })
  } else if (conf.status === 'scheduled') {
    conf.status = 'live'
    conf.startedAt = conf.startedAt || new Date()
    await conf.save()
  }
  return conf
}

// Participant lists for typing relays. Membership changes rarely and a stale
// entry only costs a missed/extra "typing…", so a short TTL cache is plenty —
// it keeps a per-keystroke event from becoming a per-keystroke query.
const participantCache = new Map()   // threadId -> { ids: [String], expires: number }
const PARTICIPANT_TTL = 60_000

async function threadParticipants(threadId) {
  if (!mongoose.isValidObjectId(threadId)) return []
  const key = String(threadId)
  const hit = participantCache.get(key)
  if (hit && hit.expires > Date.now()) return hit.ids

  const thread = await Message.findById(key).select('participants').lean()
  const ids = (thread?.participants || []).map(String)
  participantCache.set(key, { ids, expires: Date.now() + PARTICIPANT_TTL })
  return ids
}

// When a user connects, everything addressed to them that never reached a
// device is now delivered. Flip those receipts and tell the senders so their
// single tick becomes a double one without needing a refresh.
async function markPendingAsDelivered(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId))
  const threads = await Message.find({
    participants: uid,
    messages: { $elemMatch: { senderId: { $ne: uid }, deliveredTo: { $ne: uid } } },
  }).select('type messages.senderId messages.deliveredTo').lean()
  if (!threads.length) return

  await Message.updateMany(
    { participants: uid },
    { $addToSet: { 'messages.$[m].deliveredTo': uid } },
    { arrayFilters: [{ 'm.senderId': { $ne: uid }, 'm.deliveredTo': { $ne: uid } }] }
  )

  for (const t of threads) {
    const senders = new Set(
      t.messages
        .filter(m => String(m.senderId) !== String(uid) && !(m.deliveredTo || []).some(d => String(d) === String(uid)))
        .map(m => String(m.senderId))
    )
    senders.forEach(sid => emitToUser(sid, 'messages-delivered', {
      threadId: String(t._id),
      type: t.type,
      recipientId: String(uid),
    }))
  }
}

function attachSignaling(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
  })

  // socket.id -> { conferenceId, userId, name, role }
  const sockets = new Map()

  io.on('connection', (socket) => {
    socket.on('join-room', async ({ conferenceId, userId, name, role }) => {
      try {
        const user = await resolveUser(userId)
        if (!user) return socket.emit('signal-error', { message: 'User not found' })

        const conf = await findOrCreateConference(conferenceId, user)
        const roomId = String(conf._id)

        const roster = [...(io.sockets.adapter.rooms.get(roomId) || [])]
          .map(sid => sockets.get(sid))
          .filter(Boolean)

        socket.join(roomId)
        sockets.set(socket.id, { conferenceId: roomId, userId: user.id, name: name || user.name, role: role || user.role })

        conf.participants.push({ userId: user.id, name: name || user.name, role: role || user.role, joinedAt: new Date() })
        await conf.save()

        socket.emit('room-joined', { conferenceId: roomId, roster })
        socket.to(roomId).emit('user-joined', { socketId: socket.id, name: name || user.name, role: role || user.role })
      } catch (err) {
        console.error('join-room error:', err.message)
        socket.emit('signal-error', { message: 'Failed to join room' })
      }
    })

    // Personal notification room — independent of the conference feature above.
    // Any connected client can join this to receive app-wide events (e.g. new-message).
    // The client may pass a human-readable id (studentId/staffId/username) or an
    // ObjectId — resolve to the canonical ObjectId so it matches what emitToUser
    // (called from routes/messages.js with real ObjectIds) actually targets.
    socket.on('identify', async ({ userId }) => {
      if (!userId) return
      const user = await resolveUser(userId)
      if (!user) return
      socket.join(`user:${user.id}`)
      socket.data.userId = String(user.id)
      socket.data.userName = user.name
      markPendingAsDelivered(user.id).catch(err =>
        console.error('delivery sweep error:', err.message))
    })

    // ── Typing indicator ────────────────────────────────────────────────
    // Relayed, never stored. The client throttles these and always sends a
    // final { isTyping: false }, but we also expire them on the receiving
    // side so a dropped connection can't leave a stuck "typing…" forever.
    socket.on('typing', async ({ threadId, isTyping }) => {
      const userId = socket.data.userId
      if (!userId || !threadId) return
      try {
        const participants = await threadParticipants(threadId)
        if (!participants.some(p => p === userId)) return
        participants
          .filter(p => p !== userId)
          .forEach(p => emitToUser(p, 'peer-typing', {
            threadId: String(threadId),
            userId,
            name: socket.data.userName || '',
            isTyping: !!isTyping,
          }))
      } catch { /* a bad thread id is not worth logging */ }
    })

    // Pure relay of WebRTC SDP/ICE payloads — server never inspects contents.
    socket.on('signal', ({ to, data }) => {
      io.to(to).emit('signal', { from: socket.id, data })
    })

    socket.on('mic-state', ({ micOn }) => {
      const info = sockets.get(socket.id)
      if (info) socket.to(info.conferenceId).emit('peer-mic-state', { socketId: socket.id, micOn })
    })

    socket.on('chat-message', ({ text }) => {
      const info = sockets.get(socket.id)
      if (!info || !text?.trim()) return
      io.to(info.conferenceId).emit('chat-message', { from: info.name, text: text.trim(), time: new Date().toISOString() })
    })

    const leaveCurrentRoom = async () => {
      const info = sockets.get(socket.id)
      if (!info) return
      sockets.delete(socket.id)
      socket.to(info.conferenceId).emit('user-left', { socketId: socket.id })

      try {
        const conf = await Conference.findById(info.conferenceId)
        if (!conf) return
        const p = [...conf.participants].reverse().find(p => String(p.userId) === String(info.userId) && !p.leftAt)
        if (p) {
          p.leftAt = new Date()
          p.duration = Math.round((p.leftAt - p.joinedAt) / 1000)
          conf.markModified('participants')
        }
        const remaining = (io.sockets.adapter.rooms.get(info.conferenceId) || new Set())
        if (remaining.size === 0) {
          conf.status = 'ended'
          conf.endedAt = new Date()
        }
        await conf.save()
      } catch (err) {
        console.error('leave-room cleanup error:', err.message)
      }
    }

    socket.on('leave-room', leaveCurrentRoom)
    socket.on('disconnect', leaveCurrentRoom)
  })

  _io = io
  return io
}

// Emit an event to a user's personal notification room, if they have any
// socket connected. Safe to call regardless — emitting to an empty room is
// a silent no-op.
let _io = null
function emitToUser(userId, event, payload) {
  if (!_io || !userId) return
  _io.to(`user:${userId}`).emit(event, payload)
}

// Whether a user currently has at least one socket connected — used to decide
// whether a freshly sent message counts as delivered.
function isUserOnline(userId) {
  if (!_io || !userId) return false
  return (_io.sockets.adapter.rooms.get(`user:${userId}`)?.size || 0) > 0
}

module.exports = { attachSignaling, emitToUser, isUserOnline }
