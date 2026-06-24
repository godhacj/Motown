/**
 * aboutContent.js
 * Single source of truth for all About page content.
 * Used by seedAbout.js to push to MongoDB, and mirrored in
 * src/data/aboutContent.js as a frontend fallback.
 */

const aboutContent = {
  schoolName: 'Achimota School',
  founded:    1924,
  location:   'Accra, Ghana',
  motto:      'Ut Omnes Unum Sint',
  headmaster: 'Mr. John Doe',
  poBox:      'P.O. Box 73, Achimota, Accra',
  website:    'www.achimota.edu.gh',
  type:       'Public Boarding / Day',

  anthem: [
    'Achimota, Achimota, we praise thee,',
    'School of learning, school of might,',
    'Lead us forward into the light,',
    'Achimota, Achimota, our pride.',
    '',
    'Through the years we\'ve grown together,',
    'Knowledge, wisdom, hand in hand,',
    'May our bonds last on forever,',
    'Achimota, our beloved land.',
  ],

  houses: [
    { name: 'Aggrey',           color: '#1a56a4' },
    { name: 'Guggisberg',       color: '#2d7d46' },
    { name: 'Azikiwe',          color: '#c0392b' },
    { name: 'Nkrumah',          color: '#d35400' },
    { name: 'Aggrey B',         color: '#1a56a4' },
    { name: 'Cadbury',          color: '#8e44ad' },
    { name: 'Fraser',           color: '#b8860b' },
    { name: 'Kingsley',         color: '#16a085' },
    { name: 'Kwegyir',          color: '#2471a3' },
    { name: 'Lugard',           color: '#922b21' },
    { name: 'Mensah Sarbah',    color: '#1e8449' },
    { name: 'Millington',       color: '#6c3483' },
    { name: 'Nkrumah B',        color: '#d35400' },
    { name: 'Ofori Atta',       color: '#1a5276' },
    { name: 'Quartey-Papafio',  color: '#117a65' },
    { name: 'Ribeiro',          color: '#784212' },
    { name: 'Slater',           color: '#515a5a' },
    { name: 'Waddell',          color: '#1b4f72' },
  ],

  serviceContacts: [
    {
      service: 'School Counselor',
      phone:   '+233 30 123 4567',
      email:   'counselor@achimota.edu.gh',
      hours:   'Mon–Fri, 8am–5pm',
    },
    {
      service: 'Admin Office',
      phone:   '+233 30 123 4568',
      email:   'admin@achimota.edu.gh',
      hours:   'Mon–Fri, 7am–4pm',
    },
    {
      service: 'PTA Council',
      phone:   '+233 30 123 4569',
      email:   'pta@achimota.edu.gh',
      hours:   'Mon–Sat, 9am–3pm',
    },
  ],

  faqs: [
    {
      question: 'How do I register as a new student?',
      answer:   'Prospective students can register through the student portal by clicking "Sign In As" on the homepage and selecting Student, then choosing the Register as New Student option.',
    },
    {
      question: 'How do I contact my child\'s teacher?',
      answer:   'Teachers can be reached through the Chat system available to registered users. You can also contact the Admin Office directly for urgent matters.',
    },
    {
      question: 'Where can I find the academic schedule?',
      answer:   'Registered students and teachers can access the Academic Schedule under the Academics section after signing in.',
    },
    {
      question: 'How does the PTA Shop work?',
      answer:   'The PTA Shop allows parents and students to purchase school items. Items can be paid for via Mobile Money (Momo) or Debit Card through the secure payment portal.',
    },
    {
      question: 'How are house assignments made?',
      answer:   'House assignments are managed by the school administration. Students can view their house details on their Student Profile page after logging in.',
    },
    {
      question: 'How do I access the school library?',
      answer:   'The school library is available to all registered users. You can browse books by category, and borrow or access digital copies through the Library section.',
    },
  ],

  chaplaincy: [
    { name: 'Aggrey Chapel',   denomination: 'Protestant',     chaplain: '' },
    { name: 'Catholic Chapel', denomination: 'Catholic',       chaplain: '' },
  ],

  socialMedia: {
    facebook:  '',
    instagram: '',
    twitter:   '',
    youtube:   '',
  },
}

module.exports = aboutContent
