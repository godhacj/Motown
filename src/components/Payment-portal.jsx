import React, { useState, useRef, useEffect } from 'react'
import {
  FiX, FiCheck, FiChevronLeft, FiSmartphone, FiCreditCard,
  FiLock, FiAlertCircle, FiLoader
} from 'react-icons/fi'
import '../styles/components/Payment-portal.css'

const METHODS = [
  {
    id: 'momo',
    label: 'Mobile Money',
    icon: FiSmartphone,
    networks: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'],
    description: 'Pay instantly with your mobile wallet',
  },
  {
    id: 'card',
    label: 'Debit / Credit Card',
    icon: FiCreditCard,
    description: 'Visa, Mastercard — secured by 3D Secure',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function fmtExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

// ── Sub-screens ───────────────────────────────────────────────────────────────
function MethodSelect({ selected, onSelect, onNext }) {
  return (
    <div className="pp-screen">
      <p className="pp-subtitle">Choose how you want to pay</p>
      <div className="pp-methods">
        {METHODS.map(m => (
          <button
            key={m.id}
            className={`pp-method${selected === m.id ? ' pp-method--active' : ''}`}
            onClick={() => onSelect(m.id)}
          >
            <span className="pp-method__icon"><m.icon /></span>
            <span className="pp-method__body">
              <span className="pp-method__label">{m.label}</span>
              <span className="pp-method__desc">{m.description}</span>
            </span>
            <span className={`pp-method__radio${selected === m.id ? ' pp-method__radio--checked' : ''}`} />
          </button>
        ))}
      </div>
      <button className="pp-primary-btn" onClick={onNext} disabled={!selected}>
        Continue
      </button>
    </div>
  )
}

function MomoForm({ amount, onBack, onOtp }) {
  const [network, setNetwork] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const networks = METHODS[0].networks

  const valid = network && /^0[0-9]{9}$/.test(phone.replace(/\s/g, '')) && name.trim()

  const handleSubmit = () => {
    setError('')
    if (!valid) { setError('Please fill all fields correctly.'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); onOtp(phone) }, 1200)
  }

  return (
    <div className="pp-screen">
      <button className="pp-back-btn" onClick={onBack}><FiChevronLeft /> Back</button>
      <p className="pp-subtitle">Enter your MoMo details</p>

      <div className="pp-field-group">
        <label className="pp-label">Network</label>
        <div className="pp-network-pills">
          {networks.map(n => (
            <button
              key={n}
              className={`pp-network-pill${network === n ? ' pp-network-pill--active' : ''}`}
              onClick={() => setNetwork(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      <div className="pp-field-group">
        <label className="pp-label" htmlFor="momo-phone">Phone Number</label>
        <input
          id="momo-phone"
          className="pp-input"
          type="tel"
          placeholder="0XX XXX XXXX"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
          maxLength={13}
        />
      </div>

      <div className="pp-field-group">
        <label className="pp-label" htmlFor="momo-name">Account Name</label>
        <input
          id="momo-name"
          className="pp-input"
          type="text"
          placeholder="Name on MoMo account"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="pp-amount-summary">
        <span>Amount to pay</span>
        <span className="pp-amount-value">GH₵{amount.toFixed(2)}</span>
      </div>

      {error && <p className="pp-error"><FiAlertCircle /> {error}</p>}

      <button className="pp-primary-btn" onClick={handleSubmit} disabled={!valid || loading}>
        {loading ? <><FiLoader className="pp-spin" /> Sending prompt…</> : 'Pay Now'}
      </button>

      <p className="pp-secure-note"><FiLock /> Secured by Achimota PTA Pay</p>
    </div>
  )
}

function CardForm({ amount, onBack, onSuccess }) {
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const rawNumber = number.replace(/\s/g, '')
  const valid = rawNumber.length === 16 && name.trim() && expiry.length === 5 && cvv.length === 3

  const handleSubmit = () => {
    setError('')
    if (!valid) { setError('Please check your card details.'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); onSuccess() }, 1800)
  }

  return (
    <div className="pp-screen">
      <button className="pp-back-btn" onClick={onBack}><FiChevronLeft /> Back</button>
      <p className="pp-subtitle">Enter your card details</p>

      <div className="pp-card-brands">
        <span className="pp-card-brand pp-card-brand--visa">VISA</span>
        <span className="pp-card-brand pp-card-brand--mc">MC</span>
      </div>

      <div className="pp-field-group">
        <label className="pp-label" htmlFor="card-number">Card Number</label>
        <input
          id="card-number"
          className="pp-input pp-input--mono"
          type="text"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={number}
          onChange={e => setNumber(fmtCard(e.target.value))}
          maxLength={19}
        />
      </div>

      <div className="pp-field-group">
        <label className="pp-label" htmlFor="card-name">Cardholder Name</label>
        <input
          id="card-name"
          className="pp-input"
          type="text"
          placeholder="Name as on card"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="pp-row">
        <div className="pp-field-group">
          <label className="pp-label" htmlFor="card-expiry">Expiry</label>
          <input
            id="card-expiry"
            className="pp-input pp-input--mono"
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={expiry}
            onChange={e => setExpiry(fmtExpiry(e.target.value))}
            maxLength={5}
          />
        </div>
        <div className="pp-field-group">
          <label className="pp-label" htmlFor="card-cvv">CVV</label>
          <input
            id="card-cvv"
            className="pp-input pp-input--mono"
            type="password"
            inputMode="numeric"
            placeholder="•••"
            value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
            maxLength={3}
          />
        </div>
      </div>

      <div className="pp-amount-summary">
        <span>Amount to pay</span>
        <span className="pp-amount-value">GH₵{amount.toFixed(2)}</span>
      </div>

      {error && <p className="pp-error"><FiAlertCircle /> {error}</p>}

      <button className="pp-primary-btn" onClick={handleSubmit} disabled={!valid || loading}>
        {loading ? <><FiLoader className="pp-spin" /> Processing…</> : 'Pay Now'}
      </button>

      <p className="pp-secure-note"><FiLock /> 3D Secure · SSL Encrypted</p>
    </div>
  )
}

function OtpScreen({ phone, amount, onSuccess, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)
  const inputs = useRef([])

  const filled = otp.every(d => d !== '')

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) setOtp(text.split(''))
  }

  const handleVerify = () => {
    setError('')
    if (!filled) return
    setLoading(true)
    setTimeout(() => { setLoading(false); onSuccess() }, 1400)
  }

  const handleResend = () => {
    setResent(true)
    setOtp(['', '', '', '', '', ''])
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <div className="pp-screen">
      <button className="pp-back-btn" onClick={onBack}><FiChevronLeft /> Back</button>
      <div className="pp-otp-icon">
        <FiSmartphone />
      </div>
      <p className="pp-subtitle">Enter the 6-digit code sent to<br /><strong>{phone}</strong></p>

      <div className="pp-otp-boxes" onPaste={handlePaste}>
        {otp.map((d, i) => (
          <input
            key={i}
            ref={el => inputs.current[i] = el}
            className={`pp-otp-box${d ? ' pp-otp-box--filled' : ''}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
          />
        ))}
      </div>

      {error && <p className="pp-error"><FiAlertCircle /> {error}</p>}
      {resent && <p className="pp-success-note"><FiCheck /> Code resent!</p>}

      <div className="pp-amount-summary">
        <span>Authorising payment of</span>
        <span className="pp-amount-value">GH₵{amount.toFixed(2)}</span>
      </div>

      <button className="pp-primary-btn" onClick={handleVerify} disabled={!filled || loading}>
        {loading ? <><FiLoader className="pp-spin" /> Verifying…</> : 'Verify & Pay'}
      </button>

      <button className="pp-link-btn" onClick={handleResend} disabled={resent}>
        {resent ? 'Code sent!' : 'Resend code'}
      </button>
    </div>
  )
}

function SuccessScreen({ amount, method, onClose }) {
  return (
    <div className="pp-screen pp-screen--center">
      <div className="pp-success-ring">
        <FiCheck className="pp-success-check" />
      </div>
      <h3 className="pp-success-title">Payment Successful!</h3>
      <p className="pp-success-amount">GH₵{amount.toFixed(2)}</p>
      <p className="pp-success-detail">
        Paid via {METHODS.find(m => m.id === method)?.label || method}.
        <br />A receipt has been sent to your registered contact.
      </p>
      <div className="pp-success-ref">
        Ref: ACH-{Date.now().toString().slice(-8).toUpperCase()}
      </div>
      <button className="pp-primary-btn pp-primary-btn--success" onClick={onClose}>
        Done
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PaymentPortal({ amount = 0, onClose, onSuccess }) {
  const [step, setStep] = useState('method')   // method | momo | card | otp | success
  const [method, setMethod] = useState('')
  const [otpPhone, setOtpPhone] = useState('')

  const handleMethodNext = () => {
    if (method === 'momo') setStep('momo')
    else if (method === 'card') setStep('card')
  }

  const handleMomoOtp = (phone) => {
    setOtpPhone(phone)
    setStep('otp')
  }

  const handleSuccess = () => {
    setStep('success')
    onSuccess?.()
  }

  const stepTitles = {
    method: 'Payment',
    momo: 'Mobile Money',
    card: 'Card Payment',
    otp: 'Verify Code',
    success: 'Payment',
  }

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-dialog" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="pp-header">
          <h2 className="pp-title">{stepTitles[step]}</h2>
          {step !== 'success' && (
            <button className="pp-close-btn" onClick={onClose} aria-label="Close">
              <FiX />
            </button>
          )}
        </div>

        {/* Step indicator */}
        {step !== 'success' && (
          <div className="pp-steps">
            {['method', 'details', 'verify'].map((s, i) => {
              const active = (s === 'method' && step === 'method') ||
                             (s === 'details' && (step === 'momo' || step === 'card')) ||
                             (s === 'verify' && step === 'otp')
              const done = (i === 0 && step !== 'method') ||
                           (i === 1 && step === 'otp')
              return (
                <React.Fragment key={s}>
                  <div className={`pp-step${active ? ' pp-step--active' : ''}${done ? ' pp-step--done' : ''}`}>
                    <span className="pp-step__dot">{done ? <FiCheck /> : i + 1}</span>
                    <span className="pp-step__label">{['Method', 'Details', 'Verify'][i]}</span>
                  </div>
                  {i < 2 && <div className={`pp-step-line${done ? ' pp-step-line--done' : ''}`} />}
                </React.Fragment>
              )
            })}
          </div>
        )}

        {/* Screens */}
        {step === 'method' && (
          <MethodSelect selected={method} onSelect={setMethod} onNext={handleMethodNext} />
        )}
        {step === 'momo' && (
          <MomoForm amount={amount} onBack={() => setStep('method')} onOtp={handleMomoOtp} />
        )}
        {step === 'card' && (
          <CardForm amount={amount} onBack={() => setStep('method')} onSuccess={handleSuccess} />
        )}
        {step === 'otp' && (
          <OtpScreen phone={otpPhone} amount={amount} onSuccess={handleSuccess} onBack={() => setStep('momo')} />
        )}
        {step === 'success' && (
          <SuccessScreen amount={amount} method={method} onClose={onClose} />
        )}
      </div>
    </div>
  )
}
