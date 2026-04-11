'use client'
import { useState, useEffect } from 'react'

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
}

const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') : ''

export default function RedoQueuePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Pending')

  useEffect(() => {
    fetch('/api/redo-queue', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .finally(() => setLoading(false))
  }, [])

  const markStatus = async (id, status) => {
    const res = await fetch('/api/redo-queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ id, status })
    })
    const data = await res.json()
    setItems(prev => prev.map(i => i._id === id ? { ...i, ...data.item } : i))
  }

  const filtered = filter === 'All' ? items : items.filter(i => i.status === filter)

  const stats = {
    pending: items.filter(i => i.status === 'Pending').length,
    overdue: items.filter(i => i.status === 'Overdue').length,
    completed: items.filter(i => i.status === 'Completed').length,
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading redo queue...</div>

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🔁 My Redo Queue</h1>
        <p className="text-gray-500 text-sm mt-1">Questions you need to redo — sorted by due date.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['Pending', 'Overdue', 'Completed', 'All'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-blue-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
            No items in this category.
          </div>
        )}
        {filtered.map(item => (
          <div key={item._id} className="bg-white rounded-xl p-4 shadow-sm border flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                  {item.status}
                </span>
                {item.section && <span className="text-xs text-gray-400">{item.section}</span>}
                {item.topic && <span className="text-xs text-blue-500 font-medium">• {item.topic}</span>}
                {item.difficulty && <span className="text-xs text-gray-400">• {item.difficulty}</span>}
              </div>
              <p className="text-sm text-gray-700 font-medium line-clamp-2">
                {item.questionDescription || item.questionId?.content || 'Question'}
              </p>
              {item.whyWrong && (
                <p className="text-xs text-red-500 mt-1">❌ {item.whyWrong}</p>
              )}
              {item.correctConcept && (
                <p className="text-xs text-green-600 mt-0.5">✅ {item.correctConcept}</p>
              )}
              {item.redoDueDate && (
                <p className="text-xs text-gray-400 mt-1">
                  Due: {new Date(item.redoDueDate).toLocaleDateString()}
                </p>
              )}
            </div>
            {item.status !== 'Completed' && (
              <button
                onClick={() => markStatus(item._id, 'Completed')}
                className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                ✓ Mark Done
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
