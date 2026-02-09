export function generateQuestionId(subject, tag, difficulty, rowNumber = 1) {
  // Subject code - single letter
  const subjectCode = subject === 'Math' ? 'M' : 'R'
  
  // Tag/Topic code - first 2 letters only
  const tagCode = tag ? tag.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() : 'GN'
  
  // Difficulty code - single letter
  const diffCode = difficulty === 'Easy' ? 'E' : difficulty === 'Hard' ? 'H' : 'M'
  
  // Add random component to ensure uniqueness (4 chars)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  
  return `${subjectCode}${tagCode}-${diffCode}-${random}-${rowNumber}`
}
