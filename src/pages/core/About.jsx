import React, { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { FiChevronDown, FiPhone, FiMail, FiClock, FiMusic } from 'react-icons/fi'
import { MdOutlineSchool } from 'react-icons/md'
import '../../styles/core/About.css'

const SERVICE_NUMBERS = [
  { name: 'School Counselor', number: '+233 30 123 4567', email: 'counselor@achimota.edu.gh', hours: 'Mon–Fri, 8am–5pm' },
  { name: 'Admin Office', number: '+233 30 123 4568', email: 'admin@achimota.edu.gh', hours: 'Mon–Fri, 7am–4pm' },
  { name: 'PTA Council', number: '+233 30 123 4569', email: 'pta@achimota.edu.gh', hours: 'Mon–Sat, 9am–3pm' },
]

const FAQS = [
  {
    question: 'How do I register as a new student?',
    answer: 'Prospective students can register through the student portal by clicking "Sign In As" on the homepage and selecting Student, then choosing the Register as New Student option.',
  },
  {
    question: 'How do I contact my child\'s teacher?',
    answer: 'Teachers can be reached through the Chat system available to registered users. You can also contact the Admin Office directly for urgent matters.',
  },
  {
    question: 'Where can I find the academic schedule?',
    answer: 'Registered students and teachers can access the Academic Schedule under the Academics section after signing in.',
  },
  {
    question: 'How does the PTA Shop work?',
    answer: 'The PTA Shop allows parents and students to purchase school items. Items can be paid for via Mobile Money (Momo) or Debit Card through the secure payment portal.',
  },
  {
    question: 'How are house assignments made?',
    answer: 'House assignments are managed by the school administration. Students can view their house details on their Student Profile page after logging in.',
  },
  {
    question: 'How do I access the school library?',
    answer: 'The school library is available to all registered users. You can browse books by category, and borrow or access digital copies through the Library section.',
  },
]

const HOUSES = [
  { name: 'House 1', color: '#e53e3e' },
  { name: 'House 2', color: '#dd6b20' },
  { name: 'House 3', color: '#d69e2e' },
  { name: 'House 4', color: '#38a169' },
  { name: 'House 5', color: '#319795' },
  { name: 'House 6', color: '#3182ce' },
  { name: 'House 7', color: '#553c9a' },
  { name: 'House 8', color: '#b83280' },
  { name: 'House 9', color: '#e53e3e' },
  { name: 'House 10', color: '#dd6b20' },
  { name: 'House 11', color: '#d69e2e' },
  { name: 'House 12', color: '#38a169' },
  { name: 'House 13', color: '#319795' },
  { name: 'House 14', color: '#3182ce' },
  { name: 'House 15', color: '#553c9a' },
  { name: 'House 16', color: '#b83280' },
  { name: 'House 17', color: '#e53e3e' },
  { name: 'House 18', color: '#dd6b20' },
]

const ANTHEM_LINES = [
  'Achimota, Achimota, we praise thee,',
  'School of learning, school of might,',
  'Lead us forward into the light,',
  'Achimota, Achimota, our pride.',
  '',
  'Through the years we\'ve grown together,',
  'Knowledge, wisdom, hand in hand,',
  'May our bonds last on forever,',
  'Achimota, our beloved land.',
]

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span>{question}</span>
        <FiChevronDown className={`faq-chevron ${open ? 'faq-chevron--open' : ''}`} />
      </button>
      <div className="faq-answer" aria-hidden={!open}>
        <p>{answer}</p>
      </div>
    </div>
  )
}

function ServiceCard({ name, number, email, hours }) {
  return (
    <div className="service-card">
      <div className="service-card__name">{name}</div>
      <div className="service-card__row">
        <FiPhone className="service-card__icon" />
        <span>{number}</span>
      </div>
      <div className="service-card__row">
        <FiMail className="service-card__icon" />
        <span>{email}</span>
      </div>
      <div className="service-card__row service-card__row--muted">
        <FiClock className="service-card__icon" />
        <span>{hours}</span>
      </div>
    </div>
  )
}

