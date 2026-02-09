
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./lib/db');

const questionSchema = new mongoose.Schema({
  title: String,
  subject: String,
  isTutor: Boolean,
  questionBankId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const courseSchema = new mongoose.Schema({
  title: String
}, { strict: false });

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    console.log('--- Question Stats ---');
    const totalQuestions = await Question.countDocuments({});
    const tutorQuestions = await Question.countDocuments({ isTutor: true });
    const nonTutorQuestions = await Question.countDocuments({ isTutor: false });
    const undefinedTutorQuestions = await Question.countDocuments({ isTutor: { $exists: false } });

    console.log(`Total: ${totalQuestions}`);
    console.log(`isTutor: true: ${tutorQuestions}`);
    console.log(`isTutor: false: ${nonTutorQuestions}`);
    console.log(`isTutor undefined: ${undefinedTutorQuestions}`);

    console.log('\n--- Sample Tutor Questions ---');
    const samples = await Question.find({ isTutor: true }).limit(5).select('title subject isTutor questionBankId');
    console.log(samples);

    console.log('\n--- Question Banks (Courses) ---');
    const courses = await Course.find({});
    courses.forEach(c => console.log(`${c._id}: ${c.title}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
