/**
 * schema.js — Achimota School (Motown)
 * Master Mongoose schema definitions for all 22 collections.
 *
 * Push schemas + indexes to MongoDB (no data):
 *   node backend/schema.js
 *
 * Import models anywhere in the backend:
 *   const { Student, GalleryItem, Product, ... } = require('./schema')
 */

require('dotenv').config()
const mongoose = require('mongoose')

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const commentSchema = new mongoose.Schema({
  authorId:     { type: mongoose.Schema.Types.ObjectId },
  authorName:   { type: String, required: true },
  authorAvatar: { type: String },
  text:         { type: String, required: true },
}, { timestamps: true })

const attachmentSchema = new mongoose.Schema({
  name: { type: String },
  url:  { type: String },
  type: { type: String, enum: ['pdf','image','doc','link','video'] },
}, { _id: false })

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

const guardianSchema = new mongoose.Schema({
  name:       { type: String },
  relation:   { type: String, enum: ['Father','Mother','Uncle','Aunt','Sibling','Grandparent','Guardian','Other'] },
  occupation: { type: String },
  phone:      { type: String },
  email:      { type: String },
  address:    { type: String },
}, { _id: false })

const beceResultSchema = new mongoose.Schema({
  subject: { type: String },
  grade:   { type: String, enum: ['A1','B2','B3','C4','C5','C6','D7','E8','F9'] },
}, { _id: false })

const additionalRecordSchema = new mongoose.Schema({
  title:       { type: String },
  description: { type: String },
  year:        { type: String },
}, { _id: false })

const studentSchema = new mongoose.Schema({
  // Auth
  username: { type: String, required: true, unique: true, trim: true,
              match: /^[A-Za-z][A-Za-z0-9_]{2,19}$/ },
  password: { type: String, required: true },
  role:     { type: String, default: 'student' },

  // Stage 1 — Biometric
  passportPhoto: { type: String },   // /media/avatars/<file>
  fingerprint:   { type: String },   // 'captured' | null

  // Stage 2 — Personal
  firstName:      { type: String, required: true, trim: true },
  middleName:     { type: String, trim: true },
  lastName:       { type: String, required: true, trim: true },
  dob:            { type: Date },
  gender:         { type: String, enum: ['Male','Female','Prefer not to say'] },
  hometown:       { type: String },
  placeOfBirth:   { type: String },
  nationality:    { type: String, default: 'Ghanaian' },
  ethnicGroup:    { type: String },
  denomination:   { type: String, enum: ['Christian','Islamic','Traditional','None','Other'] },
  disability:     { type: Boolean, default: false },
  disabilityNote: { type: String },
  homeAddress:    { type: String },
  poBox:          { type: String },
  email:          { type: String, lowercase: true },
  avatar:         { type: String },  // /media/avatars/<file>

  // Stage 3 — Guardians
  guardians: [guardianSchema],

  // Stage 4 — Examination
  jhsIndex:               { type: String },
  previousSchool:         { type: String },
  previousSchoolLocation: { type: String },
  beceResults:            [beceResultSchema],

  // Stage 5 — Programme
  program: { type: String, enum: ['General Science','General Arts','Home Economics','Visual Arts','Agriculture'] },

  // Stage 6 — Campus
  campus: { type: String, enum: ['Boarding','Day'] },

  // Stage 7 — Additional records
  records: [additionalRecordSchema],

  // Stage 8 — Essays
  essayWhy:         { type: String },
  essayPersonality: { type: String },

  // School-assigned
  studentId:       { type: String },
  classLevel:      { type: String, enum: ['SHS 1','SHS 2','SHS 3'] },
  house:           { type: String },
  indexNumber:     { type: String },
  prefectPosition: { type: String, default: 'None' },
  extracurricular: [{ type: String }],
  status:          { type: String, enum: ['Active','Inactive','Graduated','Suspended'], default: 'Active' },
  isProspect:      { type: Boolean, default: true },
}, { timestamps: true })

// All uniqueness + sparse handled here only — not on field definitions
studentSchema.index({ email:     1 }, { unique: true, sparse: true })
studentSchema.index({ studentId: 1 }, { unique: true, sparse: true })
studentSchema.index({ indexNumber: 1 }, { sparse: true })

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 2. TEACHERS
// ─────────────────────────────────────────────────────────────────────────────

const teacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, default: 'teacher' },

  firstName:      { type: String, required: true },
  lastName:       { type: String, required: true },
  email:          { type: String, lowercase: true },
  phone:          { type: String },
  photo:          { type: String },  // /media/avatars/<file>
  gender:         { type: String, enum: ['Male','Female','Other'] },
  nationality:    { type: String, default: 'Ghanaian' },
  address:        { type: String },

  staffId:        { type: String },
  department:     { type: String, enum: ['Science','Arts','Commerce','Languages','Technical','Humanities','PE','ICT','Other'] },
  subjects:       [{ type: String }],
  classesHandled: [{ type: String }],
  position:       { type: String },
  qualification:  { type: String },
  yearsOfService: { type: Number, default: 0 },
  status:         { type: String, enum: ['Active','On Leave','Retired','Resigned'], default: 'Active' },
}, { timestamps: true })

teacherSchema.index({ email:   1 }, { unique: true, sparse: true })
teacherSchema.index({ staffId: 1 }, { unique: true, sparse: true })

const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMINS
// ─────────────────────────────────────────────────────────────────────────────

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, default: 'admin' },

  name:        { type: String, required: true },
  email:       { type: String, lowercase: true },
  phone:       { type: String },
  photo:       { type: String },  // /media/avatars/<file>

  adminId:     { type: String },
  adminType:   { type: String, required: true,
                 enum: ['Headmaster','Deputy','Academic','Finance','House','Domestic',
                        'ICT','Club','Chapel','Infrastructure','Records'] },
  department:  { type: String },
  permissions: [{ type: String }],
  status:      { type: String, enum: ['Active','Inactive'], default: 'Active' },
}, { timestamps: true })

adminSchema.index({ email:   1 }, { unique: true, sparse: true })
adminSchema.index({ adminId: 1 }, { unique: true, sparse: true })

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 4. GALLERY ITEMS
// ─────────────────────────────────────────────────────────────────────────────

const galleryItemSchema = new mongoose.Schema({
  src:             { type: String, required: true }, // /media/gallery/<file>
  type:            { type: String, enum: ['image','video'], default: 'image' },
  title:           { type: String, required: true, trim: true },
  description:     { type: String },
  category:        { type: String },
  aspectRatio:     { type: Number, default: 1.0 },
  date:            { type: String },
  publisher:       { type: String },
  publisherAvatar: { type: String },  // /media/avatars/<file>
  location:        { type: String },
  tags:            [{ type: String }],
  comments:        [commentSchema],
  likeCount:       { type: Number, default: 0 },
  saveCount:       { type: Number, default: 0 },
  shareCount:      { type: Number, default: 0 },
  isPublished:     { type: Boolean, default: true },
}, { timestamps: true })

galleryItemSchema.index({ category: 1, isPublished: 1, createdAt: -1 })

const GalleryItem = mongoose.models.GalleryItem || mongoose.model('GalleryItem', galleryItemSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAGE POSTS  (school news / article feed)
// ─────────────────────────────────────────────────────────────────────────────

const pagePostSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  body:         { type: String, required: true },
  excerpt:      { type: String },
  coverImage:   { type: String },  // /media/page/<file>
  category:     { type: String, enum: ['News','Event','Achievement','Notice','Sports','Academic'] },
  tags:         [{ type: String }],
  author:       { type: String },
  authorAvatar: { type: String },
  publishedAt:  { type: Date, default: Date.now },
  isPublished:  { type: Boolean, default: true },
  likeCount:    { type: Number, default: 0 },
  saveCount:    { type: Number, default: 0 },
  shareCount:   { type: Number, default: 0 },
  comments:     [commentSchema],
}, { timestamps: true })

pagePostSchema.index({ category: 1, isPublished: 1, publishedAt: -1 })

