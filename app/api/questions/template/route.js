import { NextResponse } from 'next/server'

export async function GET() {
  const header = [
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Subject',
    'Difficulty',
    'Tags',
    'Short Explanation',
    'Long Explanation'
  ].join(',')

  const rows = [
    [
      'Solve for x: 2x + 3 = 11',
      'x = 3',
      'x = 4',
      'x = 5',
      'x = 6',
      'B',
      'Math',
      'Easy',
      'Algebra,Linear Equations',
      'Subtract 3 from both sides to get 2x = 8, then divide by 2 to get x = 4',
      'Step 1: Subtract 3 from both sides: 2x + 3 - 3 = 11 - 3, which gives 2x = 8. Step 2: Divide both sides by 2: 2x/2 = 8/2, which gives x = 4. Therefore, the answer is x = 4.'
    ],
    [
      'In the passage, the author primarily argues that sustainable practices are essential for long-term growth. What is the main idea?',
      'Sustainability is crucial for growth',
      'Growth is more important than sustainability',
      'Sustainability and growth are unrelated',
      'Short-term gains are better',
      'A',
      'Reading and Writing',
      'Medium',
      'Reading Comprehension,Main Ideas',
      'The passage emphasizes that sustainable practices are necessary for achieving long-term growth',
      'The author makes a clear argument throughout the passage that sustainable practices are not just beneficial but essential for achieving long-term growth. This is the central theme that ties together all the supporting points in the passage.'
    ],
    [
      'What is the value of 3² + 4²?',
      '7',
      '12',
      '25',
      '49',
      'C',
      'Math',
      'Medium',
      'Algebra,Exponents',
      '3² = 9 and 4² = 16, so 9 + 16 = 25',
      'First, calculate 3² which equals 3 × 3 = 9. Then calculate 4² which equals 4 × 4 = 16. Finally, add them together: 9 + 16 = 25. This is also related to the Pythagorean theorem where 3-4-5 is a common right triangle.'
    ]
  ]
    .map(r => r.map(field => {
      const f = String(field ?? '')
      return f.includes(',') || f.includes('"') || f.includes('\n') ? `"${f.replace(/"/g, '""')}"` : f
    }).join(','))
    .join('\n')

  const csv = `${header}\n${rows}\n`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bulk_question_template.csv"'
    }
  })
}