export default function About() {
  const { setSideMenu, setNotchText } = useOutletContext()
  const [anthemOpen, setAnthemOpen] = useState(false)
  const [housesOpen, setHousesOpen] = useState(false)
  const [scrollY,    setScrollY]    = useState(0)
  const pageRef = useRef(null)

  useEffect(() => {
    setNotchText('About')
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText])

  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const onScroll = () => setScrollY(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Banner shrinks from 40vh → ~8vh as user scrolls the first 300px
  const BANNER_MAX = 40   // vh
  const BANNER_MIN = 8    // vh
  const SHRINK_OVER = 300 // px of scroll to reach min
  const progress    = Math.min(scrollY / SHRINK_OVER, 1)
  const bannerVh    = BANNER_MAX - (BANNER_MAX - BANNER_MIN) * progress
  const bannerOpacity = 1 - progress * 0.35

  return (
    <div className="about-main">
      <div className="about-page" ref={pageRef}>

        {/* ── Banner image ── */}
        <div
          className="about-banner"
          style={{ height: `${bannerVh}vh`, opacity: bannerOpacity }}
        >
          <div className="about-banner__img-wrap">
            {/* Replace src with a real image URL when available */}
            <div className="about-banner__placeholder">
              <MdOutlineSchool size={56} />
              <span>Achimota School</span>
            </div>
          </div>
          <div className="about-banner__overlay">
            <h1 className="about-banner__title">Achimota School</h1>
            <p className="about-banner__sub">Excellence · Character · Service</p>
          </div>
        </div>

        {/* ── School Profile Hero ── */}
        <section className="about-hero">
          <div className="about-hero__badge">
            <MdOutlineSchool size={48} />
          </div>
          <div className="about-hero__text">
            <h1 className="about-hero__name">Achimota School</h1>
            <p className="about-hero__tagline">
              Excellence · Character · Service
            </p>
            <p className="about-hero__description">
              Founded in 1924, Achimota School is one of Ghana's most prestigious secondary schools,
              nurturing generations of leaders, scholars, and citizens committed to the development of Ghana and Africa.
            </p>
          </div>
        </section>

        {/* ── Info Strip ── */}
        <section className="about-info-strip">
          <div className="about-info-item">
            <span className="about-info-item__label">Founded</span>
            <span className="about-info-item__value">1924</span>
          </div>
          <div className="about-info-divider" />
          <div className="about-info-item">
            <span className="about-info-item__label">Location</span>
            <span className="about-info-item__value">Accra, Ghana</span>
          </div>
          <div className="about-info-divider" />
          <div className="about-info-item">
            <span className="about-info-item__label">Houses</span>
            <span className="about-info-item__value">18 Houses</span>
          </div>
          <div className="about-info-divider" />
          <div className="about-info-item">
            <span className="about-info-item__label">Chapels</span>
            <span className="about-info-item__value">Aggrey Chapel · Catholic Chapel</span>
          </div>
        </section>

        {/* ── Body grid ── */}
        <div className="about-body">

          {/* ── Left column ── */}
          <div className="about-col">

            {/* School Anthem */}
            <div className="about-card">
              <button
                className="about-card__toggle"
                onClick={() => setAnthemOpen(v => !v)}
                aria-expanded={anthemOpen}
              >
                <span className="about-card__toggle-label">
                  <FiMusic className="about-card__toggle-icon" />
                  School Anthem
                </span>
                <FiChevronDown className={`faq-chevron ${anthemOpen ? 'faq-chevron--open' : ''}`} />
              </button>
              <div className={`about-anthem-body ${anthemOpen ? 'about-anthem-body--open' : ''}`}>
                {ANTHEM_LINES.map((line, i) =>
                  line === '' ? <br key={i} /> : <p key={i} className="about-anthem-line">{line}</p>
                )}
              </div>
            </div>

            {/* Houses */}
            <div className="about-card">
              <button
                className="about-card__toggle"
                onClick={() => setHousesOpen(v => !v)}
                aria-expanded={housesOpen}
              >
                <span className="about-card__toggle-label">
                  <Icons.security className="about-card__toggle-icon" />
                  Houses <span className="about-card__toggle-badge">18</span>
                </span>
                <FiChevronDown className={`faq-chevron ${housesOpen ? 'faq-chevron--open' : ''}`} />
              </button>
              <div className={`about-houses-body ${housesOpen ? 'about-houses-body--open' : ''}`}>
                <div className="houses-grid">
                  {HOUSES.map((house, i) => (
                    <div key={i} className="house-chip">
                      <span className="house-chip__dot" style={{ background: house.color }} />
                      <span className="house-chip__name">{house.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="about-card">
              <h2 className="about-card__title">Frequently Asked Questions</h2>
              <div className="faq-list">
                {FAQS.map((faq, i) => (
                  <FaqItem key={i} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>

          </div>

          {/* ── Right column ── */}
          <div className="about-col">

            {/* Service Numbers */}
            <div className="about-card">
              <h2 className="about-card__title">Service Numbers</h2>
              <p className="about-card__subtitle">Reach us through any of the following contacts</p>
              <div className="service-list">
                {SERVICE_NUMBERS.map((s, i) => (
                  <ServiceCard key={i} {...s} />
                ))}
              </div>
            </div>

            {/* More Info / School Profile */}
            <div className="about-card">
              <h2 className="about-card__title">School Profile</h2>
              <div className="about-profile-grid">
                <div className="about-profile-row">
                  <span className="about-profile-label">School Name</span>
                  <span className="about-profile-value">Achimota School</span>
                </div>
                <div className="about-profile-row">
                  <span className="about-profile-label">Type</span>
                  <span className="about-profile-value">Public Boarding / Day</span>
                </div>
                <div className="about-profile-row">
                  <span className="about-profile-label">Motto</span>
                  <span className="about-profile-value">Ut Omnes Unum Sint</span>
                </div>
                <div className="about-profile-row">
                  <span className="about-profile-label">Headmaster</span>
                  <span className="about-profile-value">Mr. John Doe</span>
                </div>
                <div className="about-profile-row">
                  <span className="about-profile-label">P.O. Box</span>
                  <span className="about-profile-value">P.O. Box 73, Achimota, Accra</span>
                </div>
                <div className="about-profile-row">
                  <span className="about-profile-label">Website</span>
                  <span className="about-profile-value">www.achimota.edu.gh</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
