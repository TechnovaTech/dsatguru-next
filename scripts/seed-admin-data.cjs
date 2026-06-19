/* Non-destructive admin demo seeder.
 * Everything inserted is tagged { seeded: true } so re-running wipes only seeded
 * demo data and never touches your real admin user / real courses. */
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'
const loose = (name) => mongoose.models[name] || mongoose.model(name, new mongoose.Schema({}, { strict: false, timestamps: true, collection: name }))

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const daysFromNow = (d) => new Date(Date.now() + d * 86400000)

;(async () => {
  await mongoose.connect(uri)
  console.log('Connected:', uri)

  // collection-name models (match Mongoose default pluralization)
  const Users = loose('users')
  const Courses = loose('courses')
  const Questions = loose('questions')
  const TestSessions = loose('testsessions')
  const Payments = loose('payments')
  const Enrollments = loose('courseenrollments')
  const StudyPlans = loose('studyplans')
  const ErrorLogs = loose('errorlogs')
  const Comparisons = loose('comparisons')
  const ContactMessages = loose('contactmessages')
  const Flagged = loose('flaggedquestions')
  const Announcements = loose('announcements')

  // ---- wipe only previously-seeded demo data ----
  for (const M of [Users, Questions, TestSessions, Payments, Enrollments, StudyPlans, ErrorLogs, ContactMessages, Flagged, Announcements]) {
    await M.deleteMany({ seeded: true })
  }
  await Courses.deleteMany({ seeded: true }) // only seeded question-bank, not your real courses
  console.log('Cleared previous seeded demo data')

  const studentPass = await bcrypt.hash('student123', 12)
  const tutorPass = await bcrypt.hash('tutor123', 12)

  // ---- Tutors + TutorAdmin ----
  const tutorDocs = await Users.insertMany([
    { name: 'Sarah Mentor', email: 'sarah.tutor@dsatguru.com', password: tutorPass, role: 'Tutor', isActive: true, seeded: true },
    { name: 'David Coach', email: 'david.tutor@dsatguru.com', password: tutorPass, role: 'Tutor', isActive: true, seeded: true },
    { name: 'Priya Lead', email: 'priya.admin@dsatguru.com', password: tutorPass, role: 'TutorAdmin', isActive: true, seeded: true },
  ])
  const tutorIds = tutorDocs.map((t) => t._id)

  // ---- Students ----
  const firstNames = ['Aarav', 'Mia', 'Liam', 'Sofia', 'Noah', 'Emma', 'Kabir', 'Olivia']
  const notes = ['Strong in algebra, needs RW pacing', 'Improving steadily', 'Careless errors in math', 'Great vocab, weak geometry', 'Needs more mock tests', 'On track for 1500+']
  const studentDocs = []
  for (let i = 0; i < firstNames.length; i++) {
    studentDocs.push({
      name: `${firstNames[i]} ${rand(['Sharma', 'Patel', 'Khan', 'Reddy', 'Mehta', 'Shah'])}`,
      email: `student${i + 1}@dsatguru.com`,
      password: studentPass,
      role: 'Student',
      isActive: true,
      phone: `98${rint(10000000, 99999999)}`,
      targetScore: rand([1400, 1450, 1480, 1500, 1520, 1550]),
      targetExamDate: daysFromNow(rint(20, 120)),
      tutorNotes: rand(notes),
      assignedTutors: [rand(tutorIds)],
      totalDsatAttempts: rint(1, 8),
      seeded: true,
      createdAt: daysFromNow(-rint(10, 90)),
    })
  }
  const students = await Users.insertMany(studentDocs)
  const studentIds = students.map((s) => s._id)
  console.log(`Users: +${tutorDocs.length} tutors, +${students.length} students`)

  // ---- Question Bank (course type) ----
  const qbank = await Courses.create({
    title: 'DSAT Master Question Bank',
    description: '4,000+ adaptive Digital SAT questions across Math and Reading & Writing.',
    type: 'question_bank',
    questionBankType: 'Mathematics',
    price: 49,
    discountedPrice: 20,
    discountPercentage: 59,
    seeded: true,
  })

  // ---- Questions ----
  const mathSkills = ['Algebra', 'Geometry', 'Advanced Math', 'Problem Solving & Data']
  const rwSkills = ['Grammar', 'Vocabulary in Context', 'Reading Comprehension', 'Rhetoric']
  const qDocs = []
  for (let i = 0; i < 24; i++) {
    const isMath = i % 2 === 0
    qDocs.push({
      questionId: `SEEDQ-${Date.now()}-${i}`,
      title: `${isMath ? 'Math' : 'R&W'} Practice Q${i + 1}`,
      content: isMath
        ? `If 3x + 7 = 22, what is the value of x? (Question #${i + 1})`
        : `Select the choice that best maintains the tone of the passage. (Question #${i + 1})`,
      subject: isMath ? 'Math' : 'Reading and Writing',
      domain: isMath ? 'Math' : 'Reading and Writing',
      skill: isMath ? rand(mathSkills) : rand(rwSkills),
      difficulty: rand(['Easy', 'Medium', 'Hard']),
      type: 'MultipleChoice',
      testType: rand(['Base', 'Adaptive']),
      correctAnswer: rand(['A', 'B', 'C', 'D']),
      options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
      explanation: 'Detailed step-by-step explanation goes here.',
      points: 1,
      isActive: true,
      questionBankId: qbank._id,
      createdBy: rand(tutorIds),
      seeded: true,
    })
  }
  const questions = await Questions.insertMany(qDocs)
  const qIds = questions.map((q) => q._id)
  console.log(`Question bank + ${questions.length} questions`)

  // ---- Enrollments + Payments ----
  const realCourses = await Courses.find({ type: { $ne: 'question_bank' } }).lean()
  let enrollCount = 0
  let payCount = 0
  let revenue = 0
  for (const sid of studentIds) {
    const course = rand(realCourses.length ? realCourses : [qbank])
    const enr = await Enrollments.create({
      userId: sid,
      courseId: course._id,
      enrolledAt: daysFromNow(-rint(5, 60)),
      accessType: 'lifetime',
      seeded: true,
    })
    enrollCount++
    const amount = course.discountedPrice || course.price || 500
    await Payments.create({
      userId: sid,
      enrollmentId: enr._id,
      amount,
      currency: 'USD',
      paymentGateway: 'stripe',
      paymentIntentId: `pi_seed_${enr._id}`,
      status: 'Succeeded',
      receiptUrl: 'https://example.com/receipt',
      seeded: true,
    })
    payCount++
    revenue += amount
  }
  console.log(`Enrollments: ${enrollCount}, Payments: ${payCount} (revenue $${revenue})`)

  // ---- Test sessions (completed) ----
  let sessCount = 0
  for (const sid of studentIds) {
    const n = rint(2, 4)
    for (let s = 0; s < n; s++) {
      const total = rint(15, 27)
      const correct = rint(8, total)
      const subject = rand(['Math', 'Reading and Writing'])
      const responses = []
      for (let r = 0; r < total; r++) {
        responses.push({
          questionId: rand(qIds),
          selectedAnswer: rand(['A', 'B', 'C', 'D']),
          isCorrect: r < correct,
          timeSpent: rint(20, 90),
          answeredAt: new Date(),
        })
      }
      await TestSessions.create({
        userId: sid,
        questionBankId: qbank._id,
        subject,
        sessionType: rand(['Practice', 'Mock', 'Adaptive']),
        status: 'Completed',
        state: 'COMPLETED',
        startTime: daysFromNow(-rint(0, 20)),
        endTime: new Date(),
        completedAt: new Date(),
        totalQuestions: total,
        answeredQuestions: total,
        correctAnswers: correct,
        score: Math.round((correct / total) * 1600),
        mathScore: rint(600, 800),
        rwScore: rint(600, 800),
        totalScore: rint(1200, 1560),
        timeSpent: rint(1200, 3600),
        responses,
        analysisSubmitted: Math.random() > 0.5,
        seeded: true,
      })
      sessCount++
    }
  }
  console.log(`Test sessions: ${sessCount}`)

  // ---- Study plans ----
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 0; i < studentIds.length; i++) {
    const s = students[i]
    await StudyPlans.create({
      userId: s._id,
      studentName: s.name,
      startDate: daysFromNow(-30),
      examDate: s.targetExamDate || daysFromNow(60),
      currentScore: rint(1100, 1350),
      targetScore: s.targetScore || 1500,
      weakTopics: [rand(mathSkills), rand(rwSkills)],
      dailyPlan: [
        { date: today, topic: rand(mathSkills), questionCount: rint(15, 30), difficultyMix: '40% E / 40% M / 20% H' },
        { date: daysFromNow(1), topic: rand(rwSkills), questionCount: 20, difficultyMix: '50% M / 50% H' },
      ],
      seeded: true,
    })
  }
  console.log(`Study plans: ${studentIds.length}`)

  // ---- Error logs ----
  let errCount = 0
  for (const sid of studentIds) {
    const n = rint(2, 6)
    for (let e = 0; e < n; e++) {
      await ErrorLogs.create({
        userId: sid,
        day: rint(1, 30),
        date: new Date().toISOString().slice(0, 10),
        section: rand(['Math', 'Reading & Writing']),
        topic: rand([...mathSkills, ...rwSkills]),
        questionDesc: 'Misread the question stem',
        whyWrong: 'Calculation slip / careless error',
        correctRule: 'Re-check units and re-read the prompt',
        difficulty: rand(['E', 'M', 'H']),
        redoResult: rand(['✓', '✗', '']),
        seeded: true,
      })
      errCount++
    }
  }
  console.log(`Error logs: ${errCount}`)

  // ---- Contact messages ----
  await ContactMessages.insertMany([
    { name: 'Rohan Gupta', email: 'rohan@example.com', phone: '9812345678', subject: 'Course inquiry', message: 'Is the bootcamp suitable for a beginner?', sourcePage: 'Contact Us', seeded: true },
    { name: 'Lily Chen', email: 'lily@example.com', phone: '9876543210', subject: 'Pricing', message: 'Do you offer scholarships?', sourcePage: 'Contact Us', seeded: true },
    { name: 'Omar F', email: 'omar@example.com', phone: '9090909090', subject: 'Demo test', message: 'The demo test was great — how do I enroll?', sourcePage: 'Contact Us', seeded: true },
  ])
  console.log('Contact messages: 3')

  // ---- Flagged questions ----
  await Flagged.insertMany(
    qIds.slice(0, 3).map((qid, i) => ({
      questionId: qid,
      userId: rand(studentIds),
      reason: rand(['Answer seems wrong', 'Typo in question', 'Image not loading']),
      status: rand(['pending', 'resolved']),
      note: 'Reported by student during practice.',
      seeded: true,
    }))
  )
  console.log('Flagged questions: 3')

  // ---- Announcements ----
  await Announcements.insertMany([
    { title: 'New Mock Test Released', body: 'Full-length Mock Test #12 is now live in your dashboard.', audience: 'all', isActive: true, seeded: true },
    { title: 'Holiday Schedule', body: 'Live classes paused on public holidays — recordings available.', audience: 'all', isActive: true, seeded: true },
  ])
  console.log('Announcements: 2')

  // ---- Comparison (for /admin/comparison + public) ----
  await Comparisons.deleteMany({})
  await Comparisons.create({
    title: 'Compare DSATGURU vs. Other Prep Services',
    subtitle: '',
    description: 'DSATGURU helps students improve their SAT scores with high-quality courses at a lower cost.',
    features: ['Price', 'Time of online access', 'Live Classes', '25+ Multistage Adaptive Practice Tests', 'Content Videos with practice Quizzes', 'Video and Text Explanation of all Questions', 'Increase Score Guarantee', 'Study Plan (Weekly, Monthly)', 'Free Trial', 'Approximate Score Predictor', 'Support 24/7'],
    providers: [
      { name: 'DSATGURU', highlight: true, values: ['$20/month', '1 year', true, true, true, true, '+200', true, true, true, true] },
      { name: 'KAPLAN', highlight: false, values: ['$199', '6 months', false, false, false, false, '+1', false, false, false, false] },
      { name: 'PRINCETON', highlight: false, values: ['$299', '12 months', false, false, false, false, '+160', false, false, false, false] },
      { name: 'PrepScholar', highlight: false, values: ['$397', '12 months', false, false, false, false, false, false, false, false, false] },
      { name: 'Testive', highlight: false, values: ['$1596', '4 months', false, false, false, false, false, false, false, false, false] },
    ],
    isActive: true,
    seeded: true,
  })
  console.log('Comparison: seeded')

  // ---- summary ----
  console.log('\n===== TOTALS =====')
  for (const [n, M] of [['users', Users], ['courses', Courses], ['questions', Questions], ['testsessions', TestSessions], ['payments', Payments], ['courseenrollments', Enrollments], ['studyplans', StudyPlans], ['errorlogs', ErrorLogs], ['contactmessages', ContactMessages], ['flaggedquestions', Flagged], ['announcements', Announcements], ['comparisons', Comparisons]]) {
    console.log(`${n}: ${await M.countDocuments()}`)
  }

  await mongoose.disconnect()
  console.log('\nDone. Student login: student1@dsatguru.com .. student8@dsatguru.com / student123')
  process.exit(0)
})().catch((e) => { console.error('SEED ERROR:', e); process.exit(1) })
