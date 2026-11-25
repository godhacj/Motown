import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiShoppingBag, FiAlertCircle, FiPlus, FiCheckCircle } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import usePortalTabs from '../../hooks/usePortalTabs'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button, Pill, Notice, Stats, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, TabPanel, Loading } from '../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../components/admin/adminUtils'
import StudentPicker from '../../components/admin/StudentPicker'
import '../../styles/PageContent.css'
import SectionNav from '../../components/admin/SectionNav'

const PAYMENT = ['Pending', 'Paid', 'Failed', 'Refunded']
const ORDER = ['Pending', 'Processing', 'Fulfilled', 'Cancelled']
const PAY_TONE = { Pending: 'warning', Paid: 'success', Failed: 'danger', Refunded: 'neutral' }
const ORDER_TONE = { Pending: 'warning', Processing: 'accent', Fulfilled: 'success', Cancelled: 'neutral' }
const cedi = (n) => `GH₵ ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Orders({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [pay, setPay] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (pay) params.set('paymentStatus', pay)
    if (status) params.set('orderStatus', status)
    apiFetch(`/api/admin/accounts/orders?${params}`)
      .then((d) => setOrders(d.orders || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify, pay, status])
  useEffect(load, [load])

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return orders.filter((o) => !n || [o.buyerName, o.buyerEmail, o.buyerPhone, o.reference].join(' ').toLowerCase().includes(n))
  }, [orders, q])

  const update = async (o, patch) => {
    setBusy(true)
    try {
      const saved = await apiFetch(`/api/admin/accounts/orders/${o._id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      setOrders((l) => l.map((x) => (x._id === saved._id ? saved : x)))
      setOpen((cur) => (cur && cur._id === saved._id ? saved : cur))
      notify('success', 'Order updated')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const paidTotal = orders.filter((o) => o.paymentStatus === 'Paid').reduce((n, o) => n + (o.total || 0), 0)
  const columns = [
    { key: 'buyer', label: 'Order', className: 'is-primary', render: (o) => <div className="ak-thumb-cell"><div><strong>{o.buyerName || 'Customer'}</strong><span>{o.reference || o._id.slice(-6)} · {o.items?.length || 0} item(s)</span></div></div> },
    { key: 'total', label: 'Total', render: (o) => cedi(o.total) },
    { key: 'paymentStatus', label: 'Payment', render: (o) => <Pill tone={PAY_TONE[o.paymentStatus]}>{o.paymentStatus}</Pill> },
    { key: 'orderStatus', label: 'Order', render: (o) => <Pill tone={ORDER_TONE[o.orderStatus]}>{o.orderStatus}</Pill> },
    { key: 'placedAt', label: 'Placed', render: (o) => formatDate(o.placedAt || o.createdAt) },
  ]

  return (
    <>
      <Stats items={[
        { label: 'Orders', value: orders.length },
        { label: 'Awaiting payment', value: orders.filter((o) => o.paymentStatus === 'Pending').length, tone: 'warning' },
        { label: 'To fulfil', value: orders.filter((o) => o.paymentStatus === 'Paid' && !['Fulfilled', 'Cancelled'].includes(o.orderStatus)).length },
        { label: 'Paid revenue', value: cedi(paidTotal), tone: 'success' },
      ]} />
      <section className="ak-panel">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Buyer, email, phone or reference…" />
          <select value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment status"><option value="">Any payment</option>{PAYMENT.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Order status"><option value="">Any status</option>{ORDER.map((s) => <option key={s}>{s}</option>)}</select>
        </Toolbar>
        {loading ? <Loading /> : <DataTable columns={columns} rows={visible} onRowClick={setOpen} empty="No orders" />}
      </section>

      {open && (
        <Modal title={`Order ${open.reference || open._id.slice(-6)}`} subtitle={`${open.buyerName} · ${formatDate(open.placedAt || open.createdAt)}`} width={620} onClose={() => setOpen(null)}>
          <ul className="ak-list">
            {(open.items || []).map((it, i) => (
              <li key={i}><div><strong>{it.productName}</strong><span>{it.qty} × {cedi(it.unitPrice)}</span></div><strong>{cedi(it.subtotal ?? it.qty * it.unitPrice)}</strong></li>
            ))}
          </ul>
          <div className="ak-head"><span className="ak-muted">{open.paymentMethod || '—'}</span><strong>Total {cedi(open.total)}</strong></div>
          <dl className="rk-kv">
            <dt>Email</dt><dd>{open.buyerEmail || '—'}</dd>
            <dt>Phone</dt><dd>{open.buyerPhone || '—'}</dd>
            <dt>Note</dt><dd>{open.deliveryNote || '—'}</dd>
          </dl>
          <div className="ak-form-grid">
            <Field label="Payment status"><select value={open.paymentStatus} disabled={busy} onChange={(e) => update(open, { paymentStatus: e.target.value })}>{PAYMENT.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Order status"><select value={open.orderStatus} disabled={busy} onChange={(e) => update(open, { orderStatus: e.target.value })}>{ORDER.map((s) => <option key={s}>{s}</option>)}</select></Field>
          </div>
        </Modal>
      )}
    </>
  )
}

function Debtors({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [status, setStatus] = useState('outstanding')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [raising, setRaising] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch(`/api/admin/accounts/debtors?status=${status}`)
      .then((d) => setItems(d.debtors || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify, status])
  useEffect(load, [load])

  const raise = async () => {
    if (!raising.student) return notify('error', 'Pick the student')
    if (!raising.description.trim()) return notify('error', 'Describe what is owed')
    setBusy(true)
    try {
      await apiFetch('/api/admin/accounts/clearance', { method: 'POST', body: JSON.stringify({ studentId: raising.student._id, description: raising.description }) })
      notify('success', `${raising.student.name} added to the debtors list`)
      setRaising(null)
      if (status === 'outstanding') load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/accounts/clearance/${confirm._id}`, { method: 'PATCH' })
      notify('success', 'Marked as paid')
      setConfirm(null)
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const name = (i) => (i.student ? `${i.student.firstName} ${i.student.lastName}` : 'Unknown student')
  const columns = [
    { key: 'student', label: 'Student', className: 'is-primary', render: (i) => <div className="ak-thumb-cell"><div><strong>{name(i)}</strong><span>{[i.student?.studentId, i.student?.classLevel].filter(Boolean).join(' · ')}</span></div></div> },
    { key: 'description', label: 'Owed', render: (i) => i.description },
    { key: 'date', label: status === 'cleared' ? 'Paid' : 'Raised', render: (i) => formatDate(status === 'cleared' ? i.clearedAt : i.createdAt) },
    { key: 'actions', label: '', className: 'is-right', render: (i) => status === 'outstanding' && <Button size="sm" variant="success" onClick={() => setConfirm(i)}><FiCheckCircle /> Paid</Button> },
  ]

  return (
    <section className="ak-panel">
      <Toolbar>
        <Tabs tabs={[{ id: 'outstanding', label: 'Outstanding' }, { id: 'cleared', label: 'Paid' }]} value={status} onChange={setStatus} />
        <span className="ak-spacer" />
        <Button onClick={() => setRaising({ student: null, description: '' })}><FiPlus /> Add debtor</Button>
      </Toolbar>
      <p className="ak-muted">Students on this list see a private notice and can't complete exit clearance until the item is marked paid.</p>
      {loading ? <Loading /> : <DataTable columns={columns} rows={items} empty={status === 'outstanding' ? 'No outstanding fees' : 'Nothing paid yet'} />}

      {raising && (
        <Modal title="Add a debtor" width={520} onClose={() => !busy && setRaising(null)}
          footer={<><Button variant="ghost" onClick={() => setRaising(null)} disabled={busy}>Cancel</Button><Button onClick={raise} disabled={busy}>{busy ? 'Saving…' : 'Add'}</Button></>}>
          <Field label="Student"><StudentPicker value={raising.student} onChange={(s) => setRaising((f) => ({ ...f, student: s }))} autoFocus /></Field>
          <Field label="What is owed" hint="Shown to the student, e.g. “Term 2 fees — GH₵ 450 outstanding”" wide>
            <textarea rows={3} value={raising.description} onChange={(e) => setRaising((f) => ({ ...f, description: e.target.value }))} />
          </Field>
        </Modal>
      )}
      {confirm && <ConfirmDialog title="Mark as paid?" message={`${name(confirm)}: “${confirm.description}”. Their notice will be removed.`} confirmLabel="Mark paid" busy={busy} onConfirm={clear} onCancel={() => setConfirm(null)} />}
    </section>
  )
}

export default function Accounts() {
  const session = useAdminPortal('Accounts', null)
  const [tab, , direction, sectionNav] = usePortalTabs('adminAccountsTab', [{ id: 'orders', label: 'Shop orders', icon: FiShoppingBag }, { id: 'debtors', label: 'Fee debtors', icon: FiAlertCircle }])
  const [notice, notify, clearNotice] = useNotice()
  if (!session) return null
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="ak-sr-only">Accounts</h1>
        <p>PTA shop orders and student fee clearance.</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      <TabPanel key={tab} direction={direction}>
        {tab === 'orders' ? <Orders notify={notify} /> : <Debtors notify={notify} />}
      </TabPanel>
      <SectionNav {...sectionNav} />
    </div>
  )
}
