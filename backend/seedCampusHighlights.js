/**
 * seedCampusHighlights.js — seeds the 8 Badge shield-key popups.
 *
 * Usage:  node backend/seedCampusHighlights.js
 * Idempotent: safe to re-run (upsert by order).
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const { CampusHighlight } = require('./schema')

const HIGHLIGHTS = [
  { order: 0, title: 'Main Campus',       description: 'Historic campus in Accra, home to Achimota’s premier education.',        image: '/media/page/main-campus.jpg' },
  { order: 1, title: 'School Entrance',   description: 'The iconic entrance symbolizing Achimota’s heritage and tradition.',      image: '/media/page/school-entrance.jpg' },
  { order: 2, title: 'Academic Block',    description: 'Classroom facilities where students pursue academic excellence.',              image: '/media/page/academic-block.jpg' },
  { order: 3, title: 'Student Life',      description: 'Vibrant student activities and campus life at Achimota.',                     image: '/media/page/student-life.jpg' },
  { order: 4, title: 'Chapel & Assembly', description: 'Gathering place for events, worship, and celebrations.',                       image: '/media/page/chapel-assembly.jpg' },
  { order: 5, title: 'Sports Field',      description: 'Fields for athletics, football, and team competitions.',                       image: '/media/page/sports-field.jpg' },
  { order: 6, title: 'Campus Life',       description: 'Daily campus scenes reflecting student interaction and growth.',               image: '/media/page/campus-life.jpg' },
  { order: 7, title: 'Boarding Houses',   description: 'Student residences fostering camaraderie and community living.',               image: '/media/page/boarding-houses.jpg' },
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  for (const h of HIGHLIGHTS) {
    await CampusHighlight.findOneAndUpdate(
      { order: h.order },
      { $set: h },
      { upsert: true, new: true }
    )
    console.log(`  ✓  [${h.order}] ${h.title}`)
  }

  console.log('\nDone. 8 campus highlights seeded.')
  await mongoose.disconnect()
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1) })
