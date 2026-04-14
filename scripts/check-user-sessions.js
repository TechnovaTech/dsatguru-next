const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const User = require('../lib/models/User').default;
const TestSession = require('../lib/models/TestSession').default;
const Test = require('../lib/models/Test').default;

async function checkUserData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: 'user@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }
    console.log('User found:', { id: user._id, name: user.name, role: user.role });

    const sessions = await TestSession.find({ userId: user._id })
      .populate('testId')
      .sort({ createdAt: -1 });

    console.log(`Found ${sessions.length} sessions for user`);

    sessions.forEach(s => {
      const sDate = new Date(s.completedAt || s.createdAt || s.updatedAt);
      const dateStr = sDate.toISOString();
      const day = sDate.getDate();
      const month = sDate.toLocaleDateString('en-GB', { month: 'short' });
      
      console.log(`Session ID: ${s._id}`);
      console.log(`  Date: ${dateStr} (Day: ${day}, Month: ${month})`);
      console.log(`  Status: ${s.status}`);
      console.log(`  Correct Answers (Field): ${s.correctAnswers}`);
      console.log(`  Responses Count: ${s.responses?.length || 0}`);
      const actualCorrect = s.responses?.filter(r => r.isCorrect).length || 0;
      console.log(`  Actual Correct from Responses: ${actualCorrect}`);
      console.log(`  Subject: ${s.testId?.subject || 'N/A'}`);
      console.log(`  Practice Mode: ${s.testId?.practiceMode || 'N/A'}`);
      console.log('---');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUserData();
