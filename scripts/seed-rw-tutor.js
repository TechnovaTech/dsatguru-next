const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/dsatmain';

const questionSchema = new mongoose.Schema({
  questionId: { type: String, unique: true, sparse: true },
  title: { type: String, default: '' },
  questionParagraph: String,
  content: { type: String, required: true },
  explanation: String,
  shortExplanation: String,
  longExplanation: String,
  subject: { type: String, required: true, default: 'Math' },
  domain: { type: String },
  skill: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  type: { type: String, enum: ['MultipleChoice', 'TrueFalse', 'ShortAnswer', 'Essay'], default: 'MultipleChoice' },
  testType: { type: String, enum: ['Base', 'Adaptive'], default: 'Base' },
  correctAnswer: { type: String, required: true, default: 'A' },
  imageUrl: String,
  options: String,
  tags: String,
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  isTutor: { type: Boolean, default: false },
  isAdminTest: { type: Boolean, default: false },
  remark: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }
}, {
  timestamps: true,
  strict: false
});

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

const rwTopics = [
  'Craft and Structure',
  'Information and Ideas',
  'Standard English Conventions',
  'Expression of Ideas'
];

const difficulties = ['Easy', 'Medium', 'Hard'];

async function seedRWQuestions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const questions = [];
    for (let i = 1; i <= 50; i++) {
      const topic = rwTopics[Math.floor(Math.random() * rwTopics.length)];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      const q = {
        questionId: `TUTOR-RW-${1000 + i}`,
        title: `Tutor RW Question ${i}`,
        questionParagraph: `This is a sample paragraph for Reading and Writing question ${i}. It provides context for the question that follows, simulating a real SAT-style reading passage. The passage discusses various aspects of ${topic.toLowerCase()} in a concise manner.`,
        content: `Based on the text, which choice best describes the main idea of the passage regarding ${topic}?`,
        explanation: `This is the general explanation for question ${i}. It explains why the correct answer is right and why others are wrong.`,
        shortExplanation: `Correct because it accurately reflects the passage's discussion on ${topic}.`,
        longExplanation: `A detailed breakdown of the passage shows that the author emphasizes specific elements of ${topic}. Option ${['A', 'B', 'C', 'D'][i % 4]} directly aligns with the textual evidence provided in lines 2-4.`,
        subject: 'Reading and Writing',
        domain: 'Reading and Writing',
        skill: topic,
        difficulty: difficulty,
        type: 'MultipleChoice',
        testType: 'Base',
        correctAnswer: ['A', 'B', 'C', 'D'][i % 4],
        options: JSON.stringify([
          `Option A: A plausible but potentially incorrect interpretation related to ${topic}.`,
          `Option B: Another choice that tests the student's understanding of ${topic}.`,
          `Option C: A third option focusing on a different aspect of the passage.`,
          `Option D: The final option for this multiple-choice question.`
        ]),
        tags: JSON.stringify([topic, difficulty, 'Tutor Bank', 'RW']),
        points: 1,
        isActive: true,
        isTutor: true,
        isAdminTest: false,
        remark: `Seeded for Tutor RW Bank - Topic: ${topic}`
      };
      questions.push(q);
    }

    // Insert questions
    await Question.insertMany(questions);
    console.log(`Successfully seeded ${questions.length} RW tutor questions.`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding questions:', error);
    process.exit(1);
  }
}

seedRWQuestions();
