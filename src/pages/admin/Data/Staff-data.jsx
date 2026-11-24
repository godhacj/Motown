import React from 'react'
import { Pill } from '../../../components/admin/AdminKit'
import DataDirectory from './DataDirectory'
import '../../../styles/admin/Data/Staff-data.css'

const DEPTS = ['General Science', 'General Arts', 'Visual Arts', 'Home Economics', 'Agriculture']
const STATUS = ['Active', 'On Leave', 'Retired', 'Resigned']
const TONE = { Active: 'success', 'On Leave': 'warning', Retired: 'neutral', Resigned: 'neutral' }
const ROLE = { teacher: 'Teacher', hod: 'Head of Department', hod_assistant: 'HOD Assistant' }

const config = {
  title: 'Staff Data',
  subtitle: 'Teaching staff: contact details, department, role and status.',
  notch: 'Staff Data',
  mode: 'teacher',
  endpoint: '/api/admin/data/teachers',
  listKey: 'teachers',
  searchPlaceholder: 'Name, staff ID, email or position…',
  filters: [
    { key: 'department', label: 'All departments', options: DEPTS },
    { key: 'status', label: 'Any status', options: STATUS },
  ],
  columns: [
    { key: 'name', label: 'Teacher', className: 'is-primary', render: (t) => <div className="ak-thumb-cell"><div><strong>{t.firstName} {t.lastName}</strong><span>{t.staffId || '—'}</span></div></div> },
    { key: 'department', label: 'Department', render: (t) => t.department || '—' },
    { key: 'role', label: 'Role', render: (t) => ROLE[t.role] || t.role || '—' },
    { key: 'yearsOfService', label: 'Years', render: (t) => t.yearsOfService ?? '—' },
    { key: 'status', label: 'Status', render: (t) => <Pill tone={TONE[t.status]}>{t.status || '—'}</Pill> },
  ],
  recordTitle: (t) => `${t.firstName} ${t.lastName}`,
  sections: [
    { title: 'Personal', fields: [
      { name: 'staffId', label: 'Staff ID', readOnly: true },
      { name: 'firstName', label: 'First name' },
      { name: 'lastName', label: 'Last name' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { name: 'nationality', label: 'Nationality' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone' },
      { name: 'address', label: 'Address', wide: true },
    ] },
    { title: 'Employment', fields: [
      { name: 'department', label: 'Department', type: 'select', options: DEPTS },
      { name: 'yearGroup', label: 'Year group', type: 'select', options: ['SHS 1', 'SHS 2', 'SHS 3'] },
      { name: 'role', label: 'Portal role', type: 'select', options: ['teacher', 'hod', 'hod_assistant'], hint: 'hod / hod_assistant unlock the Timetable Builder' },
      { name: 'position', label: 'Position' },
      { name: 'qualification', label: 'Qualification' },
      { name: 'yearsOfService', label: 'Years of service', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: STATUS },
      { name: 'subjects', label: 'Subjects taught', type: 'list', hint: 'One per line', wide: true },
    ] },
  ],
}

export default function StaffData() {
  return <DataDirectory config={config} />
}
