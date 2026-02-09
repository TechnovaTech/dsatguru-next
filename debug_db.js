
const mongoose = require('mongoose');
require('dotenv').config();

const { connectDB } = require('./lib/db');

// Inline minimal schemas to avoid ES module import issues
const testSchema = new mongoose.Schema({
  title: String,
  subject: String,
  practiceMode: String,
  isTutorTest: Boolean,
  sections: Object
}, { strict: false }); // strict: false to allow other fields to exist without error

const testSessionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  mode: String
}, { strict: false });

const userSchema = new mongoose.Schema({
  name: String
}, { strict: false });

// Register models if not already registered (checking mongoose.models)
const Test = mongoose.models.Test || mongoose.model('Test', testSchema);
const TestSession = mongoose.models.TestSession || mongoose.model('TestSession', testSessionSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    console.log('--- Checking Tutor Tests ---');
    const tests = await Test.find({ 
        $or: [
          { isTutorTest: true },
          { practiceMode: 'tutor' }
        ]
    }).select('title subject practiceMode isTutorTest sections');
    
    console.log(`Found ${tests.length} Tutor Tests in total.`);
    tests.forEach(t => {
        console.log(`ID: ${t._id}, Title: "${t.title}", Subject: "${t.subject}", Mode: ${t.practiceMode}, isTutor: ${t.isTutorTest}, Sections: ${JSON.stringify(t.sections)}`);
    });

    console.log('\n--- Checking Test Sessions ---');
    const sessions = await TestSession.find({})
        .populate('testId', 'title subject practiceMode isTutorTest sections')
        .sort({ createdAt: -1 })
        .limit(20);

    console.log(`Checking last 20 sessions...`);
    sessions.forEach(s => {
        if (!s.testId) {
            console.log(`Session ${s._id}: ORPHANED (No Test ID)`);
            return;
        }
        const t = s.testId;
        const isTutor = t.practiceMode === 'tutor' || t.isTutorTest === true;
        console.log(`Session ${s._id} (Status: ${s.status}): Test "${t.title}", Subject: "${t.subject}", isTutor: ${isTutor}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // await mongoose.disconnect(); // Keep open for a moment if needed, but here we can close
    process.exit(0);
  }
}

run();
