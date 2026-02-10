export function generateQuestionId(subject, tag, difficulty, rowNumber = 1) {
  // Subject code - single letter
  const subjectCode = subject === 'Math' ? 'M' : 'R'
  
  // Tag/Topic code - first 2 letters only
  const tagCode = tag ? tag.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() : 'GN'
  
  // Difficulty code - single letter
  const diffCode = difficulty === 'Easy' ? 'E' : difficulty === 'Hard' ? 'H' : 'M'
  
  // Return format: Subject+Topic - Difficulty - RowNumber
  // Example: MCI-M-148
  return `${subjectCode}${tagCode}-${diffCode}-${rowNumber}`
}
