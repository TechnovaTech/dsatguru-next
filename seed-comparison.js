import { connectDB } from './lib/db.js'
import Comparison from './lib/models/Comparison.js'

const seedData = {
  features: [
    'Price',
    'Time of online access',
    'Live Classes',
    '25+ Multistage Adaptive Practice Tests',
    'Content Videos with practice Quizzes',
    'Video and Text Explanation of all Questions',
    'Increase Score Guarantee*',
    'Study Plan (Weekly, Monthly)',
    'Free 4 days (2 Free full length Included) Trial',
    'Approximate Score Predictor',
    'Support 24/7'
  ],
  providers: [
    {
      name: 'DSATGURU',
      highlight: true,
      values: ['$20+', '1 Month +', true, true, true, true, '+200', true, true, true, true]
    },
    {
      name: 'KAPLAN',
      highlight: false,
      values: ['$199', '6 months', false, false, false, false, '+1', false, false, false, false]
    },
    {
      name: 'PRINCETON',
      highlight: false,
      values: ['$299', '12 months', false, false, false, false, '+160', false, false, false, false]
    },
    {
      name: 'PrepScholar',
      highlight: false,
      values: ['$397', '12 months', false, false, false, false, false, false, false, false, false]
    },
    {
      name: 'Testive',
      highlight: false,
      values: ['$1596', '4 months', false, false, false, false, false, false, false, false, false]
    }
  ],
  isActive: true
}

async function seedComparison() {
  try {
    await connectDB()
    
    // Remove existing data
    await Comparison.deleteMany({})
    
    // Insert new data
    const comparison = await Comparison.create(seedData)
    console.log('Comparison data seeded successfully:', comparison._id)
    
    process.exit(0)
  } catch (error) {
    console.error('Error seeding comparison data:', error)
    process.exit(1)
  }
}

seedComparison()