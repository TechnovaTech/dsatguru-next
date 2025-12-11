'use client'
import { useState } from 'react'
import { FiTarget, FiCalendar, FiClock, FiCheck } from 'react-icons/fi'

export default function StudyPlanPage() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Practice Algebra: Linear Equations', subject: 'Math', due: 'Today', duration: '45m', completed: false },
    { id: 2, title: 'Reading: Inference Questions', subject: 'Reading & Writing', due: 'Tomorrow', duration: '30m', completed: false },
    { id: 3, title: 'Grammar: Sentence Structure', subject: 'Reading & Writing', due: 'Fri', duration: '30m', completed: false },
  ])

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Plan</h1>
        <p className="text-gray-600">Plan your weekly schedule and track progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Target Score</p>
              <p className="text-2xl font-bold text-blue-600">1400</p>
            </div>
            <FiTarget className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Weekly Hours</p>
              <p className="text-2xl font-bold text-purple-600">6h</p>
            </div>
            <FiClock className="text-purple-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Upcoming Tasks</p>
              <p className="text-2xl font-bold text-green-600">{tasks.filter(t => !t.completed).length}</p>
            </div>
            <FiCalendar className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-600 text-white p-2 rounded-lg mr-3">
              <FiCalendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
              <p className="text-sm text-gray-600">Balanced plan for Math and Reading & Writing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Math</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Mon • Algebra</span>
                  <span className="text-xs text-gray-500">45m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Wed • Geometry</span>
                  <span className="text-xs text-gray-500">45m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sat • Full-length practice</span>
                  <span className="text-xs text-gray-500">90m</span>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Reading & Writing</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Tue • Inference</span>
                  <span className="text-xs text-gray-500">30m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Thu • Grammar</span>
                  <span className="text-xs text-gray-500">30m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sun • Vocabulary</span>
                  <span className="text-xs text-gray-500">30m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Tasks</h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>{task.title}</div>
                  <div className="text-xs text-gray-600">{task.subject} • {task.due} • {task.duration}</div>
                </div>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${task.completed ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'} hover:opacity-90`}
                >
                  <FiCheck />
                  {task.completed ? 'Done' : 'Mark Done'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

