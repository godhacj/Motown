/**
 * seedMessages.js — wipes all Message documents (direct + group threads).
 *
 * Chat now starts empty for every user; conversations are created only via
 * real usage (the "New Message" dialog in Chat.jsx / POST /api/messages/direct).
 * Re-run any time to reset chat data back to empty.
 *
 * Usage:  node backend/seedMessages.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')

const { Message } = require('./schema')

async function wipe() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  const result = await Message.deleteMany({})
  console.log(`Deleted ${result.deletedCount} Message document(s).`)

  await mongoose.disconnect()
}

wipe().catch(err => {
  console.error('Wipe failed:', err.message)
  process.exit(1)
})
