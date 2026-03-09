const ExcelJS = require('exceljs');
const path = require('path');

async function generateTestSample() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Questions');

  // Define columns
  worksheet.columns = [
    { header: 'Question', key: 'question', width: 60 },
    { header: 'Subject', key: 'subject', width: 25 },
    { header: 'Difficulty', key: 'difficulty', width: 15 },
    { header: 'Correct Answer', key: 'correctAnswer', width: 20 },
    { header: 'Option A', key: 'optionA', width: 40 },
    { header: 'Option B', key: 'optionB', width: 40 },
    { header: 'Option C', key: 'optionC', width: 40 },
    { header: 'Option D', key: 'optionD', width: 40 },
    { header: 'Explanation', key: 'explanation', width: 60 },
    { header: 'Short Explanation', key: 'shortExplanation', width: 40 },
    { header: 'Long Explanation', key: 'longExplanation', width: 60 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Question Paragraph', key: 'questionParagraph', width: 60 }
  ];

  // Style header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0066CC' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Question 1: FILL-IN-THE-BLANK (Options A, B, C, D are EMPTY)
  const question1 = {
    question: 'The author uses metaphorical language to _______ the complexity of human emotions.',
    subject: 'Reading and Writing',
    difficulty: 'Medium',
    correctAnswer: 'illustrate',
    optionA: '',  // EMPTY - This makes it fill-in-the-blank
    optionB: '',  // EMPTY
    optionC: '',  // EMPTY
    optionD: '',  // EMPTY
    explanation: 'The word "illustrate" means to explain or make clear through examples or comparisons. Metaphorical language is used to illustrate complex ideas by comparing them to more familiar concepts.',
    shortExplanation: 'Metaphors help illustrate complex emotions.',
    longExplanation: 'When an author uses metaphorical language, they are creating comparisons that help readers understand abstract or complex concepts. The word "illustrate" perfectly captures this explanatory function, as it means to make something clear or explain it through examples, pictures, or comparisons.',
    tags: 'Vocabulary',
    questionParagraph: 'In the passage, the author compares human emotions to a turbulent ocean, with waves representing different feelings that rise and fall unpredictably.'
  };

  // Question 2: MULTIPLE CHOICE (All options A, B, C, D are FILLED)
  const question2 = {
    question: 'Which choice best describes the main purpose of the passage?',
    subject: 'Reading and Writing',
    difficulty: 'Medium',
    correctAnswer: 'B',
    optionA: 'To argue that emotions are impossible to understand',  // FILLED
    optionB: 'To explain how metaphors help us comprehend emotions',  // FILLED - CORRECT
    optionC: 'To criticize the use of metaphorical language',  // FILLED
    optionD: 'To describe the physical properties of ocean waves',  // FILLED
    explanation: 'The passage focuses on how the author uses metaphorical language (comparing emotions to ocean waves) to help readers understand the complexity of human emotions. Option B best captures this main purpose.',
    shortExplanation: 'The passage explains how metaphors aid understanding.',
    longExplanation: 'The main purpose of the passage is to demonstrate how metaphorical language serves as a tool for understanding complex concepts. By comparing emotions to ocean waves, the author makes abstract feelings more concrete and relatable. Option B correctly identifies this explanatory purpose, while the other options either misrepresent the passage\'s intent or focus on irrelevant details.',
    tags: 'Vocabulary',
    questionParagraph: 'In the passage, the author compares human emotions to a turbulent ocean, with waves representing different feelings that rise and fall unpredictably.'
  };

  // Add questions
  const row1 = worksheet.addRow(question1);
  row1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF4CC' }  // Light yellow for fill-in-blank
  };
  row1.alignment = { vertical: 'top', wrapText: true };
  row1.height = 80;

  const row2 = worksheet.addRow(question2);
  row2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7F3FF' }  // Light blue for multiple choice
  };
  row2.alignment = { vertical: 'top', wrapText: true };
  row2.height = 80;

  // Add a note row
  const noteRow = worksheet.addRow({
    question: '⬆️ QUESTION 1: Fill-in-the-Blank (Options A,B,C,D are EMPTY) | QUESTION 2: Multiple Choice (Options A,B,C,D are FILLED)',
    subject: '',
    difficulty: '',
    correctAnswer: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    explanation: '',
    shortExplanation: '',
    longExplanation: '',
    tags: '',
    questionParagraph: ''
  });
  noteRow.font = { bold: true, italic: true, color: { argb: 'FFFF6600' } };
  noteRow.alignment = { vertical: 'middle', wrapText: true };
  noteRow.height = 40;

  // Merge cells for the note
  worksheet.mergeCells(`A${noteRow.number}:M${noteRow.number}`);

  // Save file
  const outputPath = path.join(process.cwd(), 'Test_Sample_2Questions.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  
  console.log('✅ Test sample Excel file created successfully!');
  console.log(`📁 File: ${outputPath}`);
  console.log('');
  console.log('📋 Contents:');
  console.log('   ✏️  Question 1: FILL-IN-THE-BLANK');
  console.log('      - Topic: Vocabulary (Metaphorical Language)');
  console.log('      - Answer: "illustrate"');
  console.log('      - Options A, B, C, D: EMPTY (shows text input)');
  console.log('');
  console.log('   🔘 Question 2: MULTIPLE CHOICE');
  console.log('      - Topic: Central Ideas (Same passage)');
  console.log('      - Answer: B');
  console.log('      - Options A, B, C, D: FILLED (shows 4 buttons)');
  console.log('');
  console.log('🎯 Both questions use the SAME topic/passage!');
  console.log('📤 Ready to upload via Admin > Bulk Upload');
}

generateTestSample().catch(console.error);
