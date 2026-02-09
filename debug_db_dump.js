
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./lib/db');

// Inline minimal schemas
const testSchema = new mongoose.Schema({}, { strict: false }); // Empty schema with strict: false to get everything

const Test = mongoose.models.Test || mongoose.model('Test', testSchema);

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    console.log('--- Dumping one Tutor Test ---');
    const test = await Test.findOne({ practiceMode: 'tutor' }).sort({ createdAt: -1 });
    
    if (test) {
        console.log('Full Test Object:');
        console.log(JSON.stringify(test.toObject(), null, 2));
    } else {
        console.log('No tutor test found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
