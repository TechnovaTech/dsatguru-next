import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiVideo, FiDownload, FiCalendar, FiFileText, FiMessageSquare, FiSave } from "react-icons/fi";

const CourseContentManagement = ({ courseId, courseName, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [courseContent, setCourseContent] = useState({
    overview: {
      instructor: 'Dr. Sarah Johnson',
      startDate: '2024-01-15',
      endDate: '2024-06-15',
      progress: 65
    },
    meetings: [
      {
        id: 1,
        title: 'Math Problem Solving Session',
        date: '2024-01-25',
        time: '6:00 PM',
        instructor: 'Dr. Sarah Johnson',
        status: 'upcoming',
        zoomLink: 'https://zoom.us/j/123456789'
      }
    ],
    materials: [
      {
        id: 1,
        type: 'pdf',
        title: 'Algebra Formulas Guide',
        url: '#',
        uploadDate: '2024-01-20'
      },
      {
        id: 2,
        type: 'video',
        title: 'Class Recording - Jan 20',
        url: '#',
        uploadDate: '2024-01-20'
      }
    ],
    syllabus: [
      {
        id: 1,
        week: 1,
        title: 'Algebra Fundamentals',
        completed: true,
        materials: ['PDF Notes', 'Video Lecture']
      },
      {
        id: 2,
        week: 2,
        title: 'Linear Equations',
        completed: true,
        materials: ['Practice Problems']
      }
    ],
    assignments: [
      {
        id: 1,
        title: 'Math Practice Test 1',
        dueDate: '2024-01-30',
        status: 'active',
        submissions: 15
      }
    ]
  });

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const handleSave = () => {
    // Save course content to backend
    console.log('Saving course content:', courseContent);
    alert('Course content saved successfully!');
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setEditingItem(null);
  };

  const addOrUpdateItem = (type, item) => {
    setCourseContent(prev => {
      const newContent = { ...prev };
      if (item.id) {
        // Update existing item
        const index = newContent[type].findIndex(i => i.id === item.id);
        if (index !== -1) {
          newContent[type][index] = item;
        }
      } else {
        // Add new item
        const newId = Math.max(...newContent[type].map(i => i.id || 0)) + 1;
        newContent[type].push({ ...item, id: newId });
      }
      return newContent;
    });
    closeModal();
  };

  const deleteItem = (type, id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setCourseContent(prev => ({
        ...prev,
        [type]: prev[type].filter(item => item.id !== id)
      }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-2">
            ← Back to Courses
          </button>
          <h1 className="text-2xl font-bold">Course Content Management</h1>
          <p className="text-gray-600">{courseName}</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
        >
          <FiSave /> Save All Changes
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          {[
            { id: 'overview', label: 'Overview', icon: <FiFileText size={16} /> },
            { id: 'meetings', label: 'Live Meetings', icon: <FiVideo size={16} /> },
            { id: 'materials', label: 'Materials', icon: <FiDownload size={16} /> },
            { id: 'syllabus', label: 'Syllabus', icon: <FiCalendar size={16} /> },
            { id: 'assignments', label: 'Assignments', icon: <FiFileText size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Course Overview Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Instructor Name</label>
                <input
                  type="text"
                  value={courseContent.overview.instructor}
                  onChange={(e) => setCourseContent(prev => ({
                    ...prev,
                    overview: { ...prev.overview, instructor: e.target.value }
                  }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={courseContent.overview.progress}
                  onChange={(e) => setCourseContent(prev => ({
                    ...prev,
                    overview: { ...prev.overview, progress: parseInt(e.target.value) }
                  }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={courseContent.overview.startDate}
                  onChange={(e) => setCourseContent(prev => ({
                    ...prev,
                    overview: { ...prev.overview, startDate: e.target.value }
                  }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={courseContent.overview.endDate}
                  onChange={(e) => setCourseContent(prev => ({
                    ...prev,
                    overview: { ...prev.overview, endDate: e.target.value }
                  }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Live Meetings</h2>
              <button
                onClick={() => openModal('meetings')}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Meeting
              </button>
            </div>
            <div className="space-y-3">
              {courseContent.meetings.map((meeting) => (
                <div key={meeting.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{meeting.title}</h3>
                      <p className="text-sm text-gray-600">
                        {meeting.date} at {meeting.time} • {meeting.instructor}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                        meeting.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                        meeting.status === 'live' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal('meetings', meeting)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => deleteItem('meetings', meeting.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Study Materials</h2>
              <button
                onClick={() => openModal('materials')}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Material
              </button>
            </div>
            <div className="space-y-3">
              {courseContent.materials.map((material) => (
                <div key={material.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {material.type === 'pdf' && <FiFileText className="text-red-600" />}
                      {material.type === 'video' && <FiVideo className="text-blue-600" />}
                      {material.type === 'assignment' && <FiFileText className="text-green-600" />}
                      <div>
                        <h3 className="font-medium">{material.title}</h3>
                        <p className="text-sm text-gray-600">Uploaded: {material.uploadDate}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal('materials', material)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => deleteItem('materials', material.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'syllabus' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Course Syllabus</h2>
              <button
                onClick={() => openModal('syllabus')}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Topic
              </button>
            </div>
            <div className="space-y-3">
              {courseContent.syllabus.map((topic) => (
                <div key={topic.id} className={`border rounded-lg p-4 ${
                  topic.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Week {topic.week}: {topic.title}</h3>
                      <p className="text-sm text-gray-600">
                        Materials: {topic.materials.join(', ')}
                      </p>
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={topic.completed}
                          onChange={(e) => {
                            setCourseContent(prev => ({
                              ...prev,
                              syllabus: prev.syllabus.map(t => 
                                t.id === topic.id ? { ...t, completed: e.target.checked } : t
                              )
                            }));
                          }}
                        />
                        <span className="text-sm">Completed</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal('syllabus', topic)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => deleteItem('syllabus', topic.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Assignments & Tests</h2>
              <button
                onClick={() => openModal('assignments')}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseContent.assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-gray-600">Due: {assignment.dueDate}</p>
                      <p className="text-sm text-gray-600">Submissions: {assignment.submissions}</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                        assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal('assignments', assignment)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => deleteItem('assignments', assignment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ContentModal
          type={modalType}
          item={editingItem}
          onSave={(item) => addOrUpdateItem(modalType, item)}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

const ContentModal = ({ type, item, onSave, onClose }) => {
  const [formData, setFormData] = useState(() => {
    switch (type) {
      case 'meetings':
        return {
          title: item?.title || '',
          date: item?.date || '',
          time: item?.time || '',
          instructor: item?.instructor || '',
          status: item?.status || 'upcoming',
          zoomLink: item?.zoomLink || ''
        };
      case 'materials':
        return {
          type: item?.type || 'pdf',
          title: item?.title || '',
          url: item?.url || '',
          uploadDate: item?.uploadDate || new Date().toISOString().split('T')[0]
        };
      case 'syllabus':
        return {
          week: item?.week || 1,
          title: item?.title || '',
          completed: item?.completed || false,
          materials: item?.materials || []
        };
      case 'assignments':
        return {
          title: item?.title || '',
          dueDate: item?.dueDate || '',
          status: item?.status || 'draft',
          submissions: item?.submissions || 0
        };
      default:
        return {};
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, id: item?.id });
  };

  const getModalTitle = () => {
    const action = item ? 'Edit' : 'Add';
    switch (type) {
      case 'meetings': return `${action} Live Meeting`;
      case 'materials': return `${action} Study Material`;
      case 'syllabus': return `${action} Syllabus Topic`;
      case 'assignments': return `${action} Assignment`;
      default: return action;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{getModalTitle()}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'meetings' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="6:00 PM"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instructor</label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zoom Link</label>
                <input
                  type="url"
                  value={formData.zoomLink}
                  onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://zoom.us/j/..."
                />
              </div>
            </>
          )}

          {type === 'materials' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="video">Video Recording</option>
                  <option value="assignment">Assignment</option>
                  <option value="slides">Slide Deck</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL/File</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Upload file or enter URL"
                  required
                />
              </div>
            </>
          )}

          {type === 'syllabus' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Week Number</label>
                <input
                  type="number"
                  min="1"
                  value={formData.week}
                  onChange={(e) => setFormData({ ...formData, week: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Topic Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Materials (comma-separated)</label>
                <input
                  type="text"
                  value={formData.materials.join(', ')}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value.split(', ').filter(m => m.trim()) })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="PDF Notes, Video Lecture, Practice Problems"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.completed}
                    onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                  />
                  <span className="text-sm">Mark as completed</span>
                </label>
              </div>
            </>
          )}

          {type === 'assignments' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Assignment Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </>
          )}

          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseContentManagement;