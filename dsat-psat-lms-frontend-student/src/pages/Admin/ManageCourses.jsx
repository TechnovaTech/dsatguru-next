import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiVideo, FiDownload, FiCalendar, FiFileText, FiSave, FiArrowLeft } from "react-icons/fi";
import * as courseAPI from "../../services/api/courseManagement";
import * as courseContentAPI from "../../services/api/courseContent";

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseAPI.getCourses({ type: 'course' });
      setCourses(response.data || []);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCourse) {
    return (
      <CourseContentManager
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  if (loading) {
    return <div className="p-6">Loading courses...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Courses</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instructor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses.filter(course => course.type === 'course').map((course) => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{course.title}</div>
                    <div className="text-sm text-gray-500">{course.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{course.instructor}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {course.startDate} - {course.endDate}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{course.enrollments}</td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button
                    onClick={() => setSelectedCourse(course)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Manage Content
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CourseContentManager = ({ course, onBack }) => {
  const [activeTab, setActiveTab] = useState('meetings');
  const [courseData, setCourseData] = useState({
    meetings: [],
    materials: [],
    syllabus: [],
    assignments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseContent();
  }, [course.id]);

  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      const response = await courseContentAPI.getCourseContent(course.id);
      setCourseData(response.data || {
        meetings: [],
        materials: [],
        syllabus: [],
        assignments: []
      });
    } catch (error) {
      console.error('Failed to fetch course content:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const handleSave = async () => {
    try {
      alert('Course content saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save course content');
    }
  };

  const addOrUpdateItem = async (type, item) => {
    try {
      if (item.id) {
        // Update existing item
        switch (type) {
          case 'meetings':
            await courseContentAPI.updateLiveMeeting(item.id, item);
            break;
          case 'materials':
            await courseContentAPI.updateStudyMaterial(item.id, item);
            break;
          case 'syllabus':
            await courseContentAPI.updateSyllabusTopic(item.id, item);
            break;
          case 'assignments':
            await courseContentAPI.updateAssignment(item.id, item);
            break;
        }
      } else {
        // Add new item
        switch (type) {
          case 'meetings':
            await courseContentAPI.addLiveMeeting(course.id, item);
            break;
          case 'materials':
            await courseContentAPI.addStudyMaterial(course.id, item);
            break;
          case 'syllabus':
            await courseContentAPI.addSyllabusTopic(course.id, item);
            break;
          case 'assignments':
            await courseContentAPI.addAssignment(course.id, item);
            break;
        }
      }
      await fetchCourseContent(); // Refresh data
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save item');
    }
  };

  const deleteItem = async (type, id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        switch (type) {
          case 'meetings':
            await courseContentAPI.deleteLiveMeeting(id);
            break;
          case 'materials':
            await courseContentAPI.deleteStudyMaterial(id);
            break;
          case 'syllabus':
            await courseContentAPI.deleteSyllabusTopic(id);
            break;
          case 'assignments':
            await courseContentAPI.deleteAssignment(id);
            break;
        }
        await fetchCourseContent(); // Refresh data
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2">
            <FiArrowLeft /> Back to Courses
          </button>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-gray-600">Manage course content and materials</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
        >
          <FiSave /> Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          {[
            { id: 'meetings', label: 'Live Meetings', icon: <FiVideo size={16} /> },
            { id: 'materials', label: 'Study Materials', icon: <FiDownload size={16} /> },
            { id: 'syllabus', label: 'Course Timeline', icon: <FiCalendar size={16} /> },
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
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Live Meetings</h2>
              <button
                onClick={() => {
                  setModalType('meetings');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Meeting
              </button>
            </div>
            <div className="space-y-3">
              {courseData.meetings.map((meeting) => (
                <div key={meeting.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{meeting.title}</h3>
                      <p className="text-sm text-gray-600">{meeting.date} at {meeting.time}</p>
                      <p className="text-sm text-blue-600">{meeting.zoomLink}</p>
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
                        onClick={() => {
                          setModalType('meetings');
                          setEditingItem(meeting);
                          setShowModal(true);
                        }}
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
                onClick={() => {
                  setModalType('materials');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Material
              </button>
            </div>
            <div className="space-y-3">
              {courseData.materials.map((material) => (
                <div key={material.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {material.type === 'pdf' && <FiFileText className="text-red-600" />}
                      {material.type === 'video' && <FiVideo className="text-blue-600" />}
                      <div>
                        <h3 className="font-medium">{material.title}</h3>
                        <p className="text-sm text-gray-600">Type: {material.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setModalType('materials');
                          setEditingItem(material);
                          setShowModal(true);
                        }}
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
              <h2 className="text-xl font-semibold">Course Timeline</h2>
              <button
                onClick={() => {
                  setModalType('syllabus');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Topic
              </button>
            </div>
            <div className="space-y-3">
              {courseData.syllabus.map((topic) => (
                <div key={topic.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Week {topic.week}: {topic.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                      <p className="text-sm text-gray-500 mt-2">Materials: {topic.materials.join(', ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setModalType('syllabus');
                          setEditingItem(topic);
                          setShowModal(true);
                        }}
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
              <h2 className="text-xl font-semibold">Assignments</h2>
              <button
                onClick={() => {
                  setModalType('assignments');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FiPlus /> Add Assignment
              </button>
            </div>
            <div className="space-y-3">
              {courseData.assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                      <p className="text-sm text-gray-500 mt-2">Due: {assignment.dueDate}</p>
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
                        onClick={() => {
                          setModalType('assignments');
                          setEditingItem(assignment);
                          setShowModal(true);
                        }}
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
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
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
          zoomLink: item?.zoomLink || '',
          status: item?.status || 'upcoming'
        };
      case 'materials':
        return {
          type: item?.type || 'pdf',
          title: item?.title || '',
          file: null
        };
      case 'syllabus':
        return {
          week: item?.week || 1,
          title: item?.title || '',
          description: item?.description || '',
          materials: item?.materials || []
        };
      case 'assignments':
        return {
          title: item?.title || '',
          description: item?.description || '',
          dueDate: item?.dueDate || '',
          status: item?.status || 'draft'
        };
      default:
        return {};
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, id: item?.id });
  };

  const handleFileUpload = async (file) => {
    // Mock file upload - replace with actual API
    console.log('Uploading file:', file);
    return URL.createObjectURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {item ? 'Edit' : 'Add'} {type.slice(0, -1)}
          </h3>
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
                <label className="block text-sm font-medium mb-1">Zoom Link</label>
                <input
                  type="url"
                  value={formData.zoomLink}
                  onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://zoom.us/j/..."
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
                <label className="block text-sm font-medium mb-1">Upload File</label>
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const url = await handleFileUpload(file);
                      setFormData({ ...formData, file, url });
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                  accept={formData.type === 'pdf' ? '.pdf' : formData.type === 'video' ? 'video/*' : '*'}
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
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Materials (comma-separated)</label>
                <input
                  type="text"
                  value={formData.materials.join(', ')}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value.split(', ').filter(m => m.trim()) })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="PDF Notes, Video Lecture"
                />
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
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
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

export default ManageCourses;