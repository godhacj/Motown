// Home page for each admin portal. Data accounts are split by scope.mode.
const PORTAL_HOME = {
  house:      '/admin/house',
  academics:  '/admin/academics',
  data:       '/admin/data/student-data',
  domestic:   '/admin/domestic',
  chapel:     '/admin/chapel/aggrey-chapel',
  library:    '/admin/library',
  club:       '/admin/club',
  media:      '/admin/media',
  management: '/management',
  accounts:   '/admin/accounts',
}

const DATA_MODE_HOME = {
  student:        '/admin/data/student-data',
  teacher:        '/admin/data/staff-data',
  infrastructure: '/admin/data/infrastructure',
  record:         '/admin/data/records',
}

export function adminHome(portal, scope) {
  if (portal === 'data' && DATA_MODE_HOME[scope?.mode]) return DATA_MODE_HOME[scope.mode]
  return PORTAL_HOME[portal] || '/admin/academics'
}
