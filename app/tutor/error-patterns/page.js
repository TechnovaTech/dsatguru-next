'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthContext'
import { FiRefreshCw, FiCheck, FiX, FiEdit2, FiSave, FiChevronDown, FiChevronRight } from 'react-icons/fi'

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700'
}

const emptyRow = {
  topic: '', section: '', studentsAffected: '', timesSeen: '',
  difficulty: 'Medium', dateFirstSeen: '', recommendedFix: '', taughtInSession: false
}

export default function ErrorPatternsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newRow, setNewRow] = useState({ ...emptyRow })
  const [expandedIdx, setExpandedIdx] = useState(null)

  useEffect(() => { fetchPatterns() }, [])

  const fetchPatterns = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tutor/error-patterns', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const saved = JSON.parse(localStorage.getItem('tutor_error_patterns') || '[]')
        const autoKeys = new Set(data.map(r => `${r.topic}__${r.section}`))
        const manualOnly = saved.filter(r => r._manual && !autoKeys.has(`${r.topic}__${r.section}`))
        setRows([...data, ...manualOnly])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveLocal = (updated) => {
    localStorage.setItem('tutor_error_patterns', JSON.stringify(updated.filter(r => r._manual)))
  }

  const toggleExpand = (idx) => setExpandedIdx(expandedIdx === idx ? null : idx)

  const startEdit = (idx) => { setEditingIdx(idx); setEditRow({ ...rows[idx] }) }
  const saveEdit = (idx) => {
    const updated = rows.map((r, i) => i === idx ? { ...editRow } : r)
    setRows(updated); saveLocal(updated); setEditingIdx(null); setEditRow(null)
  }
  const cancelEdit = () => { setEditingIdx(null); setEditRow(null) }

  const toggleTaught = (idx) => {
    const updated = rows.map((r, i) => i === idx ? { ...r, taughtInSession: !r.taughtInSession } : r)
    setRows(updated); saveLocal(updated)
  }

  const addRow = () => {
    const updated = [...rows, { ...newRow, _manual: true }]
    setRows(updated); saveLocal(updated); setNewRow({ ...emptyRow }); setAddingNew(false)
  }

  const deleteRow = (idx) => {
    const updated = rows.filter((_, i) => i !== idx)
    setRows(updated); saveLocal(updated)
  }

  const Cell = ({ children, className = '' }) => (
    <td className={`px-3 py-3 text-sm text-gray-700 ${className}`}>{children}</td>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">❌</span>
              <h1 className="text-2xl font-bold text-gray-900">ERROR PATTERNS</h1>
            </div>
            <p className="text-gray-500 text-sm">
              Spot What Multiple Students Are Getting Wrong — When 2+ students miss the same topic, it appears here automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPatterns}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh from Exams
            </button>
            <button
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              + Add Manual Row
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-red-50">
              <tr>
                <th className="px-3 py-3 w-8"></th>
                {['Topic / Subtopic', 'Section', 'Students Affected', 'Times Seen', 'Difficulty Level', 'Date First Seen', 'Recommended Fix / Lesson', 'Taught in Session?', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">Loading from exam data...</td></tr>
              ) : rows.length === 0 && !addingNew ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-400">
                    No error patterns yet. Once 2+ students miss the same topic, it will appear here automatically.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <>
                    {editingIdx === idx ? (
                      <tr key={`edit-${idx}`} className="bg-yellow-50">
                        <td />
                        <td className="px-2 py-2"><input className="border rounded px-2 py-1 text-sm w-full" value={editRow.topic} onChange={e => setEditRow({ ...editRow, topic: e.target.value })} /></td>
                        <td className="px-2 py-2"><input className="border rounded px-2 py-1 text-sm w-full" value={editRow.section} onChange={e => setEditRow({ ...editRow, section: e.target.value })} /></td>
                        <td className="px-2 py-2"><input type="number" className="border rounded px-2 py-1 text-sm w-20" value={editRow.studentsAffected} onChange={e => setEditRow({ ...editRow, studentsAffected: e.target.value })} /></td>
                        <td className="px-2 py-2"><input type="number" className="border rounded px-2 py-1 text-sm w-20" value={editRow.timesSeen} onChange={e => setEditRow({ ...editRow, timesSeen: e.target.value })} /></td>
                        <td className="px-2 py-2">
                          <select className="border rounded px-2 py-1 text-sm" value={editRow.difficulty} onChange={e => setEditRow({ ...editRow, difficulty: e.target.value })}>
                            <option>Easy</option><option>Medium</option><option>Hard</option>
                          </select>
                        </td>
                        <td className="px-2 py-2"><input type="date" className="border rounded px-2 py-1 text-sm" value={editRow.dateFirstSeen ? new Date(editRow.dateFirstSeen).toISOString().slice(0, 10) : ''} onChange={e => setEditRow({ ...editRow, dateFirstSeen: e.target.value })} /></td>
                        <td className="px-2 py-2"><input className="border rounded px-2 py-1 text-sm w-full" value={editRow.recommendedFix} onChange={e => setEditRow({ ...editRow, recommendedFix: e.target.value })} /></td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={editRow.taughtInSession} onChange={e => setEditRow({ ...editRow, taughtInSession: e.target.checked })} className="w-4 h-4" />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(idx)} className="p-1 text-green-600 hover:bg-green-50 rounded"><FiSave /></button>
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><FiX /></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={`row-${idx}`} className={`hover:bg-gray-50 cursor-pointer ${row._manual ? 'border-l-4 border-l-blue-300' : ''}`}>
                        <td className="px-3 py-3 text-gray-400" onClick={() => !row._manual && row.questions?.length && toggleExpand(idx)}>
                          {!row._manual && row.questions?.length > 0 && (
                            expandedIdx === idx ? <FiChevronDown /> : <FiChevronRight />
                          )}
                        </td>
                        <Cell className="font-medium text-gray-900" onClick={() => !row._manual && row.questions?.length && toggleExpand(idx)}>
                          {row.topic}
                        </Cell>
                        <Cell>{row.section}</Cell>
                        <Cell>
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              👥 {row.studentsAffected}
                            </span>
                            {row.studentNames?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {row.studentNames.map((name, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Cell>
                        <Cell>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{row.timesSeen}×</span>
                        </Cell>
                        <Cell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${DIFFICULTY_COLORS[row.difficulty] || DIFFICULTY_COLORS.Medium}`}>
                            {row.difficulty}
                          </span>
                        </Cell>
                        <Cell>{row.dateFirstSeen ? new Date(row.dateFirstSeen).toLocaleDateString() : '—'}</Cell>
                        <Cell className="max-w-xs">
                          <span className="text-gray-600">{row.recommendedFix || <span className="text-gray-300 italic">—</span>}</span>
                        </Cell>
                        <Cell className="text-center">
                          <button onClick={() => toggleTaught(idx)} className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-colors ${row.taughtInSession ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-100'}`}>
                            <FiCheck className="w-4 h-4" />
                          </button>
                        </Cell>
                        <Cell>
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(idx)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><FiEdit2 /></button>
                            {row._manual && (
                              <button onClick={() => deleteRow(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded"><FiX /></button>
                            )}
                          </div>
                        </Cell>
                      </tr>
                    )}

                    {/* Expanded questions panel */}
                    {expandedIdx === idx && !row._manual && row.questions?.length > 0 && (
                      <tr key={`expand-${idx}`}>
                        <td colSpan={10} className="bg-gray-50 px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Questions students got wrong in this topic</p>
                          <div className="flex flex-col gap-3">
                            {row.questions.map((q, qi) => (
                              <div key={qi} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-sm text-gray-800 flex-1">{q.content}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.Medium}`}>
                                    {q.difficulty}
                                  </span>
                                </div>
                                {q.students?.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-xs text-gray-400 mr-1">Missed by:</span>
                                    {q.students.map((name, si) => (
                                      <span key={si} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs">{name}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}

              {/* Add new row inline */}
              {addingNew && (
                <tr className="bg-green-50">
                  <td />
                  <td className="px-2 py-2"><input className="border rounded px-2 py-1 text-sm w-full" placeholder="Topic / Subtopic" value={newRow.topic} onChange={e => setNewRow({ ...newRow, topic: e.target.value })} /></td>
                  <td className="px-2 py-2"><input className="border rounded px-2 py-1 text-sm w-full" placeholder="Section" value={newRow.section} onChange={e => setNewRow({ ...newRow, section: e.target.value })} /></td>
                  <td className="px-2 py-2"><input type="number" className="border rounded px-2 py-1 text-sm w-20" placeholder="0" value={newRow.studentsAffected} onChange={e => setNewRow({ ...newRow, studentsAffected: e.target.value })} /></td>
                  <td className="px-2 py-2"><input type="number" className="border rounded px-2 py-1 text-sm w-20" placeholder="0" value={newRow.timesSeen} onChange={e => setNewRow({ ...newRow, timesSeen: e.target.value })} /></td>
                  <td className="px-2 py-2">
                    <select className="border rounded px-2 py-1 text-sm" value={newRow.difficulty} onChange={e => setNewRow({ ...newRow, difficulty: e.target.value })}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </td>
                  <td className="px-2 py-2"><input type="date" className="border rounded px-2 py-1 text-sm" value={newRow.dateFirstSeen} onChange={e => setNewRow({ ...newRow, dateFirstSeen: e.target.value })} /></td>
                  <td className="px-2 py-2"><input className="border rounded px-2 py-1 text-sm w-full" placeholder="Recommended fix..." value={newRow.recommendedFix} onChange={e => setNewRow({ ...newRow, recommendedFix: e.target.value })} /></td>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={newRow.taughtInSession} onChange={e => setNewRow({ ...newRow, taughtInSession: e.target.checked })} className="w-4 h-4" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={addRow} className="p-1 text-green-600 hover:bg-green-100 rounded"><FiSave /></button>
                      <button onClick={() => setAddingNew(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><FiX /></button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 border-l-4 border-blue-300 inline-block"></span> Manual entry</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded-full inline-block"></span> Auto-detected from exam data</span>
          <span>✅ Green checkmark = taught in session</span>
          <span>▶ Click topic row to see questions</span>
        </div>
      </div>
    </div>
  )
}
