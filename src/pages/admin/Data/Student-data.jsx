import React from 'react'
import { Pill } from '../../../components/admin/AdminKit'
import DataDirectory from './DataDirectory'
import '../../../styles/admin/Data/Student-data.css'

const PROGRAMS = ['General Science', 'General Arts', 'Home Economics', 'Visual Arts', 'Agriculture']
const FORMS = ['SHS 1', 'SHS 2', 'SHS 3']
const STATUS = ['Active', 'Inactive', 'Graduated', 'Suspended']
const TONE = { Active: 'success', Inactive: 'neutral', Graduated: 'accent', Suspended: 'danger' }

const config = {
  title: 'Student Data',
  subtitle: 'Student profiles: personal details, placement and status.',
  notch: 'Student Data',
  mode: 'student',
  endpoint: '/api/admin/data/students',
  listKey: 'students',
  searchPlaceholder: 'Name, student ID, email or index number…',
  filters: [
    { key: 'class', label: 'All forms', options: FORMS },
    { key: 'program', label: 'All programmes', options: PROGRAMS },
    { key: 'campus', label: 'Boarding & day', options: ['Boarding', 'Day'] },
    { key: 'status', label: 'Any status', options: STATUS },
  ],
  columns: [
    { key: 'name', label: 'Student', className: 'is-primary', render: (s) => <div className="ak-thumb-cell"><div><strong>{s.firstName} {s.middleName ? `${s.middleName} ` : ''}{s.lastName}</strong><span>{s.studentId || '—'}</span></div></div> },
    { key: 'classLevel', label: 'Form', render: (s) => s.classLevel || '—' },
    { key: 'program', label: 'Programme', render: (s) => s.program || '—' },
    { key: 'campus', label: 'Campus', render: (s) => s.campus || '—' },
    { key: 'status', label: 'Status', render: (s) => <Pill tone={TONE[s.status]}>{s.status || '—'}</Pill> },
  ],
  recordTitle: (s) => `${s.firstName} ${s.lastName}`,
  sections: [
    { title: 'Identity', fields: [
      { name: 'studentId', label: 'Student ID', readOnly: true },
      { name: 'firstName', label: 'First name' },
      { name: 'middleName', label: 'Middle name' },
      { name: 'lastName', label: 'Last name' },
      { name: 'dob', label: 'Date of birth', type: 'date' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
      { name: 'nationality', label: 'Nationality' },
      { name: 'hometown', label: 'Hometown' },
      { name: 'denomination', label: 'Denomination' },
    ] },
    { title: 'School', fields: [
      { name: 'classLevel', label: 'Form', type: 'select', options: FORMS },
      { name: 'program', label: 'Programme', type: 'select', options: PROGRAMS },
      { name: 'campus', label: 'Campus', type: 'select', options: ['Boarding', 'Day'] },
      { name: 'status', label: 'Status', type: 'select', options: STATUS },
      { name: 'indexNumber', label: 'Index number' },
      { name: 'prefectPosition', label: 'Prefect position' },
    ] },
    { title: 'Contact & welfare', fields: [
      { name: 'email', label: 'Email' },
      { name: 'homeAddress', label: 'Home address', wide: true },
      { name: 'poBox', label: 'P.O. Box' },
      { name: 'disability', label: 'Has a disability', type: 'toggle' },
      { name: 'disabilityNote', label: 'Support notes', type: 'textarea', wide: true },
    ] },
  ],
}

export default function StudentData() {
  return <DataDirectory config={config} />
}
