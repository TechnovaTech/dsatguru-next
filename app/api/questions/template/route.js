import { NextResponse } from 'next/server'

export async function GET() {
  const header = [
    'Title',
    'Content',
    'Subject',
    'Difficulty',
    'CorrectAnswer',
    'OptionA',
    'OptionB',
    'OptionC',
    'OptionD',
    'QuestionParagraph',
    'Explanation',
    'ShortExplanation',
    'LongExplanation',
    'Tags',
    'ImageFileName'
  ].join(',')

  const rows = [
    [
      'Linear Equations Basics',
      'Solve for x: 2x + 3 = 11',
      'Math',
      'Easy',
      'C',
      'x = 3',
      'x = 4',
      'x = 5',
      'x = 6',
      '',
      'Subtract 3 to get 2x = 8, then divide by 2: x = 4',
      'Brief: 2x=8 -> x=4',
      'Step 1: Subtract 3 from both sides (2x = 8). Step 2: Divide by 2 (x = 4).',
      'algebra,linear-equations',
      ''
    ],
    [
      'Reading Comprehension',
      'In the passage, the author primarily argues that sustainable practices are essential for long-term growth.',
      'Reading and Writing',
      'Medium',
      'A',
      'Agree',
      'Disagree',
      'Not stated',
      'Partially agree',
      'The passage discusses benefits and necessity of sustainability.',
      'The main idea supports sustainability as crucial.',
      'reading',
      'sample-reading-1.png'
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