const PagePost = mongoose.models.PagePost || mongoose.model('PagePost', pagePostSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRODUCTS  (PTA Shop)
// ─────────────────────────────────────────────────────────────────────────────

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true,
                 enum: ['Apparel','Accessories','Stationery','Drinkware','House Items'] },
  price:       { type: Number, required: true, min: 0 },
  image:       { type: String },  // /media/products/<file>
  description: { type: String },
  stock:       { type: Number, default: 0, min: 0 },
  sku:         { type: String, sparse: true },
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true })

productSchema.index({ category: 1, isAvailable: 1 })

const Product = mongoose.models.Product || mongoose.model('Product', productSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 7. ORDERS  (PTA Shop checkout)
// ─────────────────────────────────────────────────────────────────────────────

const orderItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  qty:         { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true },
  subtotal:    { type: Number },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  buyerName:     { type: String, required: true },
  buyerEmail:    { type: String, required: true },
  buyerPhone:    { type: String },
  deliveryNote:  { type: String },
  items:         [orderItemSchema],
  total:         { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Mobile Money','Cash','Card','Bank Transfer'] },
  paymentStatus: { type: String, enum: ['Pending','Paid','Failed','Refunded'], default: 'Pending' },
  orderStatus:   { type: String, enum: ['Pending','Processing','Fulfilled','Cancelled'], default: 'Pending' },
  reference:     { type: String, sparse: true },
  placedAt:      { type: Date, default: Date.now },
}, { timestamps: true })

orderSchema.index({ paymentStatus: 1, orderStatus: 1, placedAt: -1 })

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 8. ACADEMIC ASSESSMENTS
// ─────────────────────────────────────────────────────────────────────────────

const subjectScoreSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  type:            { type: String, enum: ['core','elective'] },
  exerciseScore:   { type: Number, default: 0 },   // weight 20 %
  assignmentScore: { type: Number, default: 0 },   // weight 15 %
  projectScore:    { type: Number, default: 0 },   // weight 15 %
  groupWorkScore:  { type: Number, default: 0 },   // weight 10 %
  examScore:       { type: Number, default: 0 },   // weight 40 %
  noExam:          { type: Boolean, default: false },
  total:           { type: Number },
  grade:           { type: String },
  remark:          { type: String },
}, { _id: false })

const assessmentSchema = new mongoose.Schema({
  studentId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYear:      { type: String, required: true },
  form:              { type: String, required: true, enum: ['SHS 1','SHS 2','SHS 3'] },
  term:              { type: String, required: true, enum: ['Term 1','Term 2','Term 3'] },
  subjects:          [subjectScoreSchema],
  classPosition:     { type: Number },
  overallTotal:      { type: Number },
  overallGrade:      { type: String },
  classMasterRemark: { type: String },
  headmasterRemark:  { type: String },
}, { timestamps: true })

assessmentSchema.index(
  { studentId: 1, academicYear: 1, form: 1, term: 1 },
  { unique: true }
)

const Assessment = mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 9. ATTENDANCE RECORDS
// ─────────────────────────────────────────────────────────────────────────────

const weekAttendanceSchema = new mongoose.Schema({
  week: { type: Number },            // 1–13
  days: [{ type: Boolean }],         // [Mon, Tue, Wed, Thu, Fri]
}, { _id: false })

const attendanceSchema = new mongoose.Schema({
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYear:  { type: String, required: true },
  form:          { type: String, required: true, enum: ['SHS 1','SHS 2','SHS 3'] },
  term:          { type: String, required: true, enum: ['Term 1','Term 2','Term 3'] },
  weeks:         [weekAttendanceSchema],
  totalDays:     { type: Number, default: 65 },
  daysPresent:   { type: Number, default: 0 },
  daysAbsent:    { type: Number, default: 0 },
  attendancePct: { type: Number, default: 0 },
}, { timestamps: true })

attendanceSchema.index(
  { studentId: 1, academicYear: 1, form: 1, term: 1 },
  { unique: true }
)

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 10. ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────────────────────

const achievementSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },

  awards: [{
    title:       { type: String },
    year:        { type: String },
    description: { type: String },
    issuedBy:    { type: String },
  }],

  merits: [{
    title:       { type: String },
    year:        { type: String },
    description: { type: String },
  }],

  disciplinaryCases: [{
    title:      { type: String },
    date:       { type: Date },
    detail:     { type: String },
    resolution: { type: String },
    severity:   { type: String, enum: ['Minor','Major','Expulsion'] },
  }],
}, { timestamps: true })

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 11. CLEARANCE RECORDS
// ─────────────────────────────────────────────────────────────────────────────

const clearanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },

  departments: [{
    dept:      { type: String,
                 enum: ['Library','House Master','PTA','Disciplinary Committee','Admin/Finance','ICT','Chapel'] },
    cleared:   { type: Boolean, default: false },
    detail:    { type: String },
    clearedBy: { type: String },
    clearedAt: { type: Date },
  }],

  allCleared: { type: Boolean, default: false },
  exitDate:   { type: Date },
}, { timestamps: true })

const Clearance = mongoose.models.Clearance || mongoose.model('Clearance', clearanceSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 12. HOUSES
// ─────────────────────────────────────────────────────────────────────────────

const houseSchema = new mongoose.Schema({
  houseName:    { type: String, required: true, unique: true },
  color:        { type: String, required: true },
  houseType:    { type: String, enum: ['Boys','Girls','Mixed'], required: true },
  housemaster:  { type: String },
  captain:      { type: String },
  viceCaptain:  { type: String },
  totalMembers: { type: Number, default: 0 },
  points:       { type: Number, default: 0 },

  events: [{
    eventName:    { type: String },
    date:         { type: Date },
    result:       { type: String },
    pointsEarned: { type: Number },
  }],
}, { timestamps: true })

const House = mongoose.models.House || mongoose.model('House', houseSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 13. CLUBS
// ─────────────────────────────────────────────────────────────────────────────

const clubSchema = new mongoose.Schema({
  clubName:      { type: String, required: true, unique: true, trim: true },
  category:      { type: String,
                   enum: ['Academic','Sports','Arts','Cultural','Religious','Service','STEM','Other'] },
  description:   { type: String },
  clubHead:      { type: String },
  patronTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  totalMembers:  { type: Number, default: 0 },
  status:        { type: String, enum: ['Active','Inactive','Suspended'], default: 'Active' },
  meetingDay:    { type: String,
                   enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] },
  meetingTime:   { type: String },
  meetingVenue:  { type: String },

  members: [{
    studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    name:       { type: String },
    role:       { type: String, enum: ['President','Vice President','Secretary','Member','Other'] },
    joinedDate: { type: Date, default: Date.now },
    status:     { type: String, enum: ['Active','Inactive'], default: 'Active' },
  }],

  activities: [{
    title:       { type: String },
    date:        { type: Date },
    description: { type: String },
    outcome:     { type: String },
  }],
}, { timestamps: true })

const Club = mongoose.models.Club || mongoose.model('Club', clubSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 14. ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

const announcementSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  content:     { type: String, required: true },
  priority:    { type: String, enum: ['high','medium','low'], default: 'medium' },
  audience:    [{ type: String, enum: ['all','students','teachers','admins','parents'] }],
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  authorName:  { type: String },
  publishedAt: { type: Date, default: Date.now },
  expiresAt:   { type: Date },
  isPublished: { type: Boolean, default: true },
  isPinned:    { type: Boolean, default: false },
  attachments: [attachmentSchema],
}, { timestamps: true })

announcementSchema.index({ priority: 1, isPublished: 1, publishedAt: -1 })

const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 15. MESSAGES  (in-app chat)
// ─────────────────────────────────────────────────────────────────────────────

const messageSchema = new mongoose.Schema({
  type:         { type: String, enum: ['direct','group'], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId }],
  groupName:    { type: String },
  groupType:    { type: String, enum: ['class','club','prefect','house','staff','general'] },
  groupAvatar:  { type: String },
  isLocked:     { type: Boolean, default: false },
  totalMembers: { type: Number },

  messages: [{
    senderId:     { type: mongoose.Schema.Types.ObjectId, required: true },
    senderName:   { type: String },
    senderAvatar: { type: String },
    text:         { type: String },
    sentAt:       { type: Date, default: Date.now },
    attachments:  [attachmentSchema],
    readBy:       [{ type: mongoose.Schema.Types.ObjectId }],
    edited:       { type: Boolean, default: false },
  }],
}, { timestamps: true })

