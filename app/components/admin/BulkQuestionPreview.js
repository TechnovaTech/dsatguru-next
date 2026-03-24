'use client'
import { useState } from 'react'
import { FiCheck, FiX, FiEdit2, FiImage, FiChevronDown, FiChevronUp, FiSave } from 'react-icons/fi'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function BulkQuestionPreview({ questions, onApprove, onCancel, questionBankId, isTutor }) {
  const [editedQuestions, setEditedQuestions] = useState(questions)
  const [expandedQuestions, setExpandedQuestions] = useState(new Set([0]))
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [approving, setApproving] = useState(false)
  const [globalRemark, setGlobalRemark] = useState('')

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(index)) newExpanded.delete(index)
    else newExpanded.add(index)
    setExpandedQuestions(newExpanded)
  }

  const expandAll = () => setExpandedQuestions(new Set(editedQuestions.map((_, idx) => idx)))
  const collapseAll = () => setExpandedQuestions(new Set())
  const startEdit = (index) => setEditingQuestion(index)
  const saveEdit = () => setEditingQuestion(null)

  const updateQuestion = (index, field, value) => {
    const updated = [...editedQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setEditedQuestions(updated)
  }

  const applyGlobalRemark = () => {
    if (!globalRemark.trim()) { alert('Please enter a remark'); return }
    setEditedQuestions(editedQuestions.map(q => ({ ...q, remark: globalRemark })))
    alert(`Remark applied to all ${editedQuestions.length} questions!`)
  }

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...editedQuestions]
    const newOptions = [...updated[qIndex].options]
    newOptions[optIndex] = value
    updated[qIndex] = { ...updated[qIndex], options: newOptions }
    setEditedQuestions(updated)
  }

  const removeQuestion = (index) => {
    setEditedQuestions(editedQuestions.filter((_, i) => i !== index))
    const newExpanded = new Set(expandedQuestions)
    newExpanded.delete(index)
    setExpandedQuestions(newExpanded)
  }

  const handleApprove = async () => {
    setApproving(true)
    try { await onApprove(editedQuestions) } finally { setApproving(false) }
  }

  const hasImage = (text) => !!(text && /!\[.*?\]\(.*?\)/.test(text))

  const plainText = (text) => {
    if (!text) return ''
    return text
      .replace(/\\\[[\s\S]*?\\\]/g, '[math]')
      .replace(/\\\([\s\S]*?\\\)/g, '[math]')
      .replace(/\$\$[\s\S]*?\$\$/g, '[math]')
      .replace(/\$[^\$\n]+?\$/g, '[math]')
      .replace(/!\[.*?\]\(.*?\)/g, '[image]')
      .replace(/<[^>]+>/g, '')
      .replace(/\|[-:\s|]+\|/g, '')
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const renderLatexSegment = (part, i) => {
    let latex = null
    let displayMode = false
    const S = '$'
    const SS = S + S
    if (part.startsWith(SS) && part.endsWith(SS) && part.length > 4) {
      latex = part.slice(2, -2).trim(); displayMode = true
    } else if (part.startsWith(S) && part.endsWith(S) && part.length > 2 && !part.startsWith(SS)) {
      latex = part.slice(1, -1).trim(); displayMode = false
    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
      latex = part.slice(2, -2).trim(); displayMode = true
    } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
      latex = part.slice(2, -2).trim(); displayMode = false
    }
    if (latex !== null) {
      try {
        const html = katex.renderToString(latex, { displayMode, throwOnError: false, output: 'html' })
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
      } catch { return <span key={i}>{part}</span> }
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
  }

  const renderLatex = (text) => {
    if (!text) return null
    const S = '$'
    const SS = S + S
    const re = new RegExp(
      '(' +
      SS.replace(/./g, c => '\\' + c) + '[\\s\\S]*?' + SS.replace(/./g, c => '\\' + c) +
      '|\\' + S + '[^' + S + '\\n]+?\\' + S +
      '|\\\\\\[[\\s\\S]*?\\\\\\]' +
      '|\\\\\\([\\s\\S]*?\\\\\\)' +
      ')',
      'g'
    )
    const parts = text.split(re)
    return parts.map((part, i) => renderLatexSegment(part, i))
  }

  const renderTable = (tableText) => {
    const rows = tableText.trim().split('\n').map(r => r.trim())
    const parseCells = (row) => row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
    const headers = parseCells(rows[0])
    const bodyRows = rows.slice(2)
    return (
      <table className="border-collapse border border-gray-300 my-2 text-sm">
        <thead><tr>{headers.map((h, i) => <th key={i} className="border border-gray-300 px-3 py-1 bg-gray-100">{renderLatex(h)}</th>)}</tr></thead>
        <tbody>{bodyRows.map((row, ri) => <tr key={ri}>{parseCells(row).map((cell, ci) => <td key={ci} className="border border-gray-300 px-3 py-1">{renderLatex(cell)}</td>)}</tr>)}</tbody>
      </table>
    )
  }

  const renderContent = (text) => {
    if (!text) return null
    const normalized = text.replace(/<br\s*\/?>/gi, '\n')
    const imgParts = normalized.split(/(!\[.*?\]\(.*?\))/g)
    return (
      <div className="whitespace-pre-wrap">
        {imgParts.map((part, idx) => {
          const imgMatch = part.match(/!\[.*?\]\((.*?)\)/)
          if (imgMatch) return <div key={idx} className="my-2"><img src={imgMatch[1]} alt="Question" className="max-w-full h-auto rounded border" onError={e => { e.target.style.border = '2px solid red' }} /></div>
          if (/^\|.+\|/.test(part.trim()) && part.includes('\n')) {
            const tableMatch = part.match(/((?:\|.+\|\n?)+)/g)
            if (tableMatch) {
              const segments = []; let remaining = part
              for (const tbl of tableMatch) {
                const tblIdx = remaining.indexOf(tbl)
                if (tblIdx > 0) segments.push(<span key={'pre' + idx}>{renderLatex(remaining.slice(0, tblIdx))}</span>)
                segments.push(<div key={'tbl' + idx}>{renderTable(tbl)}</div>)
                remaining = remaining.slice(tblIdx + tbl.length)
              }
              if (remaining) segments.push(<span key={'post' + idx}>{renderLatex(remaining)}</span>)
              return <span key={idx}>{segments}</span>
            }
          }
          return <span key={idx}>{renderLatex(part)}</span>
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Preview & Approve Questions</h2>
            <p className="text-sm text-gray-600 mt-1">Review {editedQuestions.length} question(s) before saving</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-amber-900 mb-2">Apply Remark to All Questions</label>
                <textarea value={globalRemark} onChange={(e) => setGlobalRemark(e.target.value)} className="w-full border border-amber-300 rounded px-3 py-2 text-sm" rows={2} placeholder="Enter remark for all questions..." />
              </div>
              <button onClick={applyGlobalRemark} disabled={!globalRemark.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap mt-6">Apply to All</button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">{expandedQuestions.size} of {editedQuestions.length} expanded</div>
            <div className="flex gap-2">
              <button onClick={expandAll} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Expand All</button>
              <button onClick={collapseAll} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Collapse All</button>
            </div>
          </div>

          <div className="space-y-4">
            {editedQuestions.map((question, qIndex) => {
              const isExpanded = expandedQuestions.has(qIndex)
              const isEditing = editingQuestion === qIndex
              return (
                <div key={question.id || qIndex} className={`border rounded-lg bg-white shadow-sm ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => !isEditing && toggleExpand(qIndex)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-500 flex-shrink-0">#{qIndex + 1}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs rounded-full ${question.subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{question.subject}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : question.difficulty === 'Hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{question.difficulty}</span>
                        {hasImage(question.content) && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><FiImage className="w-3 h-3" /> Image</span>}
                      </div>
                      <p className="text-sm text-gray-700 truncate flex-1">{plainText(question.content).substring(0, 100)}</p>
                    </div>
                    <div className="flex-shrink-0">{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t bg-gray-50" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">Question Details {isEditing && <span className="ml-2 text-sm text-blue-600">(Editing)</span>}</h3>
                          <div className="flex gap-2">
                            {isEditing
                              ? <button onClick={(e) => { e.stopPropagation(); saveEdit() }} className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-1"><FiSave className="w-4 h-4" /> Save</button>
                              : <button onClick={(e) => { e.stopPropagation(); startEdit(qIndex) }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"><FiEdit2 className="w-4 h-4" /> Edit</button>}
                            <button onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex) }} className="px-3 py-1 bg-red-600 text-white rounded text-sm flex items-center gap-1"><FiX className="w-4 h-4" /> Remove</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            {isEditing ? <select value={question.subject} onChange={(e) => updateQuestion(qIndex, 'subject', e.target.value)} className="w-full border rounded px-3 py-2"><option value="Math">Math</option><option value="Reading and Writing">Reading and Writing</option></select> : <p>{question.subject}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                            {isEditing ? <select value={question.difficulty} onChange={(e) => updateQuestion(qIndex, 'difficulty', e.target.value)} className="w-full border rounded px-3 py-2"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select> : <p>{question.difficulty}</p>}
                          </div>
                        </div>

                        {(question.questionParagraph || isEditing) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Passage / Context</label>
                            {isEditing ? <textarea value={question.questionParagraph || ''} onChange={(e) => updateQuestion(qIndex, 'questionParagraph', e.target.value)} className="w-full border rounded px-3 py-2 font-mono text-sm" rows={4} placeholder="Passage or context..." /> : <div className="bg-blue-50 p-3 rounded border border-blue-200">{renderContent(question.questionParagraph)}</div>}
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Question Content</label>
                          {isEditing
                            ? <div><textarea value={question.content} onChange={(e) => updateQuestion(qIndex, 'content', e.target.value)} className="w-full border rounded px-3 py-2 font-mono text-sm" rows={6} /><details className="mt-1"><summary className="text-xs text-gray-400 cursor-pointer">Raw</summary><pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{question.content}</pre></details></div>
                            : <div className="bg-white p-3 rounded border">{renderContent(question.content)}</div>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(question.options || []).map((option, optIndex) => (
                              <div key={optIndex} className="flex items-start gap-2">
                                <span className={`px-2 py-1 rounded text-sm font-medium flex-shrink-0 ${question.correctAnswer === String.fromCharCode(65 + optIndex) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{String.fromCharCode(65 + optIndex)}</span>
                                {isEditing ? <textarea value={option} onChange={(e) => updateOption(qIndex, optIndex, e.target.value)} className="flex-1 border rounded px-3 py-2 font-mono text-sm" rows={2} /> : <div className="flex-1 bg-white p-2 rounded border">{renderContent(option)}</div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                          {isEditing ? <select value={question.correctAnswer} onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)} className="w-full border rounded px-3 py-2"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select> : <p className="text-green-600 font-semibold">{question.correctAnswer}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Short Explanation</label>
                          {isEditing
                            ? <textarea value={question.shortExplanation || question.explanation || ''} onChange={(e) => updateQuestion(qIndex, 'shortExplanation', e.target.value)} className="w-full border rounded px-3 py-2 font-mono text-sm" rows={4} placeholder="Add short explanation..." />
                            : (question.shortExplanation || question.explanation)
                              ? <div className="bg-white p-3 rounded border">{renderContent(question.shortExplanation || question.explanation)}</div>
                              : <p className="text-xs text-gray-400 italic">No short explanation — click Edit to add</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Long Explanation</label>
                          {isEditing
                            ? <textarea value={question.longExplanation || ''} onChange={(e) => updateQuestion(qIndex, 'longExplanation', e.target.value)} className="w-full border rounded px-3 py-2 font-mono text-sm" rows={6} placeholder="Add long explanation..." />
                            : question.longExplanation
                              ? <div className="bg-white p-3 rounded border">{renderContent(question.longExplanation)}</div>
                              : <p className="text-xs text-gray-400 italic">No long explanation — click Edit to add</p>}
                        </div>

                        {question.tags && question.tags.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                            <div className="flex flex-wrap gap-2">{question.tags.map((tag, ti) => <span key={ti} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{tag}</span>)}</div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                          <textarea value={question.remark || ''} onChange={(e) => updateQuestion(qIndex, 'remark', e.target.value)} className="w-full border border-amber-300 rounded px-3 py-2 text-sm" rows={2} placeholder="Add notes or remarks..." />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">{editedQuestions.length} question(s) ready</div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
            <button onClick={handleApprove} disabled={approving || editedQuestions.length === 0} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              <FiCheck className="w-5 h-5" />{approving ? 'Approving...' : 'Approve & Save All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}