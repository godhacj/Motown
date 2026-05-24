import React, { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../styles/SignOut.css'
import Badge from '../components/Badge'

export default function SignOut() {
  const { setSideMenu } = useOutletContext()

  useEffect(() => {
    setSideMenu([])
  }, [setSideMenu])

  return (
    <div className="signout-main">
      <div className="page">
        <div className="signout-content">
          <Badge />
          <div className="signed-out-message">
            <span>Signed Out</span>
          </div>
        </div>
      </div>
    </div>
  )
}
