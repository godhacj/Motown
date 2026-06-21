/**
 * seedAll.js — Achimota School (Motown)
 * Seeds every collection with real data drawn from the frontend constants
 * and the actual files now living in Motown_Media.
 *
 * Usage:
 *   node backend/seedAll.js           — wipes & re-seeds everything
 *   node backend/seedAll.js --append  — skips collections that already have data
 */

require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const {
  Student, Teacher, Admin,
  GalleryItem, PagePost,
  Product, Order,
  Assessment, Attendance, Achievement, Clearance,
  House, Club, Announcement, Message,
  LibraryResource, Syllabus, Chapel,
  Infrastructure, MapLocation,
  SchoolProfile, Conference,
} = require('./schema')

const APPEND = process.argv.includes('--append')

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function seed(Model, docs, label) {
  if (APPEND) {
    const count = await Model.countDocuments()
    if (count > 0) { console.log(`  skip  ${label} (${count} docs exist)`); return }
  } else {
    await Model.deleteMany({})
  }
  const inserted = await Model.insertMany(docs, { ordered: false })
  console.log(`  ✓  ${label} — ${inserted.length} docs`)
}

async function upsertOne(Model, filter, doc, label) {
  await Model.findOneAndUpdate(filter, doc, { upsert: true, returnDocument: 'after' })
  console.log(`  ✓  ${label}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

async function seedStudents() {
  const hash = (pw) => bcrypt.hash(pw, 10)
  const students = [
    {
      username: 'Student_001', password: await hash('Pass123'),
      role: 'student', studentId: 'STU20240001',
      email: 'michael.owusu@achimota.edu.gh',
      passportPhoto: '/media/avatars/michael.jpg', fingerprint: 'captured',
      firstName: 'Michael', middleName: 'Kwame', lastName: 'Owusu',
      dob: new Date('2007-03-15'), gender: 'Male',
      hometown: 'Kumasi', placeOfBirth: 'Kumasi', nationality: 'Ghanaian',
      ethnicGroup: 'Akan', denomination: 'Christian',
      homeAddress: '12 Osei Bonsu Street, Adum, Kumasi', poBox: 'P.O. Box KS 4421',
      guardians: [
        { name: 'Emmanuel Owusu', relation: 'Father', occupation: 'Civil Engineer',
          phone: '+233 24 456 7890', email: 'e.owusu@gmail.com',
          address: '12 Osei Bonsu Street, Kumasi' },
        { name: 'Grace Owusu', relation: 'Mother', occupation: 'Nurse',
          phone: '+233 20 987 6543', email: 'grace.owusu@gmail.com',
          address: '12 Osei Bonsu Street, Kumasi' },
      ],
      jhsIndex: '1234567890', previousSchool: 'Kumasi Anglican JHS',
      previousSchoolLocation: 'Kumasi, Ashanti Region',
      beceResults: [
        { subject: 'English Language', grade: 'A1' },
        { subject: 'Mathematics', grade: 'A1' },
        { subject: 'Integrated Science', grade: 'B2' },
        { subject: 'Social Studies', grade: 'A1' },
        { subject: 'ICT', grade: 'A1' },
        { subject: 'French', grade: 'B3' },
        { subject: 'Religious & Moral Ed.', grade: 'B2' },
        { subject: 'Basic Design & Tech.', grade: 'A1' },
      ],
      program: 'General Science', campus: 'Boarding',
      records: [
        { title: 'Best Student', description: 'Awarded best student in JHS 2023/24', year: '2024' },
        { title: 'Head Prefect', description: 'Served as Head Prefect 2023/24', year: '2024' },
      ],
      essayWhy: 'Achimota School has long stood as a beacon of excellence in Ghana...',
      essayPersonality: 'I am a curious, determined, and empathetic person...',
      classLevel: 'SHS 1', house: 'Aggrey', prefectPosition: 'None',
      status: 'Active', isProspect: false,
    },
    {
      username: 'Student_002', password: await hash('Pass123'),
      role: 'student', studentId: 'STU20240002',
      email: 'ama.serwaa@achimota.edu.gh',
      firstName: 'Ama', lastName: 'Serwaa',
      dob: new Date('2007-07-22'), gender: 'Female',
      hometown: 'Accra', nationality: 'Ghanaian', denomination: 'Christian',
      program: 'General Arts', campus: 'Day',
      classLevel: 'SHS 1', house: 'Cadbury',
      status: 'Active', isProspect: false,
    },
    {
      username: 'Student_003', password: await hash('Pass123'),
      role: 'student', studentId: 'STU20240003',
      email: 'kofi.adu@achimota.edu.gh',
      firstName: 'Kofi', lastName: 'Adu',
      dob: new Date('2006-11-05'), gender: 'Male',
      hometown: 'Takoradi', nationality: 'Ghanaian', denomination: 'Christian',
      program: 'General Science', campus: 'Boarding',
      classLevel: 'SHS 2', house: 'Guggisberg',
      status: 'Active', isProspect: false,
    },
  ]
  await seed(Student, students, 'Students')
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TEACHERS
// ─────────────────────────────────────────────────────────────────────────────

async function seedTeachers() {
  const hash = (pw) => bcrypt.hash(pw, 10)
  const teachers = [
    {
      username: 'teacher_adjoa', password: await hash('Teacher123'),
      role: 'teacher', staffId: 'TCH20240001',
      firstName: 'Adjoa', lastName: 'Mensah',
      email: 'adjoa.mensah@achimota.edu.gh', phone: '+233 24 111 2233',
      gender: 'Female', department: 'Science',
      subjects: ['Biology', 'Integrated Science'],
      classesHandled: ['SHS 1A', 'SHS 2B'],
      position: 'Head of Science Department',
      qualification: 'M.Sc Biology', yearsOfService: 8, status: 'Active',
    },
    {
      username: 'teacher_kweku', password: await hash('Teacher123'),
      role: 'teacher', staffId: 'TCH20240002',
      firstName: 'Kweku', lastName: 'Mensah',
      email: 'kweku.mensah@achimota.edu.gh', phone: '+233 20 444 5566',
      gender: 'Male', department: 'Arts',
      subjects: ['Literature', 'English Language'],
      classesHandled: ['SHS 1B', 'SHS 3A'],
      position: 'Class Teacher', qualification: 'B.Ed English', yearsOfService: 5,
      status: 'Active',
    },
    {
      username: 'teacher_felicia', password: await hash('Teacher123'),
      role: 'teacher', staffId: 'TCH20240003',
      firstName: 'Felicia', lastName: 'Ansah',
      email: 'felicia.ansah@achimota.edu.gh', phone: '+233 26 777 8899',
      gender: 'Female', department: 'Science',
      subjects: ['Mathematics', 'Further Mathematics'],
      classesHandled: ['SHS 2A', 'SHS 3B'],
      position: 'Subject Teacher', qualification: 'B.Sc Mathematics',
      yearsOfService: 3, status: 'Active',
    },
  ]
  await seed(Teacher, teachers, 'Teachers')
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMINS
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdmins() {
  const hash = (pw) => bcrypt.hash(pw, 10)
  const admins = [
    {
      username: 'headmaster', password: await hash('Admin123'),
      role: 'admin', adminId: 'ADM20240001',
      name: 'Dr. Kwesi Aboagye',
      email: 'headmaster@achimota.edu.gh', phone: '+233 30 123 4567',
      adminType: 'Headmaster',
      permissions: ['students:*','teachers:*','admins:*','gallery:*','products:*'],
      status: 'Active',
    },
    {
      username: 'admin_academic', password: await hash('Admin123'),
      role: 'admin', adminId: 'ADM20240002',
      name: 'Mrs. Patricia Asante',
      email: 'academic@achimota.edu.gh', phone: '+233 30 123 4568',
      adminType: 'Academic', department: 'Academic Affairs',
      permissions: ['students:read','assessment:*','syllabus:*','attendance:*'],
      status: 'Active',
    },
    {
      username: 'admin_ict', password: await hash('Admin123'),
      role: 'admin', adminId: 'ADM20240003',
      name: 'Mr. Isaac Dankwa',
      email: 'ict@achimota.edu.gh', phone: '+233 30 123 4569',
      adminType: 'ICT', department: 'ICT Department',
      permissions: ['gallery:*','products:*','infrastructure:read'],
      status: 'Active',
    },
  ]
  await seed(Admin, admins, 'Admins')
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GALLERY ITEMS  — real images from /media/gallery/
// ─────────────────────────────────────────────────────────────────────────────

async function seedGallery() {
  const items = [
    { src: '/media/gallery/image1.jpeg',  title: 'Morning at the Boardwalk',   description: 'Students enjoying a morning stroll along the scenic boardwalk.',       category: 'Boardwalk',    aspectRatio: 0.75, date: 'March 12, 2025',    publisher: 'Ms. Adjoa Mensah',   location: 'Cape Coast, Ghana' },
    { src: '/media/gallery/image2.jpeg',  title: 'Beach Volleyball Game',       description: 'Students playing volleyball on the sandy beach near the boardwalk.',   category: 'Boardwalk',    aspectRatio: 1.4,  date: 'April 1, 2025',     publisher: 'Mr. Nii Kwaku',      location: 'Elmina, Ghana' },
    { src: '/media/gallery/image3.jpeg',  title: 'Sunset View from Pier',       description: 'Beautiful sunset over the water as seen from the fishing pier.',       category: 'Fishing Pier', aspectRatio: 1,    date: 'February 28, 2025', publisher: 'Ms. Lydia Osei',     location: 'Keta, Ghana' },
    { src: '/media/gallery/image4.jpeg',  title: 'Fishing Pier Afternoon',      description: 'Students exploring and learning about local marine life at the pier.', category: 'Fishing Pier', aspectRatio: 0.7,  date: 'May 8, 2025',       publisher: 'Dr. Kwesi Aboagye',  location: 'Saltpond, Ghana' },
    { src: '/media/gallery/image5.jpeg',  title: 'Boardwalk Snack Time',        description: 'Students enjoying refreshments and socializing along the boardwalk.',  category: 'Boardwalk',    aspectRatio: 1.5,  date: 'January 20, 2025',  publisher: 'Ms. Akosua Yeboah',  location: 'Accra, Ghana' },
    { src: '/media/gallery/image6.jpeg',  title: 'Scenic Ocean View',           description: 'Students taking in the peaceful ocean scenery from the boardwalk.',    category: 'Boardwalk',    aspectRatio: 1,    date: 'June 3, 2025',      publisher: 'Mr. Daniel Opoku',   location: 'Ada Foah, Ghana' },
    { src: '/media/gallery/image7.jpeg',  title: 'Kite Flying Adventure',       description: 'Students flying kites on the open space near the boardwalk.',          category: 'Boardwalk',    aspectRatio: 0.8,  date: 'July 14, 2025',     publisher: 'Ms. Emefa D.',       location: 'Takoradi, Ghana' },
    { src: '/media/gallery/image8.jpeg',  title: 'Evening Pier Walk',           description: 'Students taking an educational evening walk along the fishing pier.',  category: 'Fishing Pier', aspectRatio: 1.3,  date: 'August 2, 2025',    publisher: 'Dr. Felicia Ansah',  location: 'Winneba, Ghana' },
    { src: '/media/gallery/image9.jpeg',  title: 'Boardwalk Path',              description: 'A peaceful pathway along the boardwalk with scenic ocean views.',      category: 'Boardwalk',    aspectRatio: 1,    date: 'September 9, 2025', publisher: 'Mr. Isaac Dankwa',   location: 'Prampram, Ghana' },
    { src: '/media/gallery/image10.jpeg', title: 'Waves and Horizon',           description: 'Students observing the ocean waves and horizon from the pier.',        category: 'Fishing Pier', aspectRatio: 0.75, date: 'October 1, 2025',   publisher: 'Ms. Patricia A.',    location: 'Anloga, Ghana' },
    { src: '/media/gallery/image11.jpeg', title: 'Scenic Pier View',            description: 'Wide view of the fishing pier stretching into the water.',             category: 'Fishing Pier', aspectRatio: 1.6,  date: 'November 11, 2024', publisher: 'Mr. Daniel Owusu',   location: 'Cape Coast, Ghana' },
    { src: '/media/gallery/image12.jpeg', title: 'Boardwalk Recreation',        description: 'Students engaging in recreational activities on the boardwalk.',       category: 'Boardwalk',    aspectRatio: 1,    date: 'December 5, 2024',  publisher: 'Ms. Comfort Y.',     location: 'Cape Coast, Ghana' },
    { src: '/media/gallery/image13.jpeg', title: 'Peaceful Pier Moments',       description: 'Quiet moments spent observing nature from the fishing pier.',          category: 'Fishing Pier', aspectRatio: 0.65, date: 'January 2, 2025',   publisher: 'Mr. Kwame T.',       location: 'Elmina, Ghana' },
    { src: '/media/gallery/image14.jpeg', title: 'Boardwalk Activities',        description: 'Various school activities and social gatherings on the boardwalk.',    category: 'Boardwalk',    aspectRatio: 1.45, date: 'February 14, 2025', publisher: 'Ms. Akua Frimpong',  location: 'Accra, Ghana' },
    { src: '/media/gallery/image15.jpeg', title: 'Marine Education',            description: 'Students learning about marine ecosystems at the fishing pier.',       category: 'Fishing Pier', aspectRatio: 1,    date: 'March 3, 2025',     publisher: 'Dr. Nana Yeboah',    location: 'Anomabo, Ghana' },
    { src: '/media/gallery/image16.jpeg', title: 'Campus Morning Walk',         description: 'Early morning on the Achimota campus.',                               category: 'Campus',       aspectRatio: 1.3,  date: 'April 5, 2025',     publisher: 'Ms. Adjoa Mensah',   location: 'Achimota, Ghana' },
    { src: '/media/gallery/image17.jpeg', title: 'Science Lab Session',         description: 'Students in a practical chemistry lab session.',                       category: 'Academic',     aspectRatio: 1,    date: 'May 10, 2025',      publisher: 'Mr. Kweku Mensah',   location: 'Achimota, Ghana' },
    { src: '/media/gallery/image18.jpeg', title: 'Chapel Service',              description: 'Sunday service at Aggrey Chapel.',                                    category: 'Chapel',       aspectRatio: 0.8,  date: 'June 1, 2025',      publisher: 'School Admin',       location: 'Achimota, Ghana' },
    { src: '/media/gallery/image19.jpeg', title: 'Sports Day Sprint',           description: 'Students competing in the 100m sprint on Sports Day.',                category: 'Sports',       aspectRatio: 1.5,  date: 'July 20, 2025',     publisher: 'Ms. Emefa D.',       location: 'Achimota Oval, Ghana' },
    { src: '/media/gallery/image20.jpeg', title: 'Library Study Group',         description: 'Students studying together in the library complex.',                  category: 'Academic',     aspectRatio: 1.2,  date: 'August 15, 2025',   publisher: 'Mr. Isaac Dankwa',   location: 'Achimota, Ghana' },
    { src: '/media/gallery/image21.jpeg', title: 'Drama Club Performance',      description: 'The drama club annual performance on the main stage.',               category: 'Arts',         aspectRatio: 1.6,  date: 'September 22, 2025',publisher: 'Ms. Lydia Osei',     location: 'Assembly Hall, Ghana' },
    { src: '/media/gallery/image22.jpeg', title: 'Hockey Match',                description: 'Inter-school hockey match on the Achimota hockey pitch.',            category: 'Sports',       aspectRatio: 1.4,  date: 'October 8, 2025',   publisher: 'Dr. Felicia Ansah',  location: 'Achimota, Ghana' },
    { src: '/media/gallery/image23.jpeg', title: 'Graduation Ceremony',         description: 'Final year students at the annual graduation ceremony.',              category: 'Events',       aspectRatio: 1,    date: 'November 30, 2024', publisher: 'School Admin',       location: 'New Assembly Hall' },
    { src: '/media/gallery/image24.jpeg', title: 'House Games Opening',         description: 'Opening ceremony of the annual inter-house games.',                  category: 'Sports',       aspectRatio: 1.2,  date: 'January 15, 2025',  publisher: 'Mr. Daniel Opoku',   location: 'Cadet Square, Ghana' },
    { src: '/media/gallery/image25.jpeg', title: 'Art Exhibition',              description: 'Visual Arts students showcasing work at the annual exhibition.',      category: 'Arts',         aspectRatio: 0.9,  date: 'February 20, 2025', publisher: 'Ms. Akosua Yeboah',  location: 'Art School, Ghana' },
    { src: '/media/gallery/image26.jpeg', title: 'Prefects Inauguration',       description: 'Prefects being sworn in at the main assembly.',                      category: 'Events',       aspectRatio: 1.1,  date: 'March 25, 2025',    publisher: 'Mr. Nii Kwaku',      location: 'Achimota, Ghana' },
    { src: '/media/gallery/image27.jpeg', title: 'Swimming Gala',               description: 'Students competing in the annual swimming gala.',                    category: 'Sports',       aspectRatio: 1.5,  date: 'April 12, 2025',    publisher: 'Ms. Adjoa Mensah',   location: 'Achimota Pool' },
    { src: '/media/gallery/image28.jpeg', title: 'Founders Day',                description: 'Students at the annual Founders Day celebration.',                   category: 'Events',       aspectRatio: 1,    date: 'May 22, 2025',      publisher: 'School Admin',       location: 'Achimota, Ghana' },
    { src: '/media/gallery/image29.jpeg', title: 'Science Fair',                description: 'Students displaying projects at the annual Science Fair.',           category: 'Academic',     aspectRatio: 1.3,  date: 'June 18, 2025',     publisher: 'Dr. Kwesi Aboagye',  location: 'Achimota, Ghana' },
    { src: '/media/gallery/image30.jpeg', title: 'Cultural Day',                description: 'Students dressed in traditional attire for Cultural Day.',           category: 'Events',       aspectRatio: 1,    date: 'July 5, 2025',      publisher: 'Mr. Kwame T.',       location: 'Achimota, Ghana' },
    { src: '/media/gallery/image31.jpeg', title: 'Cricket Match',               description: 'School cricket team in action at the Achimota Cricket Oval.',        category: 'Sports',       aspectRatio: 1.6,  date: 'August 9, 2025',    publisher: 'Ms. Comfort Y.',     location: 'Cricket Oval, Ghana' },
    { src: '/media/gallery/image32.jpeg', title: 'Debate Competition',          description: 'Students representing Achimota at the regional debate competition.', category: 'Academic',     aspectRatio: 1.1,  date: 'September 14, 2025',publisher: 'Ms. Akua Frimpong',  location: 'Accra, Ghana' },
    { src: '/media/gallery/image33.jpeg', title: 'Boarding House Evening',      description: 'Students relaxing outside their boarding house after prep.',         category: 'Campus',       aspectRatio: 1.2,  date: 'October 20, 2025',  publisher: 'Mr. Isaac Dankwa',   location: 'Achimota, Ghana' },
    { src: '/media/gallery/image34.jpeg', title: 'Prize Giving Day',            description: 'Award ceremony recognising top-performing students.',                category: 'Events',       aspectRatio: 1,    date: 'November 28, 2024', publisher: 'Dr. Nana Yeboah',    location: 'New Assembly Hall' },
    { src: '/media/gallery/image35.jpeg', title: 'Football Final',              description: 'Achimota School in the inter-school football final.',               category: 'Sports',       aspectRatio: 1.5,  date: 'January 28, 2025',  publisher: 'Ms. Emefa D.',       location: 'Achimota Oval' },
    { src: '/media/gallery/image36.jpeg', title: 'ICT Lab Class',               description: 'Students in the ICT lab during a programming session.',             category: 'Academic',     aspectRatio: 1.3,  date: 'February 6, 2025',  publisher: 'Mr. Kweku Mensah',   location: 'Achimota, Ghana' },
    { src: '/media/gallery/image37.jpeg', title: 'Chapel Choir',                description: 'The school choir performing at the Sunday service.',                category: 'Chapel',       aspectRatio: 0.9,  date: 'March 9, 2025',     publisher: 'School Admin',       location: 'Aggrey Chapel' },
    { src: '/media/gallery/image38.jpeg', title: 'Music Night',                 description: 'Annual music night showcasing student bands and performers.',       category: 'Arts',         aspectRatio: 1.2,  date: 'April 18, 2025',    publisher: 'Ms. Patricia A.',    location: 'Assembly Hall' },
    { src: '/media/gallery/image39.jpeg', title: 'Basketball Tournament',       description: 'Inter-house basketball tournament at the outdoor courts.',          category: 'Sports',       aspectRatio: 1.4,  date: 'May 30, 2025',      publisher: 'Mr. Daniel Owusu',   location: 'Basketball Court' },
    { src: '/media/gallery/image40.jpeg', title: 'Career Day',                  description: 'Professionals speaking to students on Career Day.',                 category: 'Events',       aspectRatio: 1.1,  date: 'June 25, 2025',     publisher: 'Mrs. Patricia Asante',location: 'New Assembly Hall' },
    { src: '/media/gallery/image41.jpeg', title: 'End of Term Assembly',        description: 'Final assembly before the end-of-term break.',                     category: 'Events',       aspectRatio: 1,    date: 'July 28, 2025',     publisher: 'School Admin',       location: 'Cadet Square' },
    { src: '/media/gallery/image82.jpeg', title: 'Morning Devotion',            description: 'Students gathered for morning devotion on the field.',              category: 'Chapel',       aspectRatio: 1.2,  date: 'August 18, 2025',   publisher: 'School Admin',       location: 'Achimota, Ghana' },
  ]
  await seed(GalleryItem, items, 'GalleryItems')
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAGE POSTS
// ─────────────────────────────────────────────────────────────────────────────

async function seedPagePosts() {
  const posts = [
    {
      title: 'Achimota School Wins National Science Quiz',
      body: 'The Achimota School science team emerged champions at the 2025 National Science & Maths Quiz, defeating 32 schools across Ghana. The team of three SHS 3 students answered all final-round questions correctly.',
      excerpt: 'Achimota wins national science quiz for the third consecutive year.',
      coverImage: '/media/page/academic-block.jpg',
      category: 'Achievement', author: 'School Admin', authorAvatar: '',
      tags: ['science','quiz','award'], isPublished: true, likeCount: 142, shareCount: 38,
    },
    {
      title: '2025 Sports Day — Schedule and Events',
      body: 'Sports Day is scheduled for Friday 20th July at the Achimota Oval. Events include 100m, 200m, 400m sprints, long jump, shot put, and inter-house relay. Students should report to their house tents by 7:30 AM.',
      excerpt: 'Sports Day 2025 schedule — all events and timings.',
      coverImage: '/media/page/sports-field.jpg',
      category: 'Event', author: 'Sports Master', authorAvatar: '',
      tags: ['sports','event'], isPublished: true, likeCount: 98, shareCount: 22,
    },
    {
      title: 'New Tullow Science Block Now Open',
      body: 'The newly constructed Tullow Science Block officially opened this term, featuring 6 state-of-the-art laboratories equipped with modern apparatus. The facility supports SHS 2 and SHS 3 science students.',
      excerpt: 'New science block opens — better labs for all science students.',
      coverImage: '/media/page/campus-life.jpg',
      category: 'News', author: 'Admin Office', authorAvatar: '',
      tags: ['campus','science','infrastructure'], isPublished: true, likeCount: 76, shareCount: 15,
    },
    {
      title: 'End of Second Term Examinations — Timetable',
      body: 'The second term examinations begin Monday 14th July. Students are advised to collect their exam cards from the academic office. No student will be permitted to write exams without a valid card.',
      excerpt: 'Second term exams timetable now released.',
      coverImage: '/media/page/home.jpg',
      category: 'Notice', author: 'Academic Office', authorAvatar: '',
      tags: ['exams','academic','notice'], isPublished: true, likeCount: 210, shareCount: 67,
    },
    {
      title: 'Achimota Hockey Team Selected for National Championships',
      body: 'Eleven Achimota students have been selected to represent the Greater Accra Region in the National Schools Hockey Championships. Congratulations to all selected players.',
      excerpt: 'Eleven students selected to represent region in hockey championships.',
      coverImage: '/media/page/sports-field.jpg',
      category: 'Sports', author: 'Sports Master', authorAvatar: '',
      tags: ['hockey','sports','achievement'], isPublished: true, likeCount: 54, shareCount: 11,
    },
    {
      title: 'Library Resources Update — New Books Arrived',
      body: 'The school library has received a donation of over 500 new textbooks and reference materials from the Old Achimotans Association. Students may begin borrowing from the new collection from Monday.',
      excerpt: '500 new books added to the library.',
      coverImage: '/media/page/library.jpg',
      category: 'Academic', author: 'Library Staff', authorAvatar: '',
      tags: ['library','books','academic'], isPublished: true, likeCount: 44, shareCount: 8,
    },
  ]
  await seed(PagePost, posts, 'PagePosts')
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

async function seedProducts() {
  const products = [
    { name: 'School T-Shirt',      category: 'Apparel',     price: 55,  image: '/media/products/placeholder.jpg', description: 'Comfortable 100% cotton tee with embroidered Achimota crest.',      stock: 50, isAvailable: true },
    { name: 'School Hoodie',       category: 'Apparel',     price: 120, image: '/media/products/placeholder.jpg', description: 'Premium fleece hoodie — perfect for cool Accra evenings.',          stock: 30, isAvailable: true },
    { name: 'School Sweatshirt',   category: 'Apparel',     price: 95,  image: '/media/products/placeholder.jpg', description: 'Cozy crew-neck sweatshirt with school motto.',                      stock: 25, isAvailable: true },
    { name: 'School Cap',          category: 'Apparel',     price: 40,  image: '/media/products/placeholder.jpg', description: 'Adjustable six-panel cap with embroidered logo.',                   stock: 60, isAvailable: true },
    { name: 'School Polo Shirt',   category: 'Apparel',     price: 70,  image: '/media/products/placeholder.jpg', description: 'Classic pique polo with embroidered school badge.',                 stock: 40, isAvailable: true },
    { name: 'School Backpack',     category: 'Accessories', price: 150, image: '/media/products/placeholder.jpg', description: 'Durable 30-litre backpack with padded laptop sleeve.',              stock: 20, isAvailable: true },
    { name: 'School Keychain',     category: 'Accessories', price: 15,  image: '/media/products/placeholder.jpg', description: 'Solid brass keychain with Achimota school emblem.',                 stock: 100, isAvailable: true },
    { name: 'School Badge',        category: 'Accessories', price: 12,  image: '/media/products/placeholder.jpg', description: 'Enamel lapel badge bearing the school crest.',                     stock: 80, isAvailable: true },
    { name: 'School Wristband',    category: 'Accessories', price: 8,   image: '/media/products/placeholder.jpg', description: 'Silicone wristband printed with the school motto.',                 stock: 120, isAvailable: true },
    { name: 'School Umbrella',     category: 'Accessories', price: 55,  image: '/media/products/placeholder.jpg', description: 'Compact auto-open umbrella in school colours.',                    stock: 35, isAvailable: true },
    { name: 'School Notebook',     category: 'Stationery',  price: 20,  image: '/media/products/placeholder.jpg', description: 'A5 hardcover notebook with school branding — 200 pages.',          stock: 70, isAvailable: true },
    { name: 'School Pen Set',      category: 'Stationery',  price: 25,  image: '/media/products/placeholder.jpg', description: 'Set of 5 ballpoint pens in school colours.',                       stock: 90, isAvailable: true },
    { name: 'School Sticker Pack', category: 'Stationery',  price: 15,  image: '/media/products/placeholder.jpg', description: 'Pack of 12 premium vinyl stickers with school art.',               stock: 150, isAvailable: true },
    { name: 'School Calendar',     category: 'Stationery',  price: 18,  image: '/media/products/placeholder.jpg', description: 'A3 wall calendar with academic events and school photos.',          stock: 45, isAvailable: true },
    { name: 'School Mouse Pad',    category: 'Stationery',  price: 22,  image: '/media/products/placeholder.jpg', description: 'Extra-large desk mat with the school crest.',                      stock: 55, isAvailable: true },
    { name: 'School Mug',          category: 'Drinkware',   price: 35,  image: '/media/products/placeholder.jpg', description: 'Ceramic 350 ml mug with the Achimota school crest.',               stock: 60, isAvailable: true },
    { name: 'School Water Bottle', category: 'Drinkware',   price: 48,  image: '/media/products/placeholder.jpg', description: 'Double-walled 500 ml stainless steel bottle.',                     stock: 40, isAvailable: true },
    { name: 'School Lunch Box',    category: 'House Items', price: 40,  image: '/media/products/placeholder.jpg', description: 'Insulated 3-compartment lunch box for boarding students.',          stock: 30, isAvailable: true },
    { name: 'School Towel',        category: 'House Items', price: 30,  image: '/media/products/placeholder.jpg', description: '100% cotton bath towel in school colours.',                        stock: 50, isAvailable: true },
    { name: 'School Phone Case',   category: 'House Items', price: 35,  image: '/media/products/placeholder.jpg', description: 'Shock-proof case with Achimota crest print.',                      stock: 65, isAvailable: true },
  ]
  await seed(Product, products, 'Products')
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. HOUSES
// ─────────────────────────────────────────────────────────────────────────────

async function seedHouses() {
  const houses = [
    { houseName: 'Aggrey',       color: '#E63946', houseType: 'Boys',  totalMembers: 120, points: 0 },
    { houseName: 'Cadbury',      color: '#457B9D', houseType: 'Girls', totalMembers: 115, points: 0 },
    { houseName: 'Guggisberg',   color: '#2A9D8F', houseType: 'Boys',  totalMembers: 118, points: 0 },
    { houseName: 'Livingstone',  color: '#E9C46A', houseType: 'Boys',  totalMembers: 110, points: 0 },
    { houseName: 'Lugard',       color: '#F4A261', houseType: 'Boys',  totalMembers: 112, points: 0 },
    { houseName: 'Kingsley',     color: '#E76F51', houseType: 'Girls', totalMembers: 108, points: 0 },
    { houseName: 'Slessor',      color: '#8338EC', houseType: 'Girls', totalMembers: 114, points: 0 },
    { houseName: 'Atta Mill',    color: '#3A86FF', houseType: 'Boys',  totalMembers: 116, points: 0 },
    { houseName: 'New House',    color: '#06D6A0', houseType: 'Mixed', totalMembers: 100, points: 0 },
  ]
  await seed(House, houses, 'Houses')
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

async function seedAnnouncements() {
  const announcements = [
    {
      title: 'Examination Timetable Released',
      content: 'The second term examination timetable has been released. All students should collect their exam cards from the academic office by Friday.',
      priority: 'high', audience: ['all'], authorName: 'Academic Office',
      publishedAt: new Date(), isPublished: true, isPinned: true,
    },
    {
      title: 'Sports Day — Friday 20th July',
      content: 'Sports Day is confirmed for Friday 20th July at the Achimota Oval. All students must be in house colours. Boarding students report to the oval by 7:30 AM.',
      priority: 'medium', audience: ['students'], authorName: 'Sports Master',
      publishedAt: new Date(), isPublished: true, isPinned: false,
    },
    {
      title: 'Staff Meeting — Thursday 3 PM',
      content: 'There will be a mandatory staff meeting in the conference room on Thursday at 3:00 PM. Heads of department must come with term reports.',
      priority: 'high', audience: ['teachers','admins'], authorName: 'Headmaster',
      publishedAt: new Date(), isPublished: true, isPinned: false,
    },
    {
      title: 'Library Closed for Stock-Taking',
      content: 'The school library will be closed from Monday to Wednesday for annual stock-taking. It will reopen on Thursday. Students are advised to borrow books before Sunday.',
      priority: 'low', audience: ['students'], authorName: 'Library Staff',
      publishedAt: new Date(), isPublished: true, isPinned: false,
    },
  ]
  await seed(Announcement, announcements, 'Announcements')
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. CLUBS
// ─────────────────────────────────────────────────────────────────────────────

async function seedClubs() {
  const clubs = [
    { clubName: 'Science Club',           category: 'STEM',     description: 'Practical science experiments and science fair preparation.', status: 'Active', meetingDay: 'Wednesday', meetingTime: '3:00 PM', meetingVenue: 'Science Block', totalMembers: 45 },
    { clubName: 'Drama Club',             category: 'Arts',     description: 'Acting, stagecraft and annual school productions.', status: 'Active', meetingDay: 'Thursday',  meetingTime: '3:30 PM', meetingVenue: 'Assembly Hall', totalMembers: 38 },
    { clubName: 'Debate Society',         category: 'Academic', description: 'Public speaking, argumentation and inter-school debates.', status: 'Active', meetingDay: 'Friday',    meetingTime: '2:00 PM', meetingVenue: 'Language Center', totalMembers: 30 },
    { clubName: 'Cadet Corps',            category: 'Service',  description: 'Military-style drills, discipline and leadership.', status: 'Active', meetingDay: 'Saturday',  meetingTime: '7:00 AM', meetingVenue: 'Cadet Square', totalMembers: 60 },
    { clubName: 'Photography Club',       category: 'Arts',     description: 'Photography techniques and school event coverage.', status: 'Active', meetingDay: 'Monday',    meetingTime: '3:00 PM', meetingVenue: 'ICT Lab', totalMembers: 22 },
    { clubName: 'Muslim Students Assoc.', category: 'Religious',description: 'Islamic studies, Jummah prayers and moral education.', status: 'Active', meetingDay: 'Friday',    meetingTime: '1:00 PM', meetingVenue: 'Multi-Purpose Room', totalMembers: 42 },
    { clubName: 'Hockey Club',            category: 'Sports',   description: 'School hockey team training and inter-school matches.', status: 'Active', meetingDay: 'Tuesday',   meetingTime: '4:00 PM', meetingVenue: 'Hockey Pitch', totalMembers: 25 },
    { clubName: 'Environmental Club',     category: 'Service',  description: 'Campus beautification and environmental awareness campaigns.', status: 'Active', meetingDay: 'Wednesday', meetingTime: '2:30 PM', meetingVenue: 'Biology Lab', totalMembers: 35 },
  ]
  await seed(Club, clubs, 'Clubs')
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. MAP LOCATIONS  — exact coordinates from mapLocations.js
// ─────────────────────────────────────────────────────────────────────────────

async function seedMapLocations() {
  const CATEGORY_META = {
    academic:    '#3b82f6',
    residential: '#8b5cf6',
    sports:      '#22c55e',
    dining:      '#f97316',
    worship:     '#eab308',
    facility:    '#14b8a6',
  }

  const locations = [
    { locationId: 'cadet-square',    name: 'Cadet Square',            category: 'facility',    coords: [5.62780139657629, -0.21427542428344284], description: 'The main parade and assembly ground used for cadet training, school parades, and ceremonial events.' },
    { locationId: 'aggrey-chapel',   name: 'Aggrey Chapel',           category: 'worship',     coords: [5.6270578802762135, -0.21286567136838566], description: 'The primary interdenominational chapel of Achimota School, named after Dr. James Emman Kwegyir Aggrey.' },
    { locationId: 'girls-gym',       name: 'Achimota Girls Gym',      category: 'sports',      coords: [5.627493196219682, -0.21118627575889679],  description: 'Indoor gymnasium reserved for girls, equipped for aerobics, gymnastics, and indoor sports.' },
    { locationId: 'eastern-dining',  name: 'Eastern Dining Hall',     category: 'dining',      coords: [5.629456000731749, -0.21294378273245676],  description: 'One of the main school dining halls serving students in the eastern residential blocks.' },
    { locationId: 'art-school',      name: 'Art School',              category: 'academic',    coords: [5.629523218308048, -0.2135209913122506],   description: 'Dedicated art block housing studios for Visual Arts students.' },
    { locationId: '18-unit-block',   name: '18 Unit Block',           category: 'residential', coords: [5.630496970844821, -0.21417509491522305],  description: 'An 18-unit student residential dormitory block.' },
    { locationId: '12-unit-block',   name: '12 Unit Block',           category: 'residential', coords: [5.630073768929489, -0.2154393947425098],   description: 'A 12-unit student residential dormitory.' },
    { locationId: 'tullow-science',  name: 'Tullow Science Block',    category: 'academic',    coords: [5.6306803266387275, -0.21462169896928085], description: 'Modern science laboratories built with support from Tullow Oil.' },
    { locationId: 'pta-lab',         name: 'PTA Lab',                 category: 'academic',    coords: [5.629665709734598, -0.21398072533731122],  description: 'Computer and science laboratory funded by the Parent-Teacher Association.' },
    { locationId: 'new-assembly',    name: 'New Assembly Hall',       category: 'facility',    coords: [5.630591596906607, -0.21124775654792413],  description: 'A large modern assembly hall for school-wide gatherings.' },
    { locationId: 'atta-mill-house', name: 'Atta Mill House',         category: 'residential', coords: [5.6297836047713545, -0.2100935722518827],  description: 'Student residential house named after former President John Evans Atta Mills.' },
    { locationId: 'new-house',       name: 'New House',               category: 'residential', coords: [5.629795487016823, -0.20933738259273826],  description: 'One of the newer student boarding houses on campus.' },
    { locationId: 'cricket-oval',    name: 'Achimota Cricket Oval',   category: 'sports',      coords: [5.628963729218877, -0.20707279343202625],  description: 'Oval-shaped cricket ground for school matches and inter-house competitions.' },
    { locationId: 'cricket-park',    name: 'Achimota Cricket Park',   category: 'sports',      coords: [5.628737966190695, -0.20583105041279962],  description: 'The main cricket park hosting inter-school tournaments.' },
    { locationId: 'achimota-oval',   name: 'Achimota Oval',           category: 'sports',      coords: [5.6303381093102125, -0.20545693548667424], description: 'Large oval sports field for athletics, football, and major outdoor events.' },
    { locationId: 'hockey-pitch',    name: 'Hockey Pitch',            category: 'sports',      coords: [5.627966152064931, -0.20864072888444632],  description: 'The school hockey pitch, home to Achimota\'s renowned hockey programme.' },
    { locationId: 'home-econ',       name: 'Home Economics Block',    category: 'academic',    coords: [5.626641629598235, -0.21029184958035632],  description: 'Equipped with kitchens, sewing rooms, and food science labs.' },
    { locationId: 'kingsley-house',  name: 'Kingsley House',          category: 'residential', coords: [5.6264443939682005, -0.21139605373607942], description: 'Student boarding house named after Rev. Mary Henrietta Kingsley.' },
    { locationId: 'slessor-house',   name: 'Slessor House',           category: 'residential', coords: [5.627192033421241, -0.2103858489263564],   description: 'Student residential house named after Mary Slessor.' },
    { locationId: 'girls-gym-2',     name: 'Girls Gym 2',             category: 'sports',      coords: [5.6275555202085545, -0.21114318053285372], description: 'Secondary girls gymnasium facility.' },
    { locationId: 'swimming-pool',   name: 'Swimming Pool',           category: 'sports',      coords: [5.6240434296214525, -0.2158303744337454],  description: 'Olympic-standard swimming pool hosting competitive swim meets.' },
    { locationId: 'livingstone',     name: 'Livingstone House',       category: 'residential', coords: [5.628579218239941, -0.2148289726105925],   description: 'Boarding house named after David Livingstone.' },
    { locationId: 'lugard-house',    name: 'Lugard House',            category: 'residential', coords: [5.628384049191988, -0.2158979892614762],   description: 'Student residential house named after Lord Frederick Lugard.' },
    { locationId: 'school-clinic',   name: 'School Clinic',           category: 'facility',    coords: [5.629574196737167, -0.21546730628532865],  description: 'School health centre providing primary healthcare to students and staff.' },
    { locationId: 'basketball-court',name: 'Basketball Court',        category: 'sports',      coords: [5.625749074011066, -0.21144117653967825],  description: 'Outdoor basketball courts for PE and inter-school competitions.' },
    { locationId: 'science-resource',name: 'Science Resource Center', category: 'academic',    coords: [5.627580957086641, -0.21173433338367248],  description: 'Resource hub for science students and teachers.' },
    { locationId: 'chapman-nyaho',   name: 'Chapman Nyaho Block',     category: 'academic',    coords: [5.628448838422345, -0.21204830527614088],  description: 'Named after Dr. Daniel Chapman Nyaho. Houses classrooms for senior forms.' },
    { locationId: 'language-center', name: 'Language Center',         category: 'academic',    coords: [5.628407762020183, -0.21155758662309335],  description: 'Facility for English, French, and Ghanaian language studies.' },
    { locationId: 'coca-cola-block', name: 'Coca Cola Block',         category: 'academic',    coords: [5.628659499760096, -0.2129971030045403],   description: 'Classroom block built with funding from Coca-Cola Ghana.' },
    { locationId: 'aggrey-house',    name: 'Aggrey House',            category: 'residential', coords: [5.628504628460335, -0.2138036580340127],   description: 'Boarding house named after Dr. James Emman Kwegyir Aggrey.' },
    { locationId: 'library',         name: 'Library Complex',         category: 'academic',    coords: [5.6274324953789145, -0.2151128246673897],  description: 'The main school library with thousands of books and digital resources.' },
    { locationId: 'cadbury-house',   name: 'Cadbury House',           category: 'residential', coords: [5.6271557762796505, -0.21584492968501903], description: 'Boarding house named after the Cadbury family.' },
    { locationId: 'guggisberg-house',name: 'Guggisberg House',        category: 'residential', coords: [5.626446464047977, -0.21538560419148514],  description: 'Named after Governor Sir Frederick Gordon Guggisberg, founding visionary of Achimota.' },
    { locationId: 'snack-square',    name: 'Snack Square',            category: 'dining',      coords: [5.629208398399973, -0.21267012803632945],  description: 'Open-air food court for snacks, drinks, and light meals.' },
    { locationId: 'boys-gym',        name: "Boys' Gym",               category: 'sports',      coords: [5.629451840299365, -0.21264724975452853],  description: 'Indoor gymnasium for male students with weights and exercise machines.' },
  ].map(loc => ({ ...loc, color: CATEGORY_META[loc.category] || '#888', isActive: true }))

  await seed(MapLocation, locations, 'MapLocations')
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. SCHOOL PROFILE  (singleton upsert)
// ─────────────────────────────────────────────────────────────────────────────

async function seedSchoolProfile() {
  await upsertOne(SchoolProfile, {}, {
    schoolName: 'Achimota School',
    founded: 1924,
    location: 'Achimota, Accra, Ghana',
    motto: 'Ut Omnes Unum Sint',
    headmaster: 'Dr. Kwesi Aboagye',
    deputy: 'Mrs. Patricia Asante',
    poBox: 'P.O. Box GP 2520, Accra',
    website: 'www.achimotaschool.edu.gh',
    phone: '+233 30 221 0833',
    email: 'info@achimotaschool.edu.gh',
    logo: '/media/school/logo.png',
    anthem: [
      'Far away in the land of the Gold Coast',
      'Stands a school of which we all like to boast',
      'Where the black and the white strive together',
      'For the good of our dear motherland',
    ],
    houses: [
      { name: 'Aggrey',      color: '#E63946' },
      { name: 'Cadbury',     color: '#457B9D' },
      { name: 'Guggisberg',  color: '#2A9D8F' },
      { name: 'Livingstone', color: '#E9C46A' },
      { name: 'Lugard',      color: '#F4A261' },
      { name: 'Kingsley',    color: '#E76F51' },
      { name: 'Slessor',     color: '#8338EC' },
      { name: 'Atta Mill',   color: '#3A86FF' },
      { name: 'New House',   color: '#06D6A0' },
    ],
    chaplaincy: [
      { name: 'Aggrey Chapel',    denomination: 'Interdenominational', chaplain: 'Rev. Kofi Asante' },
      { name: 'Catholic Chapel',  denomination: 'Catholic',            chaplain: 'Fr. Emmanuel Boateng' },
    ],
    serviceContacts: [
      { service: 'Academic Office', phone: '+233 30 221 0834', email: 'academic@achimotaschool.edu.gh', hours: 'Mon–Fri 8AM–5PM' },
      { service: 'School Clinic',   phone: '+233 30 221 0835', email: 'clinic@achimotaschool.edu.gh',   hours: 'Mon–Sat 7AM–9PM' },
      { service: 'PTA Office',      phone: '+233 30 221 0836', email: 'pta@achimotaschool.edu.gh',      hours: 'Mon–Fri 9AM–3PM' },
    ],
    socialMedia: {
      facebook: 'https://facebook.com/achimotaschool',
      instagram: 'https://instagram.com/achimotaschool',
      twitter: 'https://twitter.com/achimotaschool',
    },
  }, 'SchoolProfile')
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. CHAPEL RECORDS
// ─────────────────────────────────────────────────────────────────────────────

async function seedChapel() {
  const chapels = [
    {
      chapelName: 'Aggrey Chapel', denomination: 'Interdenominational',
      services: [
        { date: new Date('2025-06-01'), time: '8:00 AM', topic: 'Walking in Purpose', speaker: 'Rev. Kofi Asante', scriptureRef: 'Jeremiah 29:11' },
        { date: new Date('2025-06-08'), time: '8:00 AM', topic: 'Excellence in All Things', speaker: 'Guest Speaker', scriptureRef: 'Colossians 3:23' },
        { date: new Date('2025-06-15'), time: '8:00 AM', topic: 'The Power of Teamwork', speaker: 'Rev. Kofi Asante', scriptureRef: 'Ecclesiastes 4:9-12' },
      ],
      attendance: [],
    },
    {
      chapelName: 'Catholic Chapel', denomination: 'Catholic',
      services: [
        { date: new Date('2025-06-01'), time: '9:30 AM', topic: 'Sunday Mass', speaker: 'Fr. Emmanuel Boateng', scriptureRef: 'Matthew 5:1-12' },
        { date: new Date('2025-06-08'), time: '9:30 AM', topic: 'Sunday Mass', speaker: 'Fr. Emmanuel Boateng', scriptureRef: 'John 15:1-8' },
      ],
      attendance: [],
    },
  ]
  await seed(Chapel, chapels, 'Chapels')
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. LIBRARY RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

async function seedLibrary() {
  const resources = [
    { title: 'Elective Mathematics for SHS', author: 'Christian Akrong', category: 'Textbook', subject: 'Mathematics', publisher: 'Aki-Ola', yearPublished: 2020, totalCopies: 40, availableCopies: 35, isAvailable: true },
    { title: 'Core English for SHS 1–3',      author: 'Ato Ulzen-Appiah', category: 'Textbook', subject: 'English Language', publisher: 'Sedco', yearPublished: 2019, totalCopies: 50, availableCopies: 44, isAvailable: true },
    { title: 'Integrated Science for JHS',   author: 'Sam Ato Garbrah', category: 'Textbook', subject: 'Science', publisher: 'Pearson', yearPublished: 2018, totalCopies: 30, availableCopies: 28, isAvailable: true },
    { title: 'Things Fall Apart',            author: 'Chinua Achebe', category: 'Fiction', subject: 'Literature', publisher: 'Heinemann', yearPublished: 1958, totalCopies: 20, availableCopies: 14, isAvailable: true },
    { title: 'Weep Not, Child',              author: 'Ngugi wa Thiong\'o', category: 'Fiction', subject: 'Literature', publisher: 'Heinemann', yearPublished: 1964, totalCopies: 15, availableCopies: 12, isAvailable: true },
    { title: 'Ghana BECE Past Questions 2015–2023', author: 'Aki-Ola Series', category: 'Past Papers', subject: 'All Subjects', publisher: 'Aki-Ola', yearPublished: 2023, totalCopies: 25, availableCopies: 20, isAvailable: true },
    { title: 'Physics for Senior High School', author: 'S. A. Okeke', category: 'Textbook', subject: 'Physics', publisher: 'University Press', yearPublished: 2021, totalCopies: 35, availableCopies: 30, isAvailable: true },
    { title: 'Longman Dictionary of Contemporary English', author: 'Longman', category: 'Reference', subject: 'English', publisher: 'Longman', yearPublished: 2014, totalCopies: 10, availableCopies: 9, isAvailable: true },
  ]
  await seed(LibraryResource, resources, 'LibraryResources')
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. SYLLABUSES
// ─────────────────────────────────────────────────────────────────────────────

async function seedSyllabuses() {
  const syllabuses = [
    {
      subject: 'Mathematics', form: 'SHS 1', term: 'Term 1',
      academicYear: '2024/25', program: 'General Science', teacherName: 'Ms. Felicia Ansah',
      topics: [
        { weekNumber: 1, topicTitle: 'Sets', subtopics: ['Concept of Sets','Subsets','Operations on Sets'], objectives: ['Define a set','Identify subsets'], completed: true },
        { weekNumber: 2, topicTitle: 'Number and Numeration', subtopics: ['Integers','Fractions','Decimals'], objectives: ['Convert between number forms'], completed: true },
        { weekNumber: 3, topicTitle: 'Algebraic Expressions', subtopics: ['Simplification','Factorisation'], objectives: ['Simplify algebraic expressions'], completed: false },
      ],
    },
    {
      subject: 'English Language', form: 'SHS 1', term: 'Term 1',
      academicYear: '2024/25', program: 'All', teacherName: 'Mr. Kweku Mensah',
      topics: [
        { weekNumber: 1, topicTitle: 'Grammar — Parts of Speech', subtopics: ['Nouns','Verbs','Adjectives','Adverbs'], objectives: ['Identify parts of speech'], completed: true },
        { weekNumber: 2, topicTitle: 'Comprehension Skills', subtopics: ['Reading strategies','Inference'], objectives: ['Answer comprehension questions'], completed: true },
        { weekNumber: 3, topicTitle: 'Essay Writing', subtopics: ['Argumentative','Descriptive'], objectives: ['Write a structured essay'], completed: false },
      ],
    },
  ]
  await seed(Syllabus, syllabuses, 'Syllabuses')
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB:', mongoose.connection.host)
  console.log(APPEND ? '(append mode — skipping existing)' : '(wipe mode — clearing existing)')
  console.log('')

  await seedStudents()
  await seedTeachers()
  await seedAdmins()
  await seedGallery()
  await seedPagePosts()
  await seedProducts()
  await seedHouses()
  await seedAnnouncements()
  await seedClubs()
  await seedMapLocations()
  await seedSchoolProfile()
  await seedChapel()
  await seedLibrary()
  await seedSyllabuses()

  // These start empty — collections are created by the schema push
  console.log('  --  Order, Assessment, Attendance, Achievement, Clearance,')
  console.log('      Message, Infrastructure, Conference — start empty, ready for data')

  console.log('\nSeed complete.')
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
