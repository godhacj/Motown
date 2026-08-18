const { Server } = require('socket.io')
const mongoose = require('mongoose')
const { Conference, Student, Teacher } = require('./schema')

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

module.exports = { attachSignaling, emitToUser }
