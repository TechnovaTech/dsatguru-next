const ExcelJS = require('exceljs');
const path = require('path');

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fill-in-the-Blank Questions');

  // Define columns with proper widths
  worksheet.columns = [
    { header: 'Question', key: 'question', width: 50 },
    { header: 'Subject', key: 'subject', width: 20 },
    { header: 'Difficulty', key: 'difficulty', width: 15 },
    { header: 'Correct Answer', key: 'correctAnswer', width: 20 },
    { header: 'Option A', key: 'optionA', width: 30 },
    { header: 'Option B', key: 'optionB', width: 30 },
    { header: 'Option C', key: 'optionC', width: 30 },
    { header: 'Option D', key: 'optionD', width: 30 },
    { header: 'Explanation', key: 'explanation', width: 50 },
    { header: 'Short Explanation', key: 'shortExplanation', width: 40 },
    { header: 'Long Explanation', key: 'longExplanation', width: 50 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Question Paragraph', key: 'questionParagraph', width: 50 }
  ];

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Add sample fill-in-the-blank questions for Reading & Writing
  const sampleQuestions = [
    {
      question: 'The author\'s use of vivid imagery in the passage serves to _______ the reader\'s understanding of the setting.',
      subject: 'Reading and Writing',
      difficulty: 'Medium',
      correctAnswer: 'enhance',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: 'The word "enhance" means to improve or intensify, which fits the context of making the reader\'s understanding better through vivid imagery.',
      shortExplanation: 'Vivid imagery improves understanding.',
      longExplanation: 'When an author uses vivid imagery, they create detailed mental pictures that help readers better understand and visualize the setting. The word "enhance" perfectly captures this improvement in comprehension.',
      tags: 'Craft and Structure, Vocabulary',
      questionParagraph: 'In the following passage, the author describes a bustling marketplace with colorful stalls, aromatic spices, and the sounds of merchants calling out to customers.'
    },
    {
      question: 'Based on the data in the table, the population increased by _______ percent between 2010 and 2020.',
      subject: 'Reading and Writing',
      difficulty: 'Easy',
      correctAnswer: '15',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: 'Calculate the percentage increase: ((2020 value - 2010 value) / 2010 value) × 100 = 15%',
      shortExplanation: 'Use percentage increase formula.',
      longExplanation: 'To find the percentage increase, subtract the initial value from the final value, divide by the initial value, and multiply by 100. In this case: (115,000 - 100,000) / 100,000 × 100 = 15%',
      tags: 'Information and Ideas, Data Analysis',
      questionParagraph: 'The table shows population data for a city:\n2010: 100,000\n2020: 115,000'
    },
    {
      question: 'The scientist\'s hypothesis was _______ by the experimental results, which showed a clear correlation between the variables.',
      subject: 'Reading and Writing',
      difficulty: 'Hard',
      correctAnswer: 'corroborated',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: '"Corroborated" means confirmed or supported by evidence. The experimental results showing a clear correlation support the scientist\'s hypothesis.',
      shortExplanation: 'Results confirmed the hypothesis.',
      longExplanation: 'When experimental results show evidence that supports a hypothesis, we say the hypothesis is "corroborated." This is a formal academic term meaning the hypothesis has been confirmed or validated by empirical evidence.',
      tags: 'Standard English Conventions, Advanced Vocabulary',
      questionParagraph: 'Dr. Martinez proposed that increased sunlight exposure would lead to higher vitamin D levels in participants. After conducting a six-month study with controlled conditions, the data revealed a strong positive correlation.'
    },
    {
      question: 'The transition word that best connects these two sentences is _______.',
      subject: 'Reading and Writing',
      difficulty: 'Medium',
      correctAnswer: 'however',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: '"However" is the appropriate transition word because it shows contrast between the two ideas - the plan seemed perfect, but it had a flaw.',
      shortExplanation: 'Use "however" to show contrast.',
      longExplanation: 'Transition words help connect ideas between sentences. "However" is used to introduce a contrasting or opposing idea. The first sentence presents something positive (a perfect plan), while the second reveals a negative aspect (a critical flaw), making "however" the ideal connector.',
      tags: 'Expression of Ideas, Transitions',
      questionParagraph: 'The plan seemed perfect in every way. _______, it had one critical flaw that would later prove disastrous.'
    },
    {
      question: 'In the context of the passage, "ephemeral" most nearly means _______.',
      subject: 'Reading and Writing',
      difficulty: 'Hard',
      correctAnswer: 'temporary',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: '"Ephemeral" means lasting for a very short time, which is synonymous with "temporary." The context of cherry blossoms, which bloom briefly, reinforces this meaning.',
      shortExplanation: 'Ephemeral = temporary/short-lived.',
      longExplanation: 'The word "ephemeral" comes from Greek and means lasting for a very short time. In the context of cherry blossoms, which are famous for their brief but beautiful blooming period, "temporary" or "fleeting" would be the best synonym. This is a common SAT vocabulary word.',
      tags: 'Craft and Structure, Words in Context',
      questionParagraph: 'The beauty of cherry blossoms is ephemeral, lasting only a few weeks each spring before the delicate petals fall to the ground.'
    }
  ];

  // Add sample data rows
  sampleQuestions.forEach((q, index) => {
    const row = worksheet.addRow(q);
    
    // Alternate row colors for better readability
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }
    
    // Wrap text for better readability
    row.alignment = { vertical: 'top', wrapText: true };
    row.height = 60;
  });

  // Add instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.columns = [
    { header: 'Instructions for Fill-in-the-Blank Questions', key: 'instructions', width: 100 }
  ];

  const instructions = [
    '',
    'FILL-IN-THE-BLANK QUESTION FORMAT:',
    '',
    '1. Question: Write your question text with a blank space indicated by _______ or [blank]',
    '',
    '2. Subject: Must be "Reading and Writing" or "Math"',
    '',
    '3. Difficulty: Must be "Easy", "Medium", or "Hard"',
    '',
    '4. Correct Answer: Enter ONLY the correct answer text (no options A/B/C/D needed)',
    '   - For fill-in-the-blank, this is the word or phrase that fills the blank',
    '   - Answer matching is case-insensitive and ignores extra spaces',
    '   - Example: "enhance", "15", "however", "temporary"',
    '',
    '5. Option A, B, C, D: LEAVE THESE EMPTY for fill-in-the-blank questions',
    '   - The system will detect empty options and show a text input field',
    '   - Students will type their answer instead of selecting from choices',
    '',
    '6. Explanation: Detailed explanation of why the answer is correct',
    '',
    '7. Short Explanation: Brief explanation (1-2 sentences)',
    '',
    '8. Long Explanation: Comprehensive explanation with context',
    '',
    '9. Tags: Comma-separated topics (e.g., "Vocabulary, Craft and Structure")',
    '',
    '10. Question Paragraph: Optional context or passage for the question',
    '',
    'IMPORTANT NOTES:',
    '- For fill-in-the-blank: Leave Option A, B, C, D columns EMPTY',
    '- For multiple choice: Fill in all four options (A, B, C, D)',
    '- The system automatically detects question type based on whether options exist',
    '- Answer validation is case-insensitive for fill-in-the-blank',
    '- Acceptable answers: "enhance" = "Enhance" = "ENHANCE"',
    '',
    'COMMON READING & WRITING TAGS:',
    '- Craft and Structure',
    '- Information and Ideas',
    '- Standard English Conventions',
    '- Expression of Ideas',
    '- Vocabulary',
    '- Words in Context',
    '- Transitions',
    '- Data Analysis',
    '- Rhetorical Synthesis',
    '',
    'UPLOAD PROCESS:',
    '1. Fill in your questions following the format above',
    '2. Save the file as .xlsx or .csv',
    '3. Go to Admin > SAT Question Upload > Bulk Upload',
    '4. Upload your file',
    '5. Review the preview',
    '6. Confirm to add questions to the database'
  ];

  instructions.forEach((text, index) => {
    const row = instructionsSheet.addRow({ instructions: text });
    
    if (index === 1) {
      // Title row
      row.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
    } else if (text.startsWith('IMPORTANT') || text.startsWith('COMMON') || text.startsWith('UPLOAD')) {
      // Section headers
      row.font = { bold: true, size: 12, color: { argb: 'FFFF6600' } };
    } else if (text.match(/^\d+\./)) {
      // Numbered items
      row.font = { bold: true };
    }
    
    row.alignment = { vertical: 'top', wrapText: true };
  });

  // Save the file
  const outputPath = path.join(process.cwd(), 'Fill-in-the-Blank_RW_Template.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  
  console.log('✅ Excel template created successfully!');
  console.log(`📁 File location: ${outputPath}`);
  console.log('');
  console.log('📋 Template includes:');
  console.log('   - 5 sample fill-in-the-blank questions for Reading & Writing');
  console.log('   - Proper column headers matching your upload system');
  console.log('   - Detailed instructions sheet');
  console.log('   - All required fields for SAT questions');
  console.log('');
  console.log('🎯 Key features:');
  console.log('   - Option columns (A, B, C, D) are left EMPTY');
  console.log('   - Only "Correct Answer" field is filled');
  console.log('   - System will auto-detect and show text input');
  console.log('   - Case-insensitive answer validation');
}

generateTemplate().catch(console.error);
