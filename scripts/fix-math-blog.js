const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')

const start = c.indexOf('10-common-digital-sat-math-mistakes') - 20
const end = c.indexOf('digital-sat-reading-writing-strategies') - 20

const newBlock = `  {
    slug: '10-common-digital-sat-math-mistakes',
    title: '10 Common Digital SAT Math Mistakes & How to Fix Them',
    metaTitle: '10 Common Digital SAT Math Mistakes & Easy Fixes',
    metaDescription:
      'Learn 10 common Digital SAT Math mistakes and simple ways to fix them. Improve accuracy, avoid errors, and boost your SAT Math score with easy tips.',
    category: 'Math',
    readingTime: '9 min read',
    date: 'Dec 28, 2025',
    author: 'DSATGURU Math Team',
    image: '/b4.png',
    imageAlt: 'Student solving Digital SAT Math problems on a tablet',
    badgeColor: 'bg-purple-100 text-purple-700',
    thumbnailTone: 'from-purple-500 via-indigo-500 to-fuchsia-500',
    summary:
      'Learn 10 common Digital SAT Math mistakes and simple ways to fix them. Improve accuracy, avoid errors, and boost your SAT Math score with easy tips.',
    heroText:
      'The Math section of the Digital SAT can feel difficult for many students. Even if you are good at math, small mistakes, rushing, or poor time management can reduce your score. But the good news is - most of these mistakes are easy to fix. With a little care and regular practice, you can improve your score and feel more confident on exam day.',
    sections: [
      {
        heading: 'Understanding the Digital SAT Math Section',
        body: 'The Digital SAT Math section has two parts: No-Calculator Section and Calculator Section. The test is also adaptive - if you answer correctly, the next questions may become harder; if you make mistakes, they may become easier. That is why it is important to stay focused and avoid mistakes from the beginning. The questions are based on:',
        bullets: [
          'Algebra (equations and functions)',
          'Advanced Math (quadratics, exponents, roots)',
          'Data Analysis (graphs, percentages, ratios)',
          'Geometry and Trigonometry',
        ],
      },
      {
        heading: '1. Misreading the Question',
        body: 'Mistake: Many students read questions too fast and misunderstand what is being asked. How to fix it:',
        bullets: [
          'Read the question slowly',
          'Look at important numbers and keywords',
          'Ask yourself: What do I need to find?',
        ],
      },
      {
        heading: '2. Forgetting Formulas',
        body: 'Mistake: Students sometimes try to solve problems without using formulas. How to fix it:',
        bullets: [
          'Learn important formulas properly',
          'Practice using them in different questions',
          'Write formulas on paper during practice',
        ],
      },
      {
        heading: '3. Small Calculation Mistakes',
        body: 'Mistake: Making simple mistakes in basic calculations like addition or multiplication. How to fix it:',
        bullets: [
          'Write all steps clearly',
          'Double-check your work',
          'Use a calculator carefully when allowed',
        ],
      },
      {
        heading: '4. Ignoring Units',
        body: 'Mistake: Forgetting units like meters, seconds, or dollars. How to fix it:',
        bullets: [
          'Always check the unit in the question',
          'Convert units if needed',
          'Write the final answer with the correct unit',
        ],
      },
      {
        heading: '5. Guessing Without Thinking',
        body: 'Mistake: Random guessing without any strategy. How to fix it:',
        bullets: [
          'First remove wrong options',
          'Choose from the remaining answers',
          'Always try to attempt the question - there is no negative marking',
        ],
      },
      {
        heading: '6. Making Easy Questions Difficult',
        body: 'Mistake: Overthinking simple questions and making them complicated. How to fix it:',
        bullets: [
          'Solve step by step',
          'Keep your approach simple',
          'Do not use complex methods if not needed',
        ],
      },
      {
        heading: '7. Poor Time Management',
        body: 'Mistake: Spending too much time on one question. How to fix it:',
        bullets: [
          'Set a time limit for each question',
          'Skip hard questions and come back later',
          'Practice with a timer',
        ],
      },
      {
        heading: '8. Avoiding Word Problems',
        body: 'Mistake: Skipping word problems because they look confusing. How to fix it:',
        bullets: [
          'Read slowly and carefully',
          'Underline important numbers',
          'Turn the problem into an equation',
        ],
      },
      {
        heading: '9. Not Checking Answers',
        body: 'Mistake: Submitting answers without reviewing them. How to fix it:',
        bullets: [
          'Use extra time to check answers',
          'Recalculate tricky questions',
          'Make sure your answer matches the question',
        ],
      },
      {
        heading: '10. Irregular Practice',
        body: 'Mistake: Studying only sometimes and not regularly. How to fix it:',
        bullets: [
          'Practice daily for 30-60 minutes',
          'Take 1-2 mock tests every week',
          'Review your mistakes after every session',
        ],
      },
      {
        heading: 'Quick Tips to Score Better in Digital SAT Math',
        body: 'Along with avoiding mistakes, follow these simple habits:',
        bullets: [
          'Read questions carefully before solving',
          'Practice every day, even if it is for a short time',
          'Do not spend too long on one question',
          'Always review your answers if time allows',
        ],
      },
      {
        heading: 'How Parents Can Help',
        body: 'Parents play an important role in a student\'s preparation. They can help by:',
        bullets: [
          'Encouraging daily practice',
          'Helping track progress',
          'Talking about mistakes calmly',
          'Providing a quiet place to study',
        ],
      },
      {
        heading: 'Final Thoughts',
        body: 'Digital SAT Math is not just about knowing math. It is about staying careful, thinking clearly, and managing your time well. Many students lose marks because of small mistakes like rushing or not reading properly. But these mistakes can be improved easily. If you practice regularly, stay focused, and learn from your mistakes, your score will improve step by step. Even studying for 30-60 minutes daily can make a big difference.',
      },
    ],
    keyTakeaways: [
      'Read every question slowly - one missed word can change the entire answer.',
      'Learn and practice formulas regularly so they come naturally during the test.',
      'Write all calculation steps clearly to avoid small but costly errors.',
      'Never leave a question blank - there is no negative marking in the Digital SAT.',
      'Practice 30-60 minutes daily and review mistakes after every session.',
    ],
    faqs: [
      {
        question: 'What are the most common mistakes in Digital SAT Math?',
        answer:
          'The most common mistakes include misreading questions, making small calculation errors, forgetting formulas, poor time management, and not checking answers. Many students also lose marks due to rushing or overthinking simple questions.',
      },
      {
        question: 'How can I avoid silly mistakes in SAT Math?',
        answer:
          'To avoid silly mistakes, read questions carefully, write each step clearly, and double-check your answers. Practicing regularly and solving questions slowly during practice can also help reduce errors.',
      },
      {
        question: 'How much time should I spend on SAT Math practice daily?',
        answer:
          'You should practice SAT Math for about 30-60 minutes daily. Consistent short practice is more effective than studying for long hours once in a while.',
      },
      {
        question: 'What is a good score in Digital SAT Math?',
        answer:
          'A good score in Digital SAT Math is usually between 700 and 800. However, even a score above 650 is considered strong depending on the colleges you are applying to.',
      },
      {
        question: 'How many questions are there in Digital SAT Math?',
        answer:
          'The Digital SAT Math section has 44 questions in total. These are divided into two modules, and you need to manage your time carefully to attempt all questions.',
      },
    ],
  },
`

const newContent = c.substring(0, start) + newBlock + c.substring(end)
fs.writeFileSync(f, newContent, 'utf8')
console.log('Done. Start:', start, 'End:', end)
