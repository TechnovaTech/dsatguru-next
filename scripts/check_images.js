const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const questionSchema = new mongoose.Schema({
  questionId: { type: String },
  title: { type: String },
  content: { type: String },
  options: String, 
}, { strict: false });

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

async function check() {
  const uri = 'mongodb://localhost:27017/dsatmain';
  await mongoose.connect(uri);
  
  console.log('--- Checking Latest 5 Questions ---');
  const questions = await Question.find({}).sort({ createdAt: -1 }).limit(5);
  
  questions.forEach((q, i) => {
    console.log(`\n[${i+1}] ID: ${q._id}`);
    console.log(`    Content: ${JSON.stringify(q.content)}`);
    console.log(`    QuestionParagraph: ${JSON.stringify(q.questionParagraph)}`);
    
    // Check for markdown image syntax
    const hasImage = /!\[.*?\]\(.*?\)/.test(q.content);
    console.log(`    Has Image Markdown: ${hasImage}`);
  });
  
  console.log('\n--- Checking Uploads Folder ---');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions');
  try {
    const files = fs.readdirSync(uploadDir);
    console.log(`Total files in uploads: ${files.length}`);
    const recentFiles = files.map(f => ({
      name: f,
      time: fs.statSync(path.join(uploadDir, f)).mtime
    })).sort((a, b) => b.time - a.time).slice(0, 5);
    
    console.log('Most recent 5 files:');
    recentFiles.forEach(f => console.log(`  ${f.name} (${f.time.toISOString()})`));
  } catch (e) {
    console.log('Error reading uploads dir:', e.message);
  }
  
  await mongoose.disconnect();
}

check();
