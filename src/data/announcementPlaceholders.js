// Built-in announcements shown on the public Announcements page when there
// are no real ones yet. Admin → Media → Announcements lists them too.
export const ANNOUNCEMENT_PLACEHOLDERS = [
  {
    _id: '1', title: 'School Reopening Notice',
    content: 'School will reopen on January 20th. All students are required to attend the orientation session in the main hall at 8:00 AM.',
    priority: 'high', audience: 'all', pinned: true,
    image: null, seenBy: [],
    createdAt: '2024-01-15T08:00:00Z', author: 'Headmaster',
  },
  {
    _id: '2', title: 'PTA Monthly Meeting',
    content: 'Monthly PTA meeting scheduled for January 25th at 6:00 PM in the auditorium. All parents are urged to attend.',
    priority: 'medium', audience: 'parents', pinned: false,
    image: null, seenBy: [],
    createdAt: '2024-01-10T10:00:00Z', author: 'PTA Coordinator',
  },
  {
    _id: '3', title: 'Sports Day Registration Open',
    content: 'Registration for the annual sports day is now open. Students should sign up at the PE office by January 30th.',
    priority: 'low', audience: 'students', pinned: false,
    image: null, seenBy: [],
    createdAt: '2024-01-08T09:00:00Z', author: 'PE Department',
  },
  {
    _id: '4', title: 'End of Term Examinations',
    content: 'End of term examinations begin February 5th. Timetables are available from class teachers and on the notice boards.',
    priority: 'urgent', audience: 'all', pinned: true,
    image: null, seenBy: [],
    createdAt: '2024-01-05T07:30:00Z', author: 'Academic Affairs',
  },
]
