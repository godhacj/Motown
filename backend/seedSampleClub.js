/**
 * seedSampleClub.js — one sample club wired to the club-admin login, for
 * testing the Club portal end to end.
 *
 * Usage:
 *   node backend/seedSampleClub.js           — create/refresh the sample (safe to re-run)
 *   node backend/seedSampleClub.js --remove  — delete it and unlink club-admin
 *
 * The club is tagged by SAMPLE_NAME; real clubs are never touched.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const { Club, Student, Teacher, AdminUser } = require('./schema')

const SAMPLE_NAME = 'Coding & Robotics Club (Sample)'
const CLUB_ADMIN = 'club-admin'

async function add() {
  const students = await Student.find({ status: 'Active' }).sort({ lastName: 1 }).limit(4).select('firstName lastName').lean()
  const patron = await Teacher.findOne({ department: 'General Science' }).select('_id firstName lastName').lean()
  const roles = ['President', 'Vice President', 'Secretary', 'Member']
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const data = {
    clubName: SAMPLE_NAME,
    category: 'STEM',
    description: 'Sample (test data) — builds small robots and learns programming. Safe to edit or delete.',
    clubHead: students[0] ? `${students[0].firstName} ${students[0].lastName}` : 'Club President',
    patronTeacher: patron?._id,
    status: 'Active',
    meetingDay: 'Wednesday',
    meetingTime: '3:30 PM',
    meetingVenue: 'ICT Lab',
    members: students.map((s, i) => ({
      studentId: s._id, name: `${s.firstName} ${s.lastName}`, role: roles[i] || 'Member',
      joinedDate: new Date(now - (40 - i * 5) * day), status: 'Active',
    })),
    activities: [
      { title: 'Intro to Arduino', date: new Date(now - 21 * day), description: 'Built blinking-LED circuits.', outcome: '18 attended' },
      { title: 'Line-follower robot build', date: new Date(now - 7 * day), description: 'Teams assembled and tuned line followers.', outcome: '3 working robots' },
    ],
  }
  data.totalMembers = data.members.length

  const club = await Club.findOneAndUpdate({ clubName: SAMPLE_NAME }, { $set: data }, { upsert: true, new: true, runValidators: true })
  const admin = await AdminUser.findOneAndUpdate({ username: CLUB_ADMIN }, { $set: { 'scope.club': club._id } }, { new: true })
  console.log(`Sample club ready: ${club.clubName} (${club._id}), ${club.members.length} members`)
  console.log(admin ? `Linked ${CLUB_ADMIN} → this club` : `No "${CLUB_ADMIN}" account found — link one in Management → Portal accounts`)
}

async function remove() {
  const club = await Club.findOne({ clubName: SAMPLE_NAME }).lean()
  if (!club) return console.log('No sample club to remove')
  await AdminUser.updateMany({ 'scope.club': club._id }, { $unset: { 'scope.club': '' } })
  await Club.deleteOne({ _id: club._id })
  console.log('Sample club removed and club-admin unlinked')
}

;(async () => {
  await mongoose.connect(process.env.MONGO_URI)
  try { await (process.argv.includes('--remove') ? remove() : add()) }
  finally { await mongoose.disconnect() }
})().catch((err) => { console.error(err); process.exit(1) })
