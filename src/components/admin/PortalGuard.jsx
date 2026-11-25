import React, { useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { adminHome } from '../../config/adminRoutes'
import StatusScreen from '../StatusScreen'

const PORTAL_LABEL = {
  house: 'House', academics: 'Academics', data: 'Data', domestic: 'Domestic', chapel: 'Chapel',
  library: 'Library', club: 'Club', media: 'Media', pta: 'PTA Shop', management: 'Management', accounts: 'Accounts',
}
const MODE_LABEL = { student: 'Student Data', teacher: 'Staff Data', infrastructure: 'Infrastructure', record: 'Records' }

/**
 * Shows an admin page only to accounts that can use it (Management can use
 * all of them). Others get a clear explanation and a way back to their own
 * portal, instead of the server's "requires portal" error.
 *
 * portal: 'club' | 'media' | …     mode: optional Data-portal mode
 */
export default function PortalGuard({ portal, mode, children }) {
  const { session, logout } = useAdminAuth()
  const navigate = useNavigate()
  const outlet = useOutletContext() || {}

  const allowed = !session
    || session.portal === 'management'
    || (session.portal === portal && (!mode || session.scope?.mode === mode))

  useEffect(() => {
    if (!allowed) outlet.setNotchText?.('No access')
  }, [allowed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Not signed in: the page itself sends the user to the admin login.
  if (allowed) return children

  const pageName = mode ? MODE_LABEL[mode] : PORTAL_LABEL[portal] || portal
  const mine = session.portal === 'data' ? MODE_LABEL[session.scope?.mode] || 'Data' : PORTAL_LABEL[session.portal] || session.portal

  return (
    <div className="page-container">
      <StatusScreen
        kind="forbidden"
        title={`This page is for the ${pageName} portal`}
        message={`You're signed in as ${session.displayName || session.username} (${mine}). Your account can't open ${pageName} pages.`}
        actions={[
          { label: `Go to ${mine}`, onClick: () => navigate(adminHome(session.portal, session.scope)), variant: 'primary' },
          { label: 'Sign in with another account', onClick: () => { logout(); navigate('/login/admin') } },
        ]}
      />
    </div>
  )
}
