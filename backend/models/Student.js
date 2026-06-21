const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema({
  name:       { type: String },
  relation:   { type: String },
  address:    { type: String },
  occupation: { type: String },
  phone:      { type: String },
  email:      { type: String },
}, { _id: false });

const beceResultSchema = new mongoose.Schema({
  subject: { type: String },
  grade:   { type: String },
}, { _id: false });

const recordSchema = new mongoose.Schema({
  title:       { type: String },
  description: { type: String },
  year:        { type: String },
}, { _id: false });

const studentSchema = new mongoose.Schema({
  // Login credentials
  username:   { type: String, required: true, unique: true, trim: true },
  password:   { type: String, required: true },

  // Stage 1 — Biometric
  passportPhoto: { type: String },
  fingerprint:   { type: String },

  // Stage 2 — Personal Info
  firstName:    { type: String, required: true, trim: true },
  middleName:   { type: String, trim: true },
  lastName:     { type: String, required: true, trim: true },
  dob:          { type: String },
  hometown:     { type: String },
  placeOfBirth: { type: String },
  gender:       { type: String },
  nationality:  { type: String, default: 'Ghanaian' },
  ethnicGroup:  { type: String },
  denomination: { type: String },
  disability:   { type: Boolean, default: false },
  disabilityNote: { type: String },
  homeAddress:  { type: String },
  poBox:        { type: String },

  // Stage 3 — Guardian
  guardians: [guardianSchema],

  // Stage 4 — Examination
  jhsIndex:               { type: String },
  previousSchool:         { type: String },
  previousSchoolLocation: { type: String },
  beceResults:            [beceResultSchema],

  // Stage 5 — Programme
  program: { type: String },

  // Stage 6 — Campus
  campus: { type: String },

  // Stage 7 — Additional
  records: [recordSchema],

  // Stage 8 — Essay
  essayWhy:         { type: String },
  essayPersonality: { type: String },

  // Meta
  studentId:  { type: String, unique: true, sparse: true },
  email:      { type: String, lowercase: true, sparse: true },
  isProspect: { type: Boolean, default: true },
  avatar:     { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
