import React, { useState, useEffect } from 'react'
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import {
  FiChevronLeft, FiShoppingBag, FiTrash2, FiUser,
  FiMapPin, FiPhone, FiMail, FiChevronDown
} from 'react-icons/fi'
import PaymentPortal from '../../components/Payment-portal'
import '../../styles/core/Checkout.css'

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo',
  'Savannah', 'North East', 'Bono East', 'Ahafo', 'Western North', 'Oti',
]

const DELIVERY_OPTIONS = [
  { id: 'school', label: 'School Pickup', description: 'Collect from the PTA Office on campus', price: 0 },
  { id: 'standard', label: 'Standard Delivery', description: '3–5 business days', price: 15 },
  { id: 'express', label: 'Express Delivery', description: 'Next business day', price: 35 },
]

function OrderLine({ item, onRemove }) {
  return (
    <div className="co-order-line">
      <img src={item.image} alt={item.name} className="co-order-line__img" />
      <div className="co-order-line__info">
        <span className="co-order-line__name">{item.name}</span>
        <span className="co-order-line__qty">Qty: {item.qty}</span>
      </div>
      <div className="co-order-line__right">
        <span className="co-order-line__price">GH₵{(item.price * item.qty).toFixed(2)}</span>
        {onRemove && (
          <button className="co-order-line__remove" onClick={() => onRemove(item.id)} aria-label="Remove">
            <FiTrash2 />
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, id, error, children }) {
  return (
    <div className={`co-field${error ? ' co-field--error' : ''}`}>
      <label className="co-label" htmlFor={id}>{label}</label>
      {children}
      {error && <span className="co-field__error">{error}</span>}
    </div>
  )
}

export default function Checkout() {
  const { setSideMenu, setNotchText, setSearchConfig } = useOutletContext()
  const location = useLocation()
  const navigate = useNavigate()

  const [cart, setCart] = useState(location.state?.cart || [])
  const [delivery, setDelivery] = useState('school')
  const [showPayment, setShowPayment] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', region: '', notes: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setNotchText('Checkout')
    setSearchConfig({ visible: false })
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',   icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop',  icon: Icons.shopping },
      { title: 'Map',      to: '/map',       icon: Icons.map },
      { title: 'Page',     to: '/page',      icon: Icons.page },
      { title: 'About',    to: '/about',     icon: Icons.about },
      { title: 'Settings', to: '/settings',  icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText, setSearchConfig])

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }))
  }

  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === delivery)
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const deliveryFee = selectedDelivery?.price ?? 0
  const total = subtotal + deliveryFee
  const itemCount = cart.reduce((s, i) => s + i.qty, 0)

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!/^0[0-9]{9}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Ghana phone number'
    if (delivery !== 'school') {
      if (!form.address.trim()) e.address = 'Required'
      if (!form.city.trim()) e.city = 'Required'
      if (!form.region) e.region = 'Required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleProceed = () => {
    if (cart.length === 0) return
    if (!validate()) return
    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    setOrderPlaced(true)
  }

  if (orderPlaced) {
    return (
      <div className="co-main">
        <div className="co-scroll">
          <div className="co-success-page">
            <div className="co-success-ring">
              <FiShoppingBag />
            </div>
            <h2 className="co-success-title">Order Confirmed!</h2>
            <p className="co-success-detail">
              Thank you, {form.firstName}. Your order of <strong>{itemCount} item{itemCount !== 1 ? 's' : ''}</strong> has been placed.
              {delivery === 'school'
                ? ' You can collect it from the PTA Office during school hours.'
                : ' It will be delivered to your address within the selected timeframe.'}
            </p>
            <div className="co-success-ref">
              Order ref: ACH-{Date.now().toString().slice(-8).toUpperCase()}
            </div>
            <button className="co-primary-btn" onClick={() => navigate('/pta-shop')}>
              Back to Shop
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="co-main">
      <div className="co-scroll">
        <div className="co-page">

          {/* ── Back nav ── */}
          <button className="co-back-btn" onClick={() => navigate(-1)}>
            <FiChevronLeft /> Back to Shop
          </button>

          <h1 className="co-page-title">Checkout</h1>

          <div className="co-layout">

            {/* ── Left: form ── */}
            <div className="co-form-col">

              {/* Contact details */}
              <section className="co-card">
                <h2 className="co-card__title">
                  <FiUser className="co-card__title-icon" />
                  Contact Details
                </h2>
                <div className="co-grid-2">
                  <Field label="First Name" id="firstName" error={errors.firstName}>
                    <input id="firstName" className="co-input" type="text" placeholder="Kwame"
                      value={form.firstName} onChange={set('firstName')} />
                  </Field>
                  <Field label="Last Name" id="lastName" error={errors.lastName}>
                    <input id="lastName" className="co-input" type="text" placeholder="Mensah"
                      value={form.lastName} onChange={set('lastName')} />
                  </Field>
                </div>
                <Field label="Email Address" id="email" error={errors.email}>
                  <div className="co-input-icon-wrap">
                    <FiMail className="co-input-icon" />
                    <input id="email" className="co-input co-input--icon" type="email"
                      placeholder="you@example.com" value={form.email} onChange={set('email')} />
                  </div>
                </Field>
                <Field label="Phone Number" id="phone" error={errors.phone}>
                  <div className="co-input-icon-wrap">
                    <FiPhone className="co-input-icon" />
                    <input id="phone" className="co-input co-input--icon" type="tel"
                      placeholder="0XX XXX XXXX" value={form.phone} onChange={set('phone')} />
                  </div>
                </Field>
              </section>

              {/* Delivery method */}
              <section className="co-card">
                <h2 className="co-card__title">
                  <FiMapPin className="co-card__title-icon" />
                  Delivery Method
                </h2>
                <div className="co-delivery-options">
                  {DELIVERY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      className={`co-delivery-opt${delivery === opt.id ? ' co-delivery-opt--active' : ''}`}
                      onClick={() => setDelivery(opt.id)}
                    >
                      <span className={`co-delivery-opt__radio${delivery === opt.id ? ' co-delivery-opt__radio--on' : ''}`} />
                      <span className="co-delivery-opt__body">
                        <span className="co-delivery-opt__label">{opt.label}</span>
                        <span className="co-delivery-opt__desc">{opt.description}</span>
                      </span>
                      <span className="co-delivery-opt__price">
                        {opt.price === 0 ? 'Free' : `GH₵${opt.price.toFixed(2)}`}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Delivery address — only when not school pickup */}
              {delivery !== 'school' && (
                <section className="co-card">
                  <h2 className="co-card__title">
                    <FiMapPin className="co-card__title-icon" />
                    Delivery Address
                  </h2>
                  <Field label="Street / House Address" id="address" error={errors.address}>
                    <input id="address" className="co-input" type="text"
                      placeholder="House No., Street, Area" value={form.address} onChange={set('address')} />
                  </Field>
                  <div className="co-grid-2">
                    <Field label="City / Town" id="city" error={errors.city}>
                      <input id="city" className="co-input" type="text"
                        placeholder="Accra" value={form.city} onChange={set('city')} />
                    </Field>
                    <Field label="Region" id="region" error={errors.region}>
                      <div className="co-select-wrap">
                        <select id="region" className="co-select" value={form.region} onChange={set('region')}>
                          <option value="">Select region</option>
                          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <FiChevronDown className="co-select-icon" />
                      </div>
                    </Field>
                  </div>
                  <Field label="Delivery Notes (optional)" id="notes">
                    <textarea id="notes" className="co-input co-textarea"
                      placeholder="Landmarks, gate colour, instructions for rider…"
                      value={form.notes} onChange={set('notes')} rows={3} />
                  </Field>
                </section>
              )}
            </div>

            {/* ── Right: order summary ── */}
            <aside className="co-summary-col">
              <div className="co-card co-summary-card">
                <h2 className="co-card__title">
                  <FiShoppingBag className="co-card__title-icon" />
                  Order Summary
                  <span className="co-summary-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                </h2>

                <div className="co-order-lines">
                  {cart.length === 0 ? (
                    <p className="co-empty-cart">Your cart is empty.</p>
                  ) : (
                    cart.map(item => (
                      <OrderLine key={item.id} item={item} onRemove={cart.length > 1 ? removeItem : null} />
                    ))
                  )}
                </div>

                <div className="co-totals">
                  <div className="co-total-row">
                    <span>Subtotal</span>
                    <span>GH₵{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="co-total-row">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? 'Free' : `GH₵${deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <div className="co-total-row co-total-row--grand">
                    <span>Total</span>
                    <span>GH₵{total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className="co-primary-btn"
                  onClick={handleProceed}
                  disabled={cart.length === 0}
                >
                  Pay GH₵{total.toFixed(2)}
                </button>

                <p className="co-secure-note">
                  <FiShoppingBag /> Secured by Achimota PTA Pay
                </p>
              </div>
            </aside>

          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentPortal
          amount={total}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
