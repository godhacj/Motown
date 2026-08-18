import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/PageContent.css'

const PAY_COLOR = { Pending:'#f59e0b', Paid:'#10b981', Failed:'#ef4444', Refunded:'#8b5cf6' }

export default function Accounts() {
  const session = useAdminPortal('Accounts', 'Search orders…')
  const { apiFetch } = useAdminAuth()

  const [orders,  setOrders]  = useState([])
  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState('orders')
  const [payStatus, setPayStatus] = useState('')

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams()
    if (payStatus) params.set('paymentStatus', payStatus)
    setLoading(true)
    Promise.all([
      apiFetch(`/api/admin/accounts/orders?${params}`),
      apiFetch('/api/admin/accounts/debtors'),
    ])
      .then(([oData, dData]) => {
        setOrders(oData.orders || [])
        setDebtors(dData.debtors || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, payStatus])

  const totalRevenue = orders.filter(o=>o.paymentStatus==='Paid').reduce((s,o)=>s+o.total,0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Accounts</h1>
        <p>Orders, payments and fee clearance</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{orders.length}</div><div className="stat-label">Orders</div></div>
        <div className="stat-box"><div className="stat-value">GH₵ {totalRevenue.toLocaleString()}</div><div className="stat-label">Revenue (Paid)</div></div>
        <div className="stat-box"><div className="stat-value">{orders.filter(o=>o.paymentStatus==='Pending').length}</div><div className="stat-label">Pending Payment</div></div>
        <div className="stat-box"><div className="stat-value" style={{color:debtors.length>0?'#ef4444':undefined}}>{debtors.length}</div><div className="stat-label">Fee Debtors</div></div>
      </div>

      <div className="ap-filters">
        <button className={`page-button${tab==='orders'?'':' ap-tab-inactive'}`} onClick={()=>setTab('orders')}>Orders</button>
        <button className={`page-button${tab==='debtors'?'':' ap-tab-inactive'}`} onClick={()=>setTab('debtors')}>Fee Debtors</button>
        {tab==='orders' && (
          <select value={payStatus} onChange={e=>setPayStatus(e.target.value)}>
            <option value="">All payment statuses</option>
            {['Pending','Paid','Failed','Refunded'].map(s=><option key={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading && <p className="ap-loading">Loading…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && tab === 'orders' && (
        <div className="table-container">
          <h2>Shop Orders</h2>
          <table>
            <thead>
              <tr><th>Buyer</th><th>Total</th><th>Payment</th><th>Order Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {orders.slice(0,100).map(o => (
                <tr key={o._id}>
                  <td><strong>{o.buyerName}</strong></td>
                  <td>GH₵ {o.total?.toFixed(2)}</td>
                  <td><span style={{color:PAY_COLOR[o.paymentStatus]||'#6b7280',fontWeight:600}}>{o.paymentStatus}</span></td>
                  <td>{o.orderStatus}</td>
                  <td>{new Date(o.placedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === 'debtors' && (
        <div className="table-container">
          <h2>Outstanding Fee Clearances</h2>
          <table>
            <thead>
              <tr><th>Description</th><th>Source</th><th>Status</th><th>Raised</th></tr>
            </thead>
            <tbody>
              {debtors.slice(0,100).map(d => (
                <tr key={d._id}>
                  <td>{d.description}</td>
                  <td style={{textTransform:'capitalize'}}>{d.source?.replace(/_/g,' ')}</td>
                  <td><span style={{color:'#ef4444',fontWeight:600,textTransform:'capitalize'}}>{d.status}</span></td>
                  <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {debtors.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No outstanding clearances</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