messageSchema.index({ participants: 1 })
messageSchema.index({ groupType: 1 })

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 16. LIBRARY RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

const libraryResourceSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  author:          { type: String },
  isbn:            { type: String, sparse: true },
  category:        { type: String,
                     enum: ['Textbook','Fiction','Non-Fiction','Reference','Journal','Digital','Past Papers'] },
  subject:         { type: String },
  publisher:       { type: String },
  yearPublished:   { type: Number },
  edition:         { type: String },
  totalCopies:     { type: Number, default: 1, min: 0 },
  availableCopies: { type: Number, default: 1, min: 0 },
  coverImage:      { type: String },  // /media/library/<file>
  fileUrl:         { type: String },  // /media/library/<file>
  isDigital:       { type: Boolean, default: false },
  isAvailable:     { type: Boolean, default: true },

  borrowHistory: [{
    studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    borrowedAt: { type: Date },
    returnDue:  { type: Date },
    returnedAt: { type: Date },
    status:     { type: String, enum: ['Active','Returned','Overdue'] },
  }],
}, { timestamps: true })

libraryResourceSchema.index({ category: 1, subject: 1, isAvailable: 1 })

const LibraryResource = mongoose.models.LibraryResource || mongoose.model('LibraryResource', libraryResourceSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 17. SYLLABUSES
// ─────────────────────────────────────────────────────────────────────────────

const syllabusSchema = new mongoose.Schema({
  subject:      { type: String, required: true },
  form:         { type: String, required: true, enum: ['SHS 1','SHS 2','SHS 3'] },
  term:         { type: String, required: true, enum: ['Term 1','Term 2','Term 3'] },
  academicYear: { type: String, required: true },
  program:      { type: String,
                  enum: ['General Science','General Arts','Home Economics','Visual Arts','Agriculture','All'] },
  teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherName:  { type: String },

  topics: [{
    weekNumber:  { type: Number },
    topicTitle:  { type: String },
    subtopics:   [{ type: String }],
    objectives:  [{ type: String }],
    resources:   [{ type: String }],
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date },
  }],

  fileAttachments: [attachmentSchema],
}, { timestamps: true })

syllabusSchema.index(
  { subject: 1, form: 1, term: 1, academicYear: 1, program: 1 },
  { unique: true }
)

