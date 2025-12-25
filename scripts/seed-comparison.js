const mongoose = require('mongoose')

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsatmain'

const comparisonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  description: { type: String, required: true },
  features: [{ type: String, required: true }],
  providers: [{
    name: { type: String, required: true },
    highlight: { type: Boolean, default: false },
    values: [{ type: mongoose.Schema.Types.Mixed }]
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const Comparison = mongoose.model('Comparison', comparisonSchema)

async function seedComparison() {
  try {
    await mongoose.connect(uri)
    console.log('Connected to MongoDB')

    // Clear existing data
    await Comparison.deleteMany({})

    // Create default comparison data
    const comparisonData = {
      title: 'Compare DSATGURU vs. Other Prep Services',
      subtitle: 'Comprehensive and Intuitive',
      description: 'We are committed to supporting our students in reaching their full potential, empowering them to achieve exceptional scores and confidently pursue admission to the colleges of their choice.',
      features: [
        "Price",
        "Time of online access",
        "Live Classes",
        "25+ Multistage Adaptive Practice Tests",
        "Content Videos with practice Quizzes",
        "Video and Text Explanation of all Questions",
        "Increase Score Guarantee*",
        "Study Plan (Weekly, Monthly)",
        "Free 4 days (2 Free full length Included) Trial",
        "Approximate Score Predictor",
        "Support 24/7",
      ],
      providers: [
        {
          name: "DSATGURU",
          highlight: true,
          values: ["$20+", "1 Month +", true, true, true, true, "+200", true, true, true, true],
        },
        {
          name: "KAPLAN",
          highlight: false,
          values: ["$199", "6 months", false, false, false, false, "+1", false, false, false, false],
        },
        {
          name: "PRINCETON",
          highlight: false,
          values: ["$299", "12 months", false, false, false, false, "+160", false, false, false, false],
        },
        {
          name: "PrepScholar",
          highlight: false,
          values: ["$397", "12 months", false, false, false, false, "", false, false, false, false],
        },
        {
          name: "Testive",
          highlight: false,
          values: ["$1596", "4 months", false, false, false, false, "", false, false, false, false],
        },
      ],
      isActive: true
    }

    await Comparison.create(comparisonData)
    console.log('✅ Comparison table seeded successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding comparison:', error)
  } finally {
    await mongoose.disconnect()
  }
}

seedComparison()