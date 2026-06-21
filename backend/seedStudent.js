require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');

async function seedStudent() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Remove any existing test student so the script is re-runnable
  await Student.deleteOne({ username: 'Student_001' });

  const hashedPassword = await bcrypt.hash('Pass123', 10);

  const michael = new Student({
    // ── Credentials ──────────────────────────────────────
    username: 'Student_001',
    password: hashedPassword,
    studentId: 'STU20240001',
    email: 'michael.owusu@achimota.edu.gh',

    // ── Stage 1: Biometric ────────────────────────────────
    passportPhoto: '/media/avatars/michael_owusu.jpg',
    fingerprint: 'captured',

    // ── Stage 2: Personal Info ────────────────────────────
    firstName:    'Michael',
    middleName:   'Kwame',
    lastName:     'Owusu',
    dob:          '2007-03-15',
    gender:       'Male',
    hometown:     'Kumasi',
    placeOfBirth: 'Kumasi',
    nationality:  'Ghanaian',
    ethnicGroup:  'Akan',
    denomination: 'Christian',
    disability:   false,
    homeAddress:  '12 Osei Bonsu Street, Adum, Kumasi',
    poBox:        'P.O. Box KS 4421',

    // ── Stage 3: Guardian ─────────────────────────────────
    guardians: [
      {
        name:       'Emmanuel Owusu',
        relation:   'Father',
        address:    '12 Osei Bonsu Street, Adum, Kumasi',
        occupation: 'Civil Engineer',
        phone:      '+233 24 456 7890',
        email:      'e.owusu@gmail.com',
      },
      {
        name:       'Grace Owusu',
        relation:   'Mother',
        address:    '12 Osei Bonsu Street, Adum, Kumasi',
        occupation: 'Nurse',
        phone:      '+233 20 987 6543',
        email:      'grace.owusu@gmail.com',
      },
    ],

    // ── Stage 4: Examination Record ───────────────────────
    jhsIndex:               '1234567890',
    previousSchool:         'Kumasi Anglican JHS',
    previousSchoolLocation: 'Kumasi, Ashanti Region',
    beceResults: [
      { subject: 'English Language',      grade: 'A1' },
      { subject: 'Mathematics',           grade: 'A1' },
      { subject: 'Integrated Science',    grade: 'B2' },
      { subject: 'Social Studies',        grade: 'A1' },
      { subject: 'ICT',                   grade: 'A1' },
      { subject: 'French',                grade: 'B3' },
      { subject: 'Religious & Moral Ed.', grade: 'B2' },
      { subject: 'Basic Design & Tech.',  grade: 'A1' },
    ],

    // ── Stage 5: Programme ────────────────────────────────
    program: 'General Science',

    // ── Stage 6: Campus ───────────────────────────────────
    campus: 'Boarding',

    // ── Stage 7: Additional ───────────────────────────────
    records: [
      { title: 'Best Student', description: 'Awarded best student in Kumasi Anglican JHS for 2023/24 academic year.', year: '2024' },
      { title: 'Head Prefect', description: 'Served as Head Prefect for the 2023/24 academic year.', year: '2024' },
      { title: 'Regional Math Competition — 1st Place', description: 'Won first place in the Ashanti Regional Mathematics Competition.', year: '2023' },
    ],

    // ── Stage 8: Essay ────────────────────────────────────
    essayWhy: `Achimota School has long stood as a beacon of excellence and national pride in Ghana. From a young age I have admired the school's tradition of producing great leaders, scientists, and thinkers who go on to shape the country and the continent. Its motto, "Praepara te pro Victoria" — Prepare yourself for victory — resonates deeply with my personal values of diligence, perseverance, and purpose.

I chose Achimota School because of its exceptional Science programme, which is widely regarded as one of the best in the country. My passion for mathematics and the sciences has driven me since primary school, and I believe Achimota's qualified faculty, well-equipped laboratories, and rigorous academic culture will provide the environment I need to reach my full potential.

Beyond academics, I am inspired by the school's rich history of producing students who are not only intellectually sharp but also well-rounded citizens. The sports facilities, drama clubs, and prefectship system all speak to a holistic education that I deeply value. I am confident that Achimota School will challenge me, shape my character, and prepare me for the university and the career in medicine that I aspire to pursue.`,

    essayPersonality: `I am a curious, determined, and empathetic person. My friends and teachers often describe me as someone who leads quietly — not through loudness, but through consistency and reliability. As Head Prefect of my JHS, I learned that true leadership is about listening carefully, making fair decisions, and putting the needs of others first. That experience taught me more about myself than any single class.

I love mathematics not just as a school subject but as a language — it lets me describe the world in ways that are precise and beautiful. When I am not solving problems, I enjoy reading about scientific discoveries and following the careers of Ghanaian scientists who are making an impact globally. I also play football regularly and believe sport builds discipline and teamwork in ways that the classroom cannot replicate alone.

My greatest strength is my ability to stay calm under pressure. Whether it was leading a school project at the last minute or preparing for BECE, I learned to focus on what I can control and trust in the work I have already done. I bring that same calm and focus to every new challenge, and I am ready to bring it to Achimota.`,

    // ── Meta ─────────────────────────────────────────────
    isProspect: true,
  });

  await michael.save();

  console.log('✓ Michael Owusu created');
  console.log('  Username : Student_001');
  console.log('  Password : Pass123 (hashed in DB)');
  console.log('  StudentID: STU20240001');

  await mongoose.disconnect();
}

seedStudent().catch(err => { console.error(err); process.exit(1); });
