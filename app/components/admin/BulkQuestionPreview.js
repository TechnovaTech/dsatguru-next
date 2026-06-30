'use client'
import { useState, useRef, useEffect } from 'react'
import { FiCheck, FiX, FiEdit2, FiImage, FiChevronDown, FiChevronUp, FiSave, FiInbox } from 'react-icons/fi'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useToast } from '../ui/UIProvider'

export default function BulkQuestionPreview({ questions, onApprove, onCancel, questionBankId, isTutor }) {
  const toast = useToast()
  const [editedQuestions, setEditedQuestions] = useState(questions)
  const [expandedQuestions, setExpandedQuestions] = useState(new Set([0]))
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [approving, setApproving] = useState(false)
  const [globalRemark, setGlobalRemark] = useState('')
  const [uploadingField, setUploadingField] = useState(null) // 'qIndex-field' or 'qIndex-opt-optIndex'
  const imgInputRef = useRef(null)
  const pendingUpload = useRef(null) // { qIndex, field, optIndex? }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

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
    if (!globalRemark.trim()) { toast.error('Please enter a remark'); return }
    setEditedQuestions(editedQuestions.map(q => ({ ...q, remark: globalRemark })))
    toast.success(`Remark applied to all ${editedQuestions.length} questions!`)
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

  const triggerImageUpload = (qIndex, field, optIndex = null) => {
    pendingUpload.current = { qIndex, field, optIndex }
    imgInputRef.current && imgInputRef.current.click()
  }

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !pendingUpload.current) return
    const { qIndex, field, optIndex } = pendingUpload.current
    const key = optIndex !== null ? `${qIndex}-opt-${optIndex}` : `${qIndex}-${field}`
    setUploadingField(key)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      })
      const data = await res.json()
      if (!res.ok || !data.url) { toast.error(data.error || 'Image upload failed'); return }
      const md = `![image](${data.url})`
      if (optIndex !== null) {
        const updated = [...editedQuestions]
        const newOptions = [...updated[qIndex].options]
        newOptions[optIndex] = (newOptions[optIndex] || '') + '\n' + md
        updated[qIndex] = { ...updated[qIndex], options: newOptions }
        setEditedQuestions(updated)
      } else {
        const prev = editedQuestions[qIndex][field] || ''
        updateQuestion(qIndex, field, prev + '\n' + md)
      }
    } catch (err) {
      toast.error('Image upload failed: ' + err.message)
    } finally {
      setUploadingField(null)
      pendingUpload.current = null
      e.target.value = ''
    }
  }

  const ImgBtn = ({ qIndex, field, optIndex = null }) => {
    const key = optIndex !== null ? `${qIndex}-opt-${optIndex}` : `${qIndex}-${field}`
    const busy = uploadingField === key
    return (
      <button
        type="button"
        onClick={() => triggerImageUpload(qIndex, field, optIndex)}
        disabled={busy}
        title="Upload image"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg disabled:opacity-50"
      >
        <FiImage className="w-3 h-3" />{busy ? 'Uploading…' : 'Image'}
      </button>
    )
  }

  const handleApprove = async () => {
    setApproving(true)
    try { await onApprove(editedQuestions) } finally { setApproving(false) }
  }

  const hasImage = (text) => !!(text && /!\[.*?\]\(.*?\)/.test(text))

  const ImagePreviews = ({ text }) => {
    if (!text) return null
    const urls = []
    const re = /!\[.*?\]\((.*?)\)/g
    let m
    while ((m = re.exec(text)) !== null) urls.push(m[1])
    if (!urls.length) return null
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((url, i) => (
          <div key={i} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <img src={url} alt={`img-${i}`} className="h-20 w-auto max-w-[160px] object-contain" onError={e => { e.target.style.border = '2px solid red' }} />
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{url.split('/').pop()}</div>
          </div>
        ))}
      </div>
    )
  }

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
      <table className="border-collapse border border-slate-300 my-2 text-sm">
        <thead><tr>{headers.map((h, i) => <th key={i} className="border border-slate-300 px-3 py-1 bg-slate-100">{renderLatex(h)}</th>)}</tr></thead>
        <tbody>{bodyRows.map((row, ri) => <tr key={ri}>{parseCells(row).map((cell, ci) => <td key={ci} className="border border-slate-300 px-3 py-1">{renderLatex(cell)}</td>)}</tr>)}</tbody>
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
          if (imgMatch) return <div key={idx} className="my-2"><img src={imgMatch[1]} alt="Question" className="max-w-full h-auto rounded-lg border border-slate-200" onError={e => { e.target.style.border = '2px solid red' }} /></div>
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
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      {/* Hidden global image input shared across all fields. stopPropagation: the
          programmatic .click() must not bubble to the backdrop's onCancel (which would
          close the whole modal before the file picker could be used). */}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleImageFileChange} />
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Preview &amp; Approve Questions</h2>
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-semibold text-indigo-600">{editedQuestions.length}</span> question(s) parsed — review before saving
            </p>
          </div>
          <button onClick={onCancel} aria-label="Close preview" className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"><FiX className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label htmlFor="bulk-global-remark" className="block text-sm font-semibold text-amber-900 mb-2">Apply Remark to All Questions</label>
                <textarea id="bulk-global-remark" value={globalRemark} onChange={(e) => setGlobalRemark(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={2} placeholder="Enter remark for all questions..." />
              </div>
              <button onClick={applyGlobalRemark} disabled={!globalRemark.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap mt-6">Apply to All</button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">{expandedQuestions.size} of {editedQuestions.length} expanded</div>
            <div className="flex gap-2">
              <button onClick={expandAll} className="px-3 py-1 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">Expand All</button>
              <button onClick={collapseAll} className="px-3 py-1 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">Collapse All</button>
            </div>
          </div>

          {editedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FiInbox className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-600">No questions to preview</h3>
              <p className="mt-1 text-sm text-slate-400">All parsed questions were removed. Cancel to start over.</p>
            </div>
          ) : (
          <div className="space-y-4">
            {editedQuestions.map((question, qIndex) => {
              const isExpanded = expandedQuestions.has(qIndex)
              const isEditing = editingQuestion === qIndex
              return (
                <div key={question.id || qIndex} className={`border border-slate-100 rounded-2xl bg-white shadow-sm ${isEditing ? 'ring-2 ring-indigo-500' : ''}`}>
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50/40 transition-colors rounded-2xl" onClick={() => !isEditing && toggleExpand(qIndex)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-500 flex-shrink-0">#{qIndex + 1}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs rounded-full ${question.subject === 'Math' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{question.subject}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${question.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' : question.difficulty === 'Hard' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{question.difficulty}</span>
                        {hasImage(question.content) && <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 flex items-center gap-1"><FiImage className="w-3 h-3" /> Image</span>}
                      </div>
                      <p className="text-sm text-slate-700 truncate flex-1">{plainText(question.content).substring(0, 100)}</p>
                    </div>
                    <div className="flex-shrink-0 text-slate-400">{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900">Question Details {isEditing && <span className="ml-2 text-sm text-indigo-600">(Editing)</span>}</h3>
                          <div className="flex gap-2">
                            {isEditing
                              ? <button onClick={(e) => { e.stopPropagation(); saveEdit() }} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-1"><FiSave className="w-4 h-4" /> Save</button>
                              : <button onClick={(e) => { e.stopPropagation(); startEdit(qIndex) }} className="px-3 py-1 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm flex items-center gap-1"><FiEdit2 className="w-4 h-4" /> Edit</button>}
                            <button onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex) }} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1"><FiX className="w-4 h-4" /> Remove</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor={`q-${qIndex}-subject`} className="block text-sm font-medium text-slate-600 mb-1">Subject</label>
                            {isEditing ? <select id={`q-${qIndex}-subject`} value={question.subject} onChange={(e) => updateQuestion(qIndex, 'subject', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"><option value="Math">Math</option><option value="Reading and Writing">Reading and Writing</option></select> : <p className="text-slate-900">{question.subject}</p>}
                          </div>
                          <div>
                            <label htmlFor={`q-${qIndex}-difficulty`} className="block text-sm font-medium text-slate-600 mb-1">Difficulty</label>
                            {isEditing ? <select id={`q-${qIndex}-difficulty`} value={question.difficulty} onChange={(e) => updateQuestion(qIndex, 'difficulty', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select> : <p className="text-slate-900">{question.difficulty}</p>}
                          </div>
                          <div>
                            <label htmlFor={`q-${qIndex}-type`} className="block text-sm font-medium text-slate-600 mb-1">Question Type</label>
                            {isEditing ? (
                              <select id={`q-${qIndex}-type`} value={question.type || 'MultipleChoice'} onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                <option value="MultipleChoice">Multiple Choice</option>
                                <option value="ShortAnswer">Short Answer (Grid-in)</option>
                                <option value="TrueFalse">True/False</option>
                                <option value="Essay">Essay</option>
                              </select>
                            ) : (
                              <p className="font-medium text-indigo-600">{question.type || 'MultipleChoice'}</p>
                            )}
                          </div>
                        </div>

                        {(question.questionParagraph || isEditing) && (
                          <div>
                            <label htmlFor={`q-${qIndex}-paragraph`} className="block text-sm font-medium text-slate-600 mb-1">Passage / Context</label>
                            {isEditing ? <textarea id={`q-${qIndex}-paragraph`} value={question.questionParagraph || ''} onChange={(e) => updateQuestion(qIndex, 'questionParagraph', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={4} placeholder="Passage or context..." /> : <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">{renderContent(question.questionParagraph)}</div>}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor={`q-${qIndex}-content`} className="block text-sm font-medium text-slate-600">Question Content</label>
                            {isEditing && <ImgBtn qIndex={qIndex} field="content" />}
                          </div>
                          {isEditing
                            ? <div><textarea id={`q-${qIndex}-content`} value={question.content} onChange={(e) => updateQuestion(qIndex, 'content', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={6} /><ImagePreviews text={question.content} /><details className="mt-1"><summary className="text-xs text-slate-400 cursor-pointer">Raw</summary><pre className="text-xs bg-slate-100 p-2 rounded-lg overflow-x-auto">{question.content}</pre></details></div>
                            : <div className="bg-white p-3 rounded-lg border border-slate-100">{renderContent(question.content)}</div>}
                        </div>

                        {(Array.isArray(question.options) && question.options.some(o => String(o || '').trim())) && (
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Answer Options</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(question.options || []).map((option, optIndex) => (
                                <div key={optIndex} className="flex items-start gap-2">
                                  <span className={`px-2 py-1 rounded-lg text-sm font-medium flex-shrink-0 ${question.correctAnswer === String.fromCharCode(65 + optIndex) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{String.fromCharCode(65 + optIndex)}</span>
                                  {isEditing
                                    ? <div className="flex-1 space-y-1"><textarea aria-label={`Option ${String.fromCharCode(65 + optIndex)} for question ${qIndex + 1}`} value={option} onChange={(e) => updateOption(qIndex, optIndex, e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={2} /><ImagePreviews text={option} /><ImgBtn qIndex={qIndex} field="option" optIndex={optIndex} /></div>
                                    : <div className="flex-1 bg-white p-2 rounded-lg border border-slate-100">{renderContent(option)}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label htmlFor={`q-${qIndex}-correct`} className="block text-sm font-medium text-slate-600 mb-1">Correct Answer{!(Array.isArray(question.options) && question.options.some(o => String(o || '').trim())) && ' (Fill-in-the-Blank)'}</label>
                          {isEditing ? (
                            !(Array.isArray(question.options) && question.options.some(o => String(o || '').trim())) ? (
                              <input
                                id={`q-${qIndex}-correct`}
                                type="text"
                                value={question.correctAnswer}
                                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="Enter numeric answer or text..."
                              />
                            ) : (
                              <select id={`q-${qIndex}-correct`} value={question.correctAnswer} onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            )
                          ) : (
                            <p className="text-emerald-600 font-semibold">{question.correctAnswer}</p>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor={`q-${qIndex}-shortExp`} className="block text-sm font-medium text-slate-600">Short Explanation</label>
                            {isEditing && <ImgBtn qIndex={qIndex} field="shortExplanation" />}
                          </div>
                          {isEditing
                            ? <div><textarea id={`q-${qIndex}-shortExp`} value={question.shortExplanation || question.explanation || ''} onChange={(e) => updateQuestion(qIndex, 'shortExplanation', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={4} placeholder="Add short explanation..." /><ImagePreviews text={question.shortExplanation || question.explanation} /></div>
                            : (question.shortExplanation || question.explanation)
                              ? <div className="bg-white p-3 rounded-lg border border-slate-100">{renderContent(question.shortExplanation || question.explanation)}</div>
                              : <p className="text-xs text-slate-400 italic">No short explanation — click Edit to add</p>}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor={`q-${qIndex}-longExp`} className="block text-sm font-medium text-slate-600">Long Explanation</label>
                            {isEditing && <ImgBtn qIndex={qIndex} field="longExplanation" />}
                          </div>
                          {isEditing
                            ? <div><textarea id={`q-${qIndex}-longExp`} value={question.longExplanation || ''} onChange={(e) => updateQuestion(qIndex, 'longExplanation', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={6} placeholder="Add long explanation..." /><ImagePreviews text={question.longExplanation} /></div>
                            : question.longExplanation
                              ? <div className="bg-white p-3 rounded-lg border border-slate-100">{renderContent(question.longExplanation)}</div>
                              : <p className="text-xs text-slate-400 italic">No long explanation — click Edit to add</p>}
                        </div>

                        {question.tags && question.tags.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Tags</label>
                            <div className="flex flex-wrap gap-2">{question.tags.map((tag, ti) => <span key={ti} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">{tag}</span>)}</div>
                          </div>
                        )}

                        <div>
                          <label htmlFor={`q-${qIndex}-remark`} className="block text-sm font-medium text-slate-600 mb-1">Remark</label>
                          <textarea id={`q-${qIndex}-remark`} value={question.remark || ''} onChange={(e) => updateQuestion(qIndex, 'remark', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" rows={2} placeholder="Add notes or remarks..." />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            <span className="text-lg font-extrabold text-slate-900">{editedQuestions.length}</span> question(s) ready to save
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleApprove} disabled={approving || editedQuestions.length === 0} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors">
              {approving
                ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : <FiCheck className="w-5 h-5" />}
              {approving ? 'Approving...' : 'Approve & Save All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}