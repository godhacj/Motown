/**
 * seedStudentData.js — seed full profile data for demo student Michael Owusu.
 *
 * Creates / updates the student record plus linked Assessment, Attendance,
 * Achievement, and Clearance documents.
 *
 * Usage:  node backend/seedStudentData.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const {
  Student, Assessment, Attendance, Achievement, Clearance,
} = require('./schema')

// ─── Student core profile ─────────────────────────────────────────────────────

const STUDENT_RECORD = {
  username:        'Student_001',
  password:        'Student@001',
  role:            'student',
  firstName:       'Michael',
  middleName:      'Kwame',
  lastName:        'Owusu',
  studentId:       'STU20240001',
  indexNumber:     'ACH/STU.GS.443/22-23',
  email:           'michael.owusu@achimota.edu.gh',
  dob:             new Date('2007-03-15'),
  gender:          'Male',
  hometown:        'Kumasi',
  placeOfBirth:    'Kumasi',
  nationality:     'Ghanaian',
  ethnicGroup:     'Akan',
  denomination:    'Christian',
  homeAddress:     '12 Osei Bonsu Street, Adum, Kumasi',
  poBox:           'P.O. Box KS 4421',
  program:         'General Science',
  house:           'House 6',
  classLevel:      'SHS 3',
  campus:          'Boarding',
  prefectPosition: 'None',
  disability:      false,
  fingerprint:     'captured',
  extracurricular: ['Science Club', 'Mathematics Club', 'School Football Team'],
  status:          'Active',
  isProspect:      false,
  guardians: [
    {
      name:       'Emmanuel Owusu',
      relation:   'Father',
      occupation: 'Civil Engineer',
      phone:      '+233 24 456 7890',
      email:      'e.owusu@gmail.com',
      address:    '12 Osei Bonsu Street, Adum, Kumasi',
    },
    {
      name:       'Grace Owusu',
      relation:   'Mother',
      occupation: 'Nurse',
      phone:      '+233 20 987 6543',
      email:      'grace.owusu@gmail.com',
      address:    '12 Osei Bonsu Street, Adum, Kumasi',
    },
  ],
}

// ─── Attendance records ───────────────────────────────────────────────────────

const ATTENDANCE_RECORDS = [
  {
    academicYear: '2022/23', form: 'SHS 1', term: 'Term 1',
    weeks: [
      { week:  1, days: [true, true, false, true, true] },
      { week:  2, days: [true, true, false, true, true] },
      { week:  3, days: [true, true, true,  true, true] },
      { week:  4, days: [true, true, true,  true, true] },
      { week:  5, days: [true, true, true,  true, true] },
      { week:  6, days: [true, true, true,  true, true] },
      { week:  7, days: [true, true, true,  true, true] },
      { week:  8, days: [true, true, true,  true, true] },
      { week:  9, days: [true, true, true,  true, true] },
      { week: 10, days: [true, true, true,  true, true] },
      { week: 11, days: [true, true, true,  true, true] },
      { week: 12, days: [true, true, true,  true, true] },
      { week: 13, days: [true, true, true,  true, true] },
    ],
  },
  {
    academicYear: '2022/23', form: 'SHS 1', term: 'Term 2',
    weeks: [
      { week:  1, days: [true, true,  true, true, true] },
      { week:  2, days: [true, true,  true, true, true] },
      { week:  3, days: [true, true,  true, true, true] },
      { week:  4, days: [true, true,  true, true, true] },
      { week:  5, days: [true, true,  true, true, true] },
      { week:  6, days: [true, false, true, true, true] },
      { week:  7, days: [true, true,  true, true, true] },
      { week:  8, days: [true, true,  true, true, true] },
      { week:  9, days: [true, true,  true, true, true] },
      { week: 10, days: [true, true,  true, true, true] },
      { week: 11, days: [true, true,  true, true, true] },
      { week: 12, days: [true, true,  true, true, true] },
      { week: 13, days: [true, true,  true, true, true] },
    ],
  },
  {
    academicYear: '2022/23', form: 'SHS 1', term: 'Term 3',
    weeks: [
      { week:  1, days: [true, true, true, true,  true] },
      { week:  2, days: [true, true, true, true,  true] },
      { week:  3, days: [true, true, true, true,  true] },
      { week:  4, days: [true, true, true, false, true] },
      { week:  5, days: [true, true, true, true,  true] },
      { week:  6, days: [true, true, true, true,  true] },
      { week:  7, days: [true, true, true, true,  true] },
      { week:  8, days: [true, true, true, true,  true] },
      { week:  9, days: [true, true, true, true,  true] },
      { week: 10, days: [true, true, true, true,  true] },
    ],
  },
  {
    academicYear: '2023/24', form: 'SHS 2', term: 'Term 1',
    weeks: [
      { week:  1, days: [true, true, true, true, true]  },
      { week:  2, days: [true, true, true, true, true]  },
      { week:  3, days: [true, true, true, true, true]  },
      { week:  4, days: [true, true, true, true, true]  },
      { week:  5, days: [true, true, true, true, true]  },
      { week:  6, days: [true, true, true, true, true]  },
      { week:  7, days: [true, true, true, true, true]  },
      { week:  8, days: [true, true, true, true, false] },
      { week:  9, days: [true, true, true, true, true]  },
      { week: 10, days: [true, true, true, true, true]  },
      { week: 11, days: [true, true, true, true, true]  },
      { week: 12, days: [true, true, true, true, true]  },
      { week: 13, days: [true, true, true, true, true]  },
    ],
  },
  {
    academicYear: '2023/24', form: 'SHS 2', term: 'Term 2',
    weeks: [
      { week:  1, days: [true,  false, true, true, true] },
      { week:  2, days: [true,  true,  true, true, true] },
      { week:  3, days: [true,  true,  true, true, true] },
      { week:  4, days: [true,  true,  true, true, true] },
      { week:  5, days: [true,  true,  true, true, true] },
      { week:  6, days: [true,  true,  true, true, true] },
      { week:  7, days: [true,  true,  true, true, true] },
      { week:  8, days: [true,  true,  true, true, true] },
      { week:  9, days: [true,  true,  true, true, true] },
      { week: 10, days: [true,  true,  true, true, true] },
      { week: 11, days: [true,  true,  true, true, true] },
      { week: 12, days: [true,  true,  true, true, true] },
      { week: 13, days: [true,  true,  true, true, true] },
    ],
  },
  {
    academicYear: '2023/24', form: 'SHS 2', term: 'Term 3',
    weeks: [
      { week:  1, days: [true, true, true,  true, true] },
      { week:  2, days: [true, true, true,  true, true] },
      { week:  3, days: [true, true, false, true, true] },
      { week:  4, days: [true, true, true,  true, true] },
      { week:  5, days: [true, true, true,  true, true] },
      { week:  6, days: [true, true, true,  true, true] },
      { week:  7, days: [true, true, true,  true, true] },
      { week:  8, days: [true, true, true,  true, true] },
      { week:  9, days: [true, true, true,  true, true] },
      { week: 10, days: [true, true, true,  true, true] },
    ],
  },
  {
    academicYear: '2024/25', form: 'SHS 3', term: 'Term 1',
    weeks: [
      { week:  1, days: [true, true, true, true,  true] },
      { week:  2, days: [true, true, true, true,  true] },
      { week:  3, days: [true, true, true, true,  true] },
      { week:  4, days: [true, true, true, true,  true] },
      { week:  5, days: [true, true, true, true,  true] },
      { week:  6, days: [true, true, true, true,  true] },
      { week:  7, days: [true, true, true, true,  true] },
      { week:  8, days: [true, true, true, true,  true] },
      { week:  9, days: [true, true, true, true,  true] },
      { week: 10, days: [true, true, true, false, true] },
      { week: 11, days: [true, true, true, true,  true] },
      { week: 12, days: [true, true, true, true,  true] },
      { week: 13, days: [true, true, true, true,  true] },
    ],
  },
  {
    academicYear: '2024/25', form: 'SHS 3', term: 'Term 2',
    weeks: [
      { week:  1, days: [false, true, true, true, true] },
      { week:  2, days: [true,  true, true, true, true] },
      { week:  3, days: [true,  true, true, true, true] },
      { week:  4, days: [true,  true, true, true, true] },
      { week:  5, days: [true,  true, true, true, true] },
      { week:  6, days: [true,  true, true, true, true] },
      { week:  7, days: [true,  true, true, true, true] },
      { week:  8, days: [true,  true, true, true, true] },
      { week:  9, days: [true,  true, true, true, true] },
      { week: 10, days: [true,  true, true, true, true] },
      { week: 11, days: [true,  true, true, true, true] },
      { week: 12, days: [true,  true, true, true, true] },
      { week: 13, days: [true,  true, true, true, true] },
    ],
  },
  {
    academicYear: '2024/25', form: 'SHS 3', term: 'Term 3',
    weeks: Array.from({ length: 10 }, (_, i) => ({
      week: i + 1, days: [true, true, true, true, true],
    })),
  },
]

// ─── Academic assessments ─────────────────────────────────────────────────────

const ASSESSMENT_RECORDS = [
  {
    academicYear: '2022/23', form: 'SHS 1', term: 'Term 1',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 18, assignmentScore: 12, projectScore: 8, groupWorkScore: 7, examScore: 63 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 17, assignmentScore: 12, projectScore: 9, groupWorkScore: 7, examScore: 58 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 19, assignmentScore: 13, projectScore: 8, groupWorkScore: 8, examScore: 68 },
      { name: 'ICT',                 type: 'core',     exerciseScore: 15, assignmentScore: 10, projectScore: 9, groupWorkScore: 7, examScore: 49 },
      { name: 'French',              type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 68 },
      { name: 'Physical Education',  type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 63 },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 17, assignmentScore: 12, projectScore: 8, groupWorkScore: 7, examScore: 56 },
      { name: 'Physics',             type: 'elective', exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 66 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
    ],
  },
  {
    academicYear: '2022/23', form: 'SHS 1', term: 'Term 2',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 16, assignmentScore: 11, projectScore: 8, groupWorkScore: 7, examScore: 60 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 66 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 18, assignmentScore: 12, projectScore: 9, groupWorkScore: 7, examScore: 62 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 17, assignmentScore: 12, projectScore: 8, groupWorkScore: 7, examScore: 58 },
      { name: 'ICT',                 type: 'core',     noExam: true },
      { name: 'French',              type: 'core',     noExam: true },
      { name: 'Physical Education',  type: 'core',     noExam: true },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 68 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 18, assignmentScore: 12, projectScore: 9, groupWorkScore: 7, examScore: 60 },
      { name: 'Physics',             type: 'elective', exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 65 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 19, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 67 },
    ],
  },
  {
    academicYear: '2022/23', form: 'SHS 1', term: 'Term 3',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 19, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 75 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 66 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'ICT',                 type: 'core',     noExam: true },
      { name: 'French',              type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Physical Education',  type: 'core',     noExam: true },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 63 },
      { name: 'Physics',             type: 'elective', exerciseScore: 19, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 68 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 74 },
    ],
  },
  {
    academicYear: '2023/24', form: 'SHS 2', term: 'Term 1',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 68 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 73 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 65 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 20, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 71 },
      { name: 'ICT',                 type: 'core',     exerciseScore: 17, assignmentScore: 12, projectScore: 9, groupWorkScore: 7, examScore: 55 },
      { name: 'French',              type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'Physical Education',  type: 'core',     exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 66 },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 73 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 62 },
      { name: 'Physics',             type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 74 },
    ],
  },
  {
    academicYear: '2023/24', form: 'SHS 2', term: 'Term 2',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 65 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 75 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 67 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 62 },
      { name: 'ICT',                 type: 'core',     noExam: true },
      { name: 'French',              type: 'core',     noExam: true },
      { name: 'Physical Education',  type: 'core',     noExam: true },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 64 },
      { name: 'Physics',             type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 76 },
    ],
  },
  {
    academicYear: '2023/24', form: 'SHS 2', term: 'Term 3',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 78 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 19, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 68 },
      { name: 'ICT',                 type: 'core',     noExam: true },
      { name: 'French',              type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 73 },
      { name: 'Physical Education',  type: 'core',     noExam: true },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 75 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 19, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 66 },
      { name: 'Physics',             type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 74 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 80 },
    ],
  },
  {
    academicYear: '2024/25', form: 'SHS 3', term: 'Term 1',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 74 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 80 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 72 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 73 },
      { name: 'ICT',                 type: 'core',     exerciseScore: 18, assignmentScore: 13, projectScore: 9, groupWorkScore: 7, examScore: 60 },
      { name: 'French',              type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 74 },
      { name: 'Physical Education',  type: 'core',     exerciseScore: 20, assignmentScore: 13, projectScore: 9, groupWorkScore: 8, examScore: 68 },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 78 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 70 },
      { name: 'Physics',             type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 76 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 82 },
    ],
  },
  {
    academicYear: '2024/25', form: 'SHS 3', term: 'Term 2',
    subjects: [
      { name: 'English Language',    type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 76 },
      { name: 'Mathematics',         type: 'core',     exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 83 },
      { name: 'Integrated Science',  type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 74 },
      { name: 'Social Studies',      type: 'core',     exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 75 },
      { name: 'ICT',                 type: 'core',     noExam: true },
      { name: 'French',              type: 'core',     noExam: true },
      { name: 'Physical Education',  type: 'core',     noExam: true },
      { name: 'Elective ICT',        type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 80 },
      { name: 'Chemistry',           type: 'elective', exerciseScore: 20, assignmentScore: 14, projectScore: 9, groupWorkScore: 8, examScore: 73 },
      { name: 'Physics',             type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 79 },
      { name: 'Elective Mathematics',type: 'elective', exerciseScore: 20, assignmentScore: 15, projectScore: 9, groupWorkScore: 8, examScore: 85 },
    ],
  },
  {
    academicYear: '2024/25', form: 'SHS 3', term: 'Term 3',
    subjects: [
      { name: 'English Language',    type: 'core',     noExam: true },
      { name: 'Mathematics',         type: 'core',     noExam: true },
      { name: 'Integrated Science',  type: 'core',     noExam: true },
      { name: 'Social Studies',      type: 'core',     noExam: true },
      { name: 'ICT',                 type: 'core',     noExam: true },
      { name: 'French',              type: 'core',     noExam: true },
      { name: 'Physical Education',  type: 'core',     noExam: true },
      { name: 'Elective ICT',        type: 'elective', noExam: true },
      { name: 'Chemistry',           type: 'elective', noExam: true },
      { name: 'Physics',             type: 'elective', noExam: true },
      { name: 'Elective Mathematics',type: 'elective', noExam: true },
    ],
  },
]

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENT_RECORD = {
  awards: [
    { title: 'Best Student',                          year: '2024', description: 'Awarded best student in Kumasi Anglican JHS for the 2023/24 academic year.' },
    { title: 'Regional Maths Competition — 1st Place', year: '2023', description: 'Won first place in the Ashanti Regional Mathematics Competition.' },
  ],
  merits: [
    { title: 'Term 1 Honour Roll',    year: '2022/23', description: 'Top 5 in class, Term 1 SHS 1.' },
    { title: 'Best Science Student',  year: '2023/24', description: 'Highest scorer in Integrated Science, SHS 2.' },
    { title: 'Head Prefect',          year: '2024',    description: 'Served as Head Prefect, leading the student body.' },
  ],
  disciplinaryCases: [],
}

// ─── Clearance ────────────────────────────────────────────────────────────────

const CLEARANCE_RECORD = {
  departments: [
    { dept: 'Library',                cleared: false, detail: '2 books outstanding: "Further Mathematics" (SHS 2), "English Literature"' },
    { dept: 'House Master',           cleared: true,  detail: 'All house dues paid. Dormitory items returned.' },
    { dept: 'PTA',                    cleared: false, detail: 'Term 3 PTA levy (GHS 50.00) outstanding.' },
    { dept: 'Disciplinary Committee', cleared: true,  detail: 'No outstanding cases. Record clean.' },
    { dept: 'Admin/Finance',          cleared: false, detail: 'Transcript fee (GHS 20.00) not yet paid.' },
  ],
  allCleared: false,
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  // 1. Upsert student
  const hashedPwd = await bcrypt.hash(STUDENT_RECORD.password, 10)
  const student = await Student.findOneAndUpdate(
    { studentId: STUDENT_RECORD.studentId },
    { $set: { ...STUDENT_RECORD, password: hashedPwd } },
    { upsert: true, new: true }
  )
  console.log(`  Student upserted: ${student.firstName} ${student.lastName} (${student.studentId})`)

  const sid = student._id

  // 2. Upsert attendance records
  for (const rec of ATTENDANCE_RECORDS) {
    const daysPresent = rec.weeks.reduce((sum, w) => sum + w.days.filter(Boolean).length, 0)
    const totalDays   = rec.weeks.reduce((sum, w) => sum + w.days.length, 0)
    await Attendance.findOneAndUpdate(
      { studentId: sid, academicYear: rec.academicYear, form: rec.form, term: rec.term },
      {
        $set: {
          studentId:     sid,
          academicYear:  rec.academicYear,
          form:          rec.form,
          term:          rec.term,
          weeks:         rec.weeks,
          totalDays,
          daysPresent,
          daysAbsent:    totalDays - daysPresent,
          attendancePct: Math.round((daysPresent / totalDays) * 100),
        },
      },
      { upsert: true }
    )
  }
  console.log(`  Attendance: ${ATTENDANCE_RECORDS.length} records upserted`)

  // 3. Upsert assessment records
  for (const rec of ASSESSMENT_RECORDS) {
    await Assessment.findOneAndUpdate(
      { studentId: sid, academicYear: rec.academicYear, form: rec.form, term: rec.term },
      { $set: { studentId: sid, ...rec } },
      { upsert: true }
    )
  }
  console.log(`  Assessments: ${ASSESSMENT_RECORDS.length} records upserted`)

  // 4. Upsert achievement
  await Achievement.findOneAndUpdate(
    { studentId: sid },
    { $set: { studentId: sid, ...ACHIEVEMENT_RECORD } },
    { upsert: true }
  )
  console.log('  Achievement record upserted')

  // 5. Upsert clearance
  await Clearance.findOneAndUpdate(
    { studentId: sid },
    { $set: { studentId: sid, ...CLEARANCE_RECORD } },
    { upsert: true }
  )
  console.log('  Clearance record upserted')

  console.log('\nDone. Michael Owusu seeded successfully.')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
