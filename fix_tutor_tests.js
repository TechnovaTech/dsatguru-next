
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./lib/db');

// Inline schemas
const questionSchema = new mongoose.Schema({
  subject: String
}, { strict: false });

const testSchema = new mongoose.Schema({
  title: String,
  subject: String,
  practiceMode: String,
  isTutorTest: Boolean,
  sections: Object,
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
}, { strict: false });

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Test = mongoose.models.Test || mongoose.model('Test', testSchema);

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const tests = await Test.find({ 
        $or: [
          { isTutorTest: true },
          { practiceMode: 'tutor' }
        ]
    }).populate('questions');
    
    console.log(`Found ${tests.length} Tutor Tests to check.`);

    for (const test of tests) {
        if (!test.questions || test.questions.length === 0) {
            console.log(`Skipping Test "${test.title}" (No questions)`);
            continue;
        }

        // Infer subject from first question
        const firstQ = test.questions[0];
        const inferredSubject = firstQ.subject;

        if (!inferredSubject) {
            console.log(`Skipping Test "${test.title}" (First question has no subject)`);
            continue;
        }

        console.log(`Test "${test.title}": Inferred Subject = "${inferredSubject}"`);

        let updates = {};
        let needsUpdate = false;

        // Update Subject if missing or different
        if (test.subject !== inferredSubject) {
            updates.subject = inferredSubject;
            needsUpdate = true;
        }

        // Update Sections
        // Default sections are both true. We want to be specific.
        let newSections = { ...test.sections };
        if (inferredSubject === 'Math') {
            if (newSections.rw !== false || newSections.math !== true) {
                newSections = { math: true, rw: false };
                updates.sections = newSections;
                needsUpdate = true;
            }
        } else if (inferredSubject === 'Reading and Writing') {
            if (newSections.math !== false || newSections.rw !== true) {
                newSections = { math: false, rw: true };
                updates.sections = newSections;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log(` -> Updating "${test.title}":`, updates);
            await Test.updateOne({ _id: test._id }, { $set: updates });
        } else {
            console.log(` -> OK (No changes needed)`);
        }
    }

    console.log('Done.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
