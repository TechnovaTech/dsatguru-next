const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')

const start = c.indexOf('8-weeks-digital-sat-study-plan') - 20
const end = c.indexOf('digital-sat-vs-paper-sat') - 20

const newBlock = `  {
    slug: '8-weeks-digital-sat-study-plan',
    title: '8-Week Digital SAT Study Plan for Busy Students',
    metaTitle: 'Easy 8-Week Digital SAT Study Plan for Busy Students',
    metaDescription:
      'Follow this simple 8-week Digital SAT study plan for busy students. Manage your time better, stay consistent, and improve your SAT score with simple tips.',
    category: 'Study Plans',
    readingTime: '10 min read',
    date: 'Jan 12, 2026',
    author: 'DSATGURU Academic Team',
    image: '/b5.png',
    imageAlt: 'Busy student following a Digital SAT study plan with laptop and notes',
    badgeColor: 'bg-blue-100 text-blue-700',
    thumbnailTone: 'from-blue-500 via-sky-500 to-cyan-500',
    summary:
      'Follow this simple 8-week Digital SAT study plan for busy students. Manage your time better, stay consistent, and improve your SAT score with simple tips.',
    heroText:
      'If you are a busy student, finding time to prepare for the Digital SAT can feel like a big challenge. You may have school, homework, coaching, or other activities. But the good news is - you do not need long study hours every day. You just need a smart and simple plan. In this blog, you will get an easy 8-week study plan that you can follow even with a busy schedule.',
    sections: [
      {
        heading: 'Why You Need a Study Plan',
        body: 'Without a plan, students often study randomly, skip important topics, and feel confused and stressed. A good plan helps you:',
        bullets: [
          'Use your time wisely',
          'Stay focused',
          'Improve step by step',
        ],
      },
      {
        heading: 'How Much Time Do You Need Daily?',
        body: 'You do not need 5-6 hours daily. Just 1-2 hours per day is enough if you study properly. Consistency is more important than long hours.',
        bullets: [
          'Weekdays: 1-1.5 hours',
          'Weekends: 2-3 hours',
        ],
      },
      {
        heading: 'Week 1: Understand the Exam + Basics',
        body: 'Goal: Know the exam pattern and your current level. Do not worry about your score - just understand where you stand.',
        bullets: [
          'Learn Digital SAT format (Reading + Math)',
          'Take one full-length practice test',
          'Check your score and mistakes',
          'Identify weak and strong areas',
        ],
      },
      {
        heading: 'Week 2: Build Strong Basics',
        body: 'Goal: Improve basic concepts. Focus on accuracy over speed and clear your concepts.',
        bullets: [
          'Revise grammar rules (Reading section)',
          'Practice basic math topics',
          'Learn common question types',
        ],
      },
      {
        heading: 'Week 3: Practice Reading Skills',
        body: 'Goal: Improve reading understanding. Read carefully and do not rush.',
        bullets: [
          'Practice short passages daily',
          'Focus on main idea questions',
          'Learn to eliminate wrong options',
        ],
      },
      {
        heading: 'Week 4: Improve Math Skills',
        body: 'Goal: Get better at math problem solving. Focus on understanding steps and avoid silly mistakes.',
        bullets: [
          'Practice algebra, percentages, ratios',
          'Solve 10-15 questions daily',
          'Learn shortcuts and tricks',
        ],
      },
      {
        heading: 'Week 5: Mixed Practice + Time Management',
        body: 'Goal: Handle both sections together. Focus on managing time and improving speed slowly.',
        bullets: [
          'Practice Reading + Math daily',
          'Start timing yourself',
          'Take one practice test',
        ],
      },
      {
        heading: 'Week 6: Identify and Fix Mistakes',
        body: 'Goal: Improve weak areas. Learn from mistakes and do not repeat errors.',
        bullets: [
          'Review all mistakes from tests',
          'Practice weak topics again',
          'Take another full-length test',
        ],
      },
      {
        heading: 'Week 7: Full Practice + Confidence Building',
        body: 'Goal: Feel confident before exam. Stay calm and build confidence.',
        bullets: [
          'Take 2 full-length practice tests',
          'Practice under real exam timing',
          'Focus on accuracy',
        ],
      },
      {
        heading: 'Week 8: Final Revision + Light Practice',
        body: 'Goal: Be ready for exam day. Stay relaxed and sleep well.',
        bullets: [
          'Revise important formulas and rules',
          'Do light practice only',
          'Avoid learning new topics',
        ],
      },
      {
        heading: 'Sample Daily Study Schedule for Busy Students',
        body: 'Here is a simple daily routine you can follow. This balanced routine helps you cover both sections without feeling overwhelmed.',
        bullets: [
          'Weekdays (1-1.5 hours): 30 min Reading & Writing + 30 min Math + 15 min review mistakes',
          'Weekends (2-3 hours): Take a practice test or solve mixed questions, then review answers carefully',
        ],
      },
      {
        heading: '1. Study at the Same Time Every Day',
        body: 'Studying at a fixed time helps you stay regular and focused.',
        bullets: [
          'Study at the same time every day',
          'Choose a time like after school or evening',
          'Follow the same routine daily',
          'Make it a habit like eating or sleeping',
        ],
      },
      {
        heading: '2. Avoid Distractions While Studying',
        body: 'Distractions can waste a lot of your time. When you sit to study:',
        bullets: [
          'Keep your phone away',
          'Turn off notifications',
          'Do not open social media',
        ],
      },
      {
        heading: '3. Set Small Weekly Goals',
        body: 'Do not try to study everything at once. Instead, set small and simple goals every week. For example:',
        bullets: [
          'Finish grammar rules this week',
          'Improve math accuracy step by step',
          'Practice 50 questions this week',
        ],
      },
      {
        heading: '4. Use the Right Study Material',
        body: 'Using the correct study material is very important. If you practice the right type of questions:',
        bullets: [
          'You understand the exam pattern better',
          'You feel more confident',
          'You waste less time',
        ],
      },
      {
        heading: '5. Take Breaks When Needed',
        body: 'Studying for long hours without a break can make you tired. When you feel tired:',
        bullets: [
          'Take a short break (5-10 minutes)',
          'Walk around or relax',
          'Then start again',
        ],
      },
      {
        heading: 'Common Mistakes to Avoid',
        bullets: [
          'Studying without a plan',
          'Ignoring weak topics',
          'Not reviewing mistakes',
          'Taking too many tests without analysis',
          'Last-minute heavy study',
        ],
      },
      {
        heading: 'Final Thoughts',
        body: 'Preparing for the Digital SAT while managing school and other responsibilities may seem difficult, but it is completely possible with a clear plan and regular practice. This 8-week study plan is designed to save your time, improve your skills step by step, and build your confidence before exam day. You do not need to be a top student or study for many hours daily. Even 1-2 hours of focused study every day can lead to a strong score if you stay consistent.',
      },
    ],
    keyTakeaways: [
      'Just 1-2 hours of focused daily study is enough - consistency beats long irregular sessions.',
      'Start Week 1 with a diagnostic test to understand your baseline before studying.',
      'Alternate between Reading and Math practice daily to cover both sections evenly.',
      'Always review mistakes after every test - this is where real improvement happens.',
      'Week 8 is for light revision only - avoid new topics and focus on rest and confidence.',
    ],
    faqs: [
      {
        question: 'What is the best way to study for the SAT?',
        answer:
          'The best way to study for the SAT is to follow a simple and consistent study plan. Focus on understanding concepts, practice regularly, and review your mistakes. Even 1-2 hours of daily study can help improve your score if you stay consistent.',
      },
      {
        question: 'How many practice tests should I take before the SAT?',
        answer:
          'You should take at least 3-5 full-length practice tests before the exam. These tests help you understand the exam pattern and improve your time management.',
      },
      {
        question: 'Can I prepare for the SAT with a busy schedule?',
        answer:
          'Yes, you can prepare even with a busy schedule. You just need a smart study plan. Short and focused study sessions every day are more effective than long hours once in a while.',
      },
      {
        question: 'What should I study first for the SAT?',
        answer:
          'Start by understanding the exam format and taking a practice test. Then focus on basic concepts in Reading and Math before moving to advanced topics.',
      },
      {
        question: 'What is the best daily study routine for the SAT?',
        answer:
          'A simple routine is 30 minutes for Reading, 30 minutes for Math, and 15 minutes to review mistakes. This works well for busy students.',
      },
    ],
  },
`

const newContent = c.substring(0, start) + newBlock + c.substring(end)
fs.writeFileSync(f, newContent, 'utf8')
console.log('Done. Start:', start, 'End:', end)
