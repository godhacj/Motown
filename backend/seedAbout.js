/**
 * seedAbout.js
 * Upserts the SchoolProfile document with all About page content.
 *
 * Usage:
 *   node backend/seedAbout.js
 */

require('dotenv').config()
const mongoose      = require('mongoose')
const { SchoolProfile } = require('./schema')
const aboutContent  = require('./data/aboutContent')

;(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to:', mongoose.connection.host)

    const doc = await SchoolProfile.findOneAndUpdate(
      {},
      { $set: aboutContent },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    console.log('\n✓ SchoolProfile upserted')
    console.log(`  Houses:          ${doc.houses.length}`)
    console.log(`  Service contacts: ${doc.serviceContacts.length}`)
    console.log(`  FAQs:            ${doc.faqs.length}`)
    console.log(`  Anthem lines:    ${doc.anthem.length}`)

    await mongoose.disconnect()
    console.log('\nDone.')
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exit(1)
  }
})()