const Syllabus = mongoose.models.Syllabus || mongoose.model('Syllabus', syllabusSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 18. CHAPEL RECORDS
// ─────────────────────────────────────────────────────────────────────────────

const chapelSchema = new mongoose.Schema({
  chapelName:   { type: String, required: true,
                  enum: ['Aggrey Chapel','Catholic Chapel','General Assembly'] },
  denomination: { type: String, enum: ['Protestant','Catholic','Interdenominational','Islamic','Other'] },

  services: [{
    date:         { type: Date, required: true },
    time:         { type: String },
    topic:        { type: String },
    speaker:      { type: String },
    scriptureRef: { type: String },
  }],

  attendance: [{
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    date:         { type: Date },
    present:      { type: Boolean, default: false },
    exempted:     { type: Boolean, default: false },
    exemptReason: { type: String },
  }],
}, { timestamps: true })

const Chapel = mongoose.models.Chapel || mongoose.model('Chapel', chapelSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 19. INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

const infrastructureSchema = new mongoose.Schema({
  facilityName:  { type: String, required: true, unique: true },
  category:      { type: String,
                   enum: ['Classroom','Laboratory','Dormitory','Sports','Chapel',
                          'Dining','Admin','ICT','Library','Other'] },
  location:      { type: String },
  capacity:      { type: Number },
  condition:     { type: String,
                   enum: ['Excellent','Good','Fair','Poor','Under Repair'], default: 'Good' },
  lastInspected: { type: Date },
  inspectedBy:   { type: String },

  maintenanceLogs: [{
    date:        { type: Date },
    description: { type: String },
    cost:        { type: Number },
    contractor:  { type: String },
    status:      { type: String, enum: ['Pending','In Progress','Completed'] },
  }],

  images: [{ type: String }],  // /media/infrastructure/<file>
  coords: [{ type: Number }],  // [lat, lng]
}, { timestamps: true })

const Infrastructure = mongoose.models.Infrastructure || mongoose.model('Infrastructure', infrastructureSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 20. MAP LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────

const mapLocationSchema = new mongoose.Schema({
  locationId:  { type: String, unique: true },
  name:        { type: String, required: true },
  category:    { type: String,
                 enum: ['academic','residential','sports','dining','worship','admin','facility'] },
  description: { type: String },
  coords:      { type: [Number], required: true },  // [lat, lng]
  color:       { type: String },
  icon:        { type: String },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true })

mapLocationSchema.index({ category: 1, isActive: 1 })

const MapLocation = mongoose.models.MapLocation || mongoose.model('MapLocation', mapLocationSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 21. SCHOOL PROFILE  (singleton — upsert, never insert twice)
// ─────────────────────────────────────────────────────────────────────────────

const schoolProfileSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'Achimota School' },
  founded:    { type: Number, default: 1924 },
  location:   { type: String, default: 'Accra, Ghana' },
  motto:      { type: String, default: 'Ut Omnes Unum Sint' },
  headmaster: { type: String },
  deputy:     { type: String },
  poBox:      { type: String },
  website:    { type: String },
  phone:      { type: String },
  email:      { type: String },
  logo:       { type: String },  // /media/school/<file>
  anthem:     [{ type: String }],

  houses:          [{ name: String, color: String }],
  chaplaincy:      [{ name: String, denomination: String, chaplain: String }],
  serviceContacts: [{ service: String, phone: String, email: String, hours: String }],

  socialMedia: {
    facebook:  { type: String },
    instagram: { type: String },
    twitter:   { type: String },
    youtube:   { type: String },
  },
}, { timestamps: true })

const SchoolProfile = mongoose.models.SchoolProfile || mongoose.model('SchoolProfile', schoolProfileSchema)

// ─────────────────────────────────────────────────────────────────────────────
// 22. CONFERENCE SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

const conferenceSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  hostId:   { type: mongoose.Schema.Types.ObjectId },
  hostName: { type: String },
  type:     { type: String, enum: ['class','staff','parents','general'], default: 'class' },

  participants: [{
    userId:   { type: mongoose.Schema.Types.ObjectId },
    name:     { type: String },
    role:     { type: String, enum: ['student','teacher','admin'] },
    joinedAt: { type: Date },
    leftAt:   { type: Date },
    duration: { type: Number },
  }],

  startedAt:    { type: Date, default: Date.now },
  endedAt:      { type: Date },
  duration:     { type: Number },
  status:       { type: String, enum: ['scheduled','live','ended','cancelled'], default: 'scheduled' },
  recordingUrl: { type: String },
  screenshots:  [{ type: String }],
  sharedDocs:   [attachmentSchema],
}, { timestamps: true })

conferenceSchema.index({ status: 1, startedAt: -1 })

const Conference = mongoose.models.Conference || mongoose.model('Conference', conferenceSchema)

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS  — import any model in any route/seed file
// ─────────────────────────────────────────────────────────────────────────────

const models = {
  Student, Teacher, Admin,
  GalleryItem, PagePost,
  Product, Order,
  Assessment, Attendance, Achievement, Clearance,
  House, Club, Announcement, Message,
  LibraryResource, Syllabus, Chapel,
  Infrastructure, MapLocation,
  SchoolProfile, Conference,
}

module.exports = models

// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE:  node backend/schema.js
// Connects, registers all schemas + indexes, then disconnects.
// Use this to push the structure to MongoDB without seeding any data.
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  ;(async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI)
      console.log('Connected to:', mongoose.connection.host)
      console.log('')

      const entries = Object.entries(models)
      for (const [name, Model] of entries) {
        await Model.createIndexes()
        console.log(`  ✓  ${name}`)
      }

      console.log(`\n${entries.length} collections registered. Indexes applied.`)
      await mongoose.disconnect()
      console.log('Done.')
    } catch (err) {
      console.error('Schema push failed:', err.message)
      process.exit(1)
    }
  })()
}
