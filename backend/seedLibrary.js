/**
 * seedLibrary.js — sample library catalogue for functionality testing
 *
 * Adds 10 digital titles (public-domain books from Project Gutenberg, readable
 * in the browser) and 5 physical titles. Existing library data is left alone.
 *
 * Usage:
 *   node backend/seedLibrary.js           — add/refresh the samples (safe to re-run)
 *   node backend/seedLibrary.js --remove  — delete only these samples
 *
 * Every sample carries SAMPLE_TAG in `edition` so it can be found and removed.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const { LibraryResource, LibraryBorrowRequest } = require('./schema')

const SAMPLE_TAG = 'Sample (test data)'

const gutenberg = (id) => ({
  fileUrl: `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
  coverImage: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
})

const DIGITAL = [
  {
    title: 'Calculus Made Easy', author: 'Silvanus P. Thompson', category: 'Textbook',
    subject: 'Mathematics', publisher: 'Macmillan', yearPublished: 1910, pages: 266,
    description: 'A friendly, step-by-step introduction to differentiation and integration — written for learners who find calculus intimidating.',
    ...gutenberg(33283),
  },
  {
    title: 'Relativity: The Special and General Theory', author: 'Albert Einstein', category: 'Non-Fiction',
    subject: 'Physics', publisher: 'Henry Holt', yearPublished: 1920, pages: 168,
    description: 'Einstein\'s own plain-language explanation of special and general relativity, intended for readers without advanced mathematics.',
    ...gutenberg(5001),
  },
  {
    title: 'On the Origin of Species', author: 'Charles Darwin', category: 'Non-Fiction',
    subject: 'Biology', publisher: 'John Murray', yearPublished: 1859, pages: 502,
    description: 'The founding text of evolutionary biology, setting out the theory of evolution by natural selection.',
    ...gutenberg(1228),
  },
  {
    title: 'The Republic', author: 'Plato', category: 'Non-Fiction',
    subject: 'Philosophy', publisher: 'Public domain', yearPublished: 1888, pages: 412,
    description: 'Socratic dialogues on justice, the ideal state and the philosopher-king — a cornerstone of Western political thought.',
    ...gutenberg(1497),
  },
  {
    title: 'The Wealth of Nations', author: 'Adam Smith', category: 'Non-Fiction',
    subject: 'Economics', publisher: 'W. Strahan and T. Cadell', yearPublished: 1776, pages: 1264,
    description: 'The classic study of markets, division of labour and free trade that shaped modern economics.',
    ...gutenberg(3300),
  },
  {
    title: 'The Prince', author: 'Niccolò Machiavelli', category: 'Non-Fiction',
    subject: 'Government', publisher: 'Public domain', yearPublished: 1532, pages: 140,
    description: 'A short, blunt handbook on acquiring and holding political power. Useful reading for Government students.',
    ...gutenberg(1232),
  },
  {
    title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Fiction',
    subject: 'Literature in English', publisher: 'T. Egerton', yearPublished: 1813, pages: 432,
    description: 'Elizabeth Bennet and Mr Darcy navigate manners, money and first impressions in Regency England.',
    ...gutenberg(1342),
  },
  {
    title: 'Frankenstein', author: 'Mary Shelley', category: 'Fiction',
    subject: 'Literature in English', publisher: 'Lackington, Hughes', yearPublished: 1818, pages: 280,
    description: 'A young scientist creates life and must face the consequences — the novel that began science fiction.',
    ...gutenberg(84),
  },
  {
    title: 'Alice\'s Adventures in Wonderland', author: 'Lewis Carroll', category: 'Fiction',
    subject: 'Literature in English', publisher: 'Macmillan', yearPublished: 1865, pages: 192,
    description: 'Alice follows a white rabbit into a world of riddles, nonsense and the Queen of Hearts.',
    ...gutenberg(11),
  },
  {
    title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', category: 'Fiction',
    subject: 'Literature in English', publisher: 'George Newnes', yearPublished: 1892, pages: 307,
    description: 'Twelve short mysteries solved by the famous detective of 221B Baker Street.',
    ...gutenberg(1661),
  },
].map((book) => ({ ...book, isDigital: true, totalCopies: 0, availableCopies: 0 }))

// Copy counts are deliberately varied: Arrow of God has a single copy so one
// approved request takes it out of stock and the "Currently out" state can be tested.
const PHYSICAL = [
  {
    title: 'Arrow of God', author: 'Chinua Achebe', category: 'Fiction',
    subject: 'Literature in English', publisher: 'Heinemann', yearPublished: 1964, pages: 230,
    description: 'Ezeulu, chief priest of Ulu, clashes with colonial power and his own people in 1920s Igboland.',
    totalCopies: 1,
  },
  {
    title: 'The Beautyful Ones Are Not Yet Born', author: 'Ayi Kwei Armah', category: 'Fiction',
    subject: 'Literature in English', publisher: 'Heinemann', yearPublished: 1968, pages: 183,
    description: 'An honest railway clerk struggles against corruption in post-independence Ghana.',
    totalCopies: 3,
  },
  {
    title: 'Chemistry for Senior High Schools', author: 'Sample Author', category: 'Textbook',
    subject: 'Chemistry', publisher: 'School Press', yearPublished: 2021, pages: 512,
    description: 'Placeholder SHS chemistry text covering atomic structure, bonding, stoichiometry and organic chemistry.',
    totalCopies: 6,
  },
  {
    title: 'WASSCE Integrated Science Past Questions 2018–2025', author: 'Achimota Science Department', category: 'Past Papers',
    subject: 'Integrated Science', publisher: 'Achimota School', yearPublished: 2025, pages: 240,
    description: 'Placeholder collection of WASSCE objective and theory questions with marking-scheme notes.',
    totalCopies: 8,
  },
  {
    title: 'Oxford Advanced Learner\'s Dictionary', author: 'A. S. Hornby', category: 'Reference',
    subject: 'English Language', publisher: 'Oxford University Press', yearPublished: 2020, pages: 1872,
    description: 'Definitions, pronunciation and usage notes for advanced learners of English.',
    totalCopies: 2,
  },
].map((book) => ({ ...book, isDigital: false, availableCopies: book.totalCopies }))

const SAMPLES = [...DIGITAL, ...PHYSICAL].map((book) => ({ ...book, edition: SAMPLE_TAG, isAvailable: true }))

async function addSamples() {
  let created = 0
  let updated = 0
  for (const book of SAMPLES) {
    const existing = await LibraryResource.findOne({ title: book.title, edition: SAMPLE_TAG })
    if (existing) {
      // Refresh metadata but keep stock and loans that testing has produced.
      const { totalCopies, availableCopies, ...meta } = book
      Object.assign(existing, meta)
      await existing.save()
      updated += 1
    } else {
      await LibraryResource.create(book)
      created += 1
    }
  }
  console.log(`  ✓  Library samples — ${created} created, ${updated} refreshed`)
  console.log(`     ${DIGITAL.length} digital · ${PHYSICAL.length} physical`)
}

async function removeSamples() {
  const samples = await LibraryResource.find({ edition: SAMPLE_TAG }).select('_id').lean()
  const ids = samples.map((s) => s._id)
  const requests = await LibraryBorrowRequest.deleteMany({ resourceId: { $in: ids } })
  const resources = await LibraryResource.deleteMany({ _id: { $in: ids } })
  console.log(`  ✓  Removed ${resources.deletedCount} sample titles and ${requests.deletedCount} related requests`)
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')
  if (process.argv.includes('--remove')) await removeSamples()
  else await addSamples()
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
