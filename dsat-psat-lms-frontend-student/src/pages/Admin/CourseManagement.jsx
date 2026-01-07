import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiDollarSign, FiUsers, FiBarChart, FiCalendar, FiVideo, FiArrowUp, FiArrowDown, FiMenu } from "react-icons/fi";
import * as courseAPI from "../../services/api/courseManagement";
import CourseContentManagement from "./CourseContentManagement";

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showContentManagement, setShowContentManagement] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    minPrice: "",
    maxPrice: "",
    type: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });

  useEffect(() => {
    // Check if there are parameters in sessionStorage
    const tabParams = sessionStorage.getItem('tabParams');
    if (tabParams) {
      try {
        const params = JSON.parse(tabParams);
        if (params.type) {
          setFilters(prev => ({ ...prev, type: params.type }));
        }
        // Clear the parameters after using them
        sessionStorage.removeItem('tabParams');
      } catch (error) {
        console.error('Error parsing tab parameters:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [filters, pagination.page]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = {
        search: filters.search,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        page: pagination.page,
        pageSize: pagination.pageSize,
        type: filters.type || undefined
      };
      
      const response = await courseAPI.getCourses(params);
      console.log('API Response:', response); // Debug log
      setCourses(response.data || []);
      
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          totalCount: response.pagination.totalCount,
          totalPages: response.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await courseAPI.deleteCourse(courseId);
        fetchCourses(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete course:", error);
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading) return <div className="p-6">Loading courses...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Course & Question Bank Management</h1>
        <button
          onClick={() => {
            // Pre-select the type based on current filter
            if (filters.type) {
              setEditingCourse({ type: filters.type });
            }
            setShowModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FiPlus /> Add {filters.type === 'question_bank' ? 'Question Bank' : filters.type === 'course' ? 'Course' : 'New'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Search courses..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="course">Courses</option>
              <option value="question_bank">Question Banks</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Price</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
              placeholder="0"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Price</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
              placeholder="1000"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: "", minPrice: "", maxPrice: "", type: "" })}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses.length > 0 ? courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{course.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {course.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-semibold text-green-600">
                    ${course.price || 0}
                  </div>
                  {course.discountedPrice && (
                    <div className="text-xs text-red-600">
                      {course.discountPercentage}% off - ${course.discountedPrice.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <FiUsers className="text-gray-400" />
                    {course.enrollmentsCount || 0}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-green-600">
                  ${(course.revenue || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="space-y-1">
                    <div>{course.highlightsCount || 0} highlights</div>
                    <div>{course.schedulesCount || 0} schedules</div>
                    <div>{course.faqsCount || 0} FAQs</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(course.updatedAt || course.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const fullCourse = await courseAPI.getCourse(course.id);
                          setEditingCourse(fullCourse.data);
                          setShowModal(true);
                        } catch (error) {
                          console.error("Failed to fetch course details:", error);
                        }
                      }}
                      className="text-green-600 hover:text-green-900"
                      title="Edit Course"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowContentManagement(true);
                      }}
                      className="text-orange-600 hover:text-orange-900"
                      title="Manage Content"
                    >
                      <FiVideo />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowAnalytics(true);
                      }}
                      className="text-purple-600 hover:text-purple-900"
                      title="View Analytics"
                    >
                      <FiBarChart />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Course"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No courses found. Click "Add Course" to create your first course.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} courses
        </div>
        <div className="flex gap-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Course Modal */}
      {showModal && (
        <CourseModal
          course={editingCourse}
          onSave={() => {
            setShowModal(false);
            setEditingCourse(null);
            fetchCourses(); // Refresh the course list
          }}
          onClose={() => {
            setShowModal(false);
            setEditingCourse(null);
          }}
        />
      )}

      {/* Course Details Modal */}
      {selectedCourse && !showAnalytics && (
        <CourseDetailsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && selectedCourse && (
        <CourseAnalyticsModal
          course={selectedCourse}
          onClose={() => {
            setShowAnalytics(false);
            setSelectedCourse(null);
          }}
        />
      )}

      {/* Content Management */}
      {showContentManagement && selectedCourse && (
        <CourseContentManagement
          courseId={selectedCourse.id}
          courseName={selectedCourse.title}
          onBack={() => {
            setShowContentManagement(false);
            setSelectedCourse(null);
          }}
        />
      )}
    </div>
  );

  // Show content management if active
  if (showContentManagement && selectedCourse) {
    return (
      <CourseContentManagement
        courseId={selectedCourse.id}
        courseName={selectedCourse.title}
        onBack={() => {
          setShowContentManagement(false);
          setSelectedCourse(null);
        }}
      />
    );
  }
};

const uploadImage = async (file) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/api/FileUpload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'ngrok-skip-browser-warning': '69420'
    },
    body: formData
  });
  
  const result = await response.json();
  if (!result.success) throw new Error(result.message);
  return `${API_BASE_URL}${result.url}`;
};

const CourseModal = ({ course, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    type: course?.type || "course", // Default type is course
    questionBankType: course?.questionBankType || "Reading and Writing", // Default question bank type
    overview: course?.overview || "",
    courseDetails: course?.courseDetails || "",
    bannerImageUrl: course?.bannerImageUrl || "",
    price: course?.price || 0,
    discountedPrice: course?.discountedPrice || "",
    discountPercentage: course?.discountPercentage || "",
    backgroundColor: course?.backgroundColor || "#e0ffff", // Default light cyan background

    highlights: course?.highlights?.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0)).map(h => typeof h === 'string' ? h : (h.Text || h.text)) || [""],
    schedules: course?.schedules?.map(s => ({ day: s.Day || s.day || "", time: s.Time || s.time || "" })) || [{ day: "", time: "" }],
    faqs: course?.faqs?.map(f => ({ question: f.Question || f.question || "", answer: f.Answer || f.answer || "" })) || [{ question: "", answer: "" }]
  });

  const [optionalFields, setOptionalFields] = useState({
    showBannerImage: !!(course?.bannerImageUrl),
    showCourseDetails: !!(course?.courseDetails),
    showOverview: !!(course?.overview)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const courseData = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      questionBankType: formData.questionBankType,
      overview: optionalFields.showOverview ? formData.overview : "",
      courseDetails: optionalFields.showCourseDetails ? formData.courseDetails : "",
      bannerImageUrl: optionalFields.showBannerImage ? formData.bannerImageUrl : "",
      price: formData.price,
      discountedPrice: formData.discountedPrice ? parseFloat(formData.discountedPrice) : null,
      discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : null,
      backgroundColor: formData.backgroundColor,
      highlights: formData.highlights.filter(h => h.trim() !== ""),
      schedules: formData.schedules.filter(s => s.day.trim() !== "" && s.time.trim() !== ""),
      faqs: formData.faqs.filter(f => f.question.trim() !== "" && f.answer.trim() !== "")
    };
    
    try {
      console.log('Submitting course data:', courseData);
      if (course) {
        await courseAPI.updateCourse(course.id, courseData);
      } else {
        await courseAPI.createCourse(courseData);
      }
      onSave(); // Call without parameters since we're refreshing from server
    } catch (error) {
      console.error("Failed to save course:", error);
      console.error("Error response:", error.response?.data);
      alert(`Error: ${error.response?.data?.message || 'Unknown error occurred'}`);
    }
  };

  const addHighlight = () => {
    setFormData(prev => ({ ...prev, highlights: [...prev.highlights, ""] }));
  };

  const updateHighlight = (index, value) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h)
    }));
  };

  const removeHighlight = (index) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };
  
  // Removed moveHighlight function as we want to maintain the order in which highlights are entered

  const addSchedule = () => {
    setFormData(prev => ({ ...prev, schedules: [...prev.schedules, { day: "", time: "" }] }));
  };

  const updateSchedule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeSchedule = (index) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }));
  };

  const addFAQ = () => {
    setFormData(prev => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }));
  };

  const updateFAQ = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((f, i) => i === index ? { ...f, [field]: value } : f)
    }));
  };

  const removeFAQ = (index) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {course ? `Edit ${formData.type === 'question_bank' ? 'Question Bank' : 'Course'}` : `Add New ${formData.type === 'question_bank' ? 'Question Bank' : 'Course'}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="course">Course</option>
                <option value="question_bank">Question Bank</option>
              </select>
            </div>
          </div>

          {/* Question Bank Type - Only show when Question Bank is selected */}
          {formData.type === 'question_bank' && (
            <div className="border-4 border-red-500 rounded-lg p-6 bg-yellow-100">
              <label className="block text-lg font-bold mb-3 text-red-900">⚠️ QUESTION BANK TYPE (SELECT ONE) ⚠️</label>
              <div className="space-y-3">
                <div className="flex items-center bg-white p-3 rounded border-2 border-blue-500">
                  <input
                    type="checkbox"
                    id="rw-type"
                    checked={formData.questionBankType === 'Reading and Writing'}
                    onChange={(e) => {
                      console.log('R/W checkbox clicked:', e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, questionBankType: 'Reading and Writing' })
                      }
                    }}
                    className="mr-3 w-6 h-6"
                  />
                  <label htmlFor="rw-type" className="text-base font-bold text-gray-900 cursor-pointer">📚 Reading and Writing (R/W)</label>
                </div>
                <div className="flex items-center bg-white p-3 rounded border-2 border-green-500">
                  <input
                    type="checkbox"
                    id="math-type"
                    checked={formData.questionBankType === 'Mathematics'}
                    onChange={(e) => {
                      console.log('Math checkbox clicked:', e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, questionBankType: 'Mathematics' })
                      }
                    }}
                    className="mr-3 w-6 h-6"
                  />
                  <label htmlFor="math-type" className="text-base font-bold text-gray-900 cursor-pointer">🔢 Mathematics</label>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Main Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  const mainPrice = parseFloat(e.target.value) || 0;
                  const discountedPrice = parseFloat(formData.discountedPrice) || 0;
                  let percentage = "";
                  if (mainPrice > 0 && discountedPrice > 0 && discountedPrice < mainPrice) {
                    percentage = ((mainPrice - discountedPrice) / mainPrice * 100).toFixed(0);
                  }
                  setFormData({ 
                    ...formData, 
                    price: mainPrice,
                    discountPercentage: percentage
                  });
                }}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discounted Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.discountedPrice || ''}
                onChange={(e) => {
                  const discountedPrice = parseFloat(e.target.value) || 0;
                  const mainPrice = parseFloat(formData.price) || 0;
                  let percentage = "";
                  if (mainPrice > 0 && discountedPrice > 0 && discountedPrice < mainPrice) {
                    percentage = ((mainPrice - discountedPrice) / mainPrice * 100).toFixed(0);
                  }
                  setFormData({ 
                    ...formData, 
                    discountedPrice: discountedPrice,
                    discountPercentage: percentage
                  });
                }}
                className="w-full border rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount (%)</label>
              <input
                type="text"
                value={formData.discountPercentage || ''}
                className="w-full border rounded px-3 py-2 bg-gray-100"
                placeholder="Auto-calculated"
                readOnly
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Card Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-10 h-10 border rounded"
              />
              <input
                type="text"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="flex-1 border rounded px-3 py-2"
                placeholder="#e0ffff"
              />
              <div className="flex-1 h-10 rounded" style={{ backgroundColor: formData.backgroundColor }}></div>
            </div>
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

          {/* Optional Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700 border-b pb-2">Optional Fields</h3>
            
            {/* Add buttons for optional fields */}
            <div className="flex flex-wrap gap-2">
              {!optionalFields.showOverview && (
                <button
                  type="button"
                  onClick={() => setOptionalFields(prev => ({ ...prev, showOverview: true }))}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  + Add Course Overview
                </button>
              )}
              {!optionalFields.showCourseDetails && (
                <button
                  type="button"
                  onClick={() => setOptionalFields(prev => ({ ...prev, showCourseDetails: true }))}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  + Add Course Details (HTML)
                </button>
              )}
              {!optionalFields.showBannerImage && (
                <button
                  type="button"
                  onClick={() => setOptionalFields(prev => ({ ...prev, showBannerImage: true }))}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  + Add Banner Image
                </button>
              )}
            </div>

            {/* Optional field inputs */}
            {optionalFields.showOverview && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Course Overview</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOptionalFields(prev => ({ ...prev, showOverview: false }));
                      setFormData(prev => ({ ...prev, overview: "" }));
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="4"
                  placeholder="Detailed overview of the course content and objectives"
                />
              </div>
            )}

            {optionalFields.showCourseDetails && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Course Details (HTML)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOptionalFields(prev => ({ ...prev, showCourseDetails: false }));
                      setFormData(prev => ({ ...prev, courseDetails: "" }));
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={formData.courseDetails}
                  onChange={(e) => setFormData({ ...formData, courseDetails: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="6"
                  placeholder="Detailed course information (HTML supported)"
                />
              </div>
            )}

            {optionalFields.showBannerImage && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Banner Image</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOptionalFields(prev => ({ ...prev, showBannerImage: false }));
                      setFormData(prev => ({ ...prev, bannerImageUrl: "" }));
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const imageUrl = await uploadImage(file);
                        setFormData({ ...formData, bannerImageUrl: imageUrl });
                      } catch (error) {
                        console.error('Upload failed:', error);
                        alert('Failed to upload image');
                      }
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                />
                {formData.bannerImageUrl && (
                  <div className="mt-2">
                    <img 
                      src={formData.bannerImageUrl} 
                      alt="Banner preview" 
                      className="max-w-xs max-h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          

          {/* Course Highlights */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Course Highlights</label>
              <button
                type="button"
                onClick={addHighlight}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                + Add Highlight
              </button>
            </div>
            <div className="mb-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FiMenu className="text-gray-400" /> Highlights will be displayed in the numbered sequence shown (1, 2, 3, etc.)
              </span>
            </div>
            <div className="space-y-2">
              {formData.highlights.map((highlight, index) => (
                <div
                  key={`highlight-${index}`}
                  className="flex gap-2 items-center bg-white border rounded p-1"
                >
                  <div className="px-2 py-2 text-gray-500 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-bold">{index + 1}</span>
                    <FiMenu />
                  </div>
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    className="flex-1 border-0 focus:ring-0 px-2 py-1"
                    placeholder="Enter course highlight"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => removeHighlight(index)}
                      className="text-red-500 hover:text-red-700 px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Course Schedules */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Course Schedules</label>
              <button
                type="button"
                onClick={addSchedule}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                + Add Schedule
              </button>
            </div>
            {formData.schedules.map((schedule, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={schedule.day}
                  onChange={(e) => updateSchedule(index, "day", e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                >
                  <option value="">Select Day</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
                <input
                  type="text"
                  value={schedule.time}
                  onChange={(e) => updateSchedule(index, "time", e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Time (e.g., 8 pm)"
                />
                <button
                  type="button"
                  onClick={() => removeSchedule(index)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            
            {/* Course Card Preview */}
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Course Card Preview</h4>
              <div className="w-64 rounded-lg overflow-hidden shadow-lg" style={{ backgroundColor: formData.backgroundColor || '#e0ffff', height: '450px' }}>
                <div className="p-4">
                  <h3 className="text-lg font-bold uppercase text-center">{formData.title || 'MATHS REASONING'}</h3>
                  <div className="text-center my-1">...</div>
                  
                  <div className="flex justify-center my-2">
                    {formData.schedules.length > 0 && formData.schedules[0].day && formData.schedules[0].time ? (
                      <span className="bg-white rounded-full px-4 py-1 text-sm">
                        {formData.schedules[0].day} {formData.schedules[0].time}
                      </span>
                    ) : (
                      <span className="bg-white rounded-full px-4 py-1 text-sm">monday 8 pm</span>
                    )}
                  </div>
                  
                  <div className="flex justify-center mt-8 mb-2">
                    {formData.discountPercentage ? (
                      <span className="bg-white bg-opacity-70 rounded-full px-4 py-1 text-sm font-medium text-green-600">
                        {formData.discountPercentage}% OFF
                      </span>
                    ) : (
                      <span className="bg-white bg-opacity-70 rounded-full px-4 py-1 text-sm font-medium text-green-600">
                        20% OFF
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    {formData.price > 0 ? (
                      <div>
                        {formData.discountedPrice ? (
                          <div>
                            <div className="text-gray-500 line-through">${formData.price}</div>
                            <div className="text-blue-600 text-xl font-bold">${formData.discountedPrice}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-gray-500 line-through">$100</div>
                            <div className="text-blue-600 text-xl font-bold">$80</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-500 line-through">$100</div>
                        <div className="text-blue-600 text-xl font-bold">$80</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8">
                    {formData.highlights.filter(h => h.trim() !== "").length > 0 ? (
                      formData.highlights.filter(h => h.trim() !== "").map((highlight, idx) => (
                        <div key={idx} className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">{idx + 1}</span>
                          <span className="text-sm text-gray-700">{highlight}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">1</span>
                          <span className="text-sm text-gray-700">maths question</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">2</span>
                          <span className="text-sm text-gray-700">maths videos</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">3</span>
                          <span className="text-sm text-gray-700">maths mcq</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold">4</span>
                          <span className="text-sm text-gray-700">matrhs</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Course FAQs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Frequently Asked Questions</label>
              <button
                type="button"
                onClick={addFAQ}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                + Add FAQ
              </button>
            </div>
            {formData.faqs.map((faq, index) => (
              <div key={index} className="border rounded p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">FAQ #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFAQ(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, "question", e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-2"
                  placeholder="Question"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, "answer", e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows="2"
                  placeholder="Answer"
                />
              </div>
            ))}
          </div>

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
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {course ? "Update" : "Create"} Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CourseDetailsModal = ({ course, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{course.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700">{course.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Price</h3>
              <p className="text-2xl font-bold text-green-600">${course.price || 0}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Enrollments</h3>
              <p className="text-2xl font-bold text-blue-600">{course.enrollmentsCount || 0}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Revenue</h3>
            <p className="text-2xl font-bold text-green-600">${(course.revenue || 0).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">{course.highlightsCount || 0}</div>
              <div className="text-sm text-gray-600">Highlights</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">{course.schedulesCount || 0}</div>
              <div className="text-sm text-gray-600">Schedules</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-2xl font-bold text-purple-600">{course.faqsCount || 0}</div>
              <div className="text-sm text-gray-600">FAQs</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {new Date(course.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {new Date(course.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CourseAnalyticsModal = ({ course, onClose }) => {
  const mockAnalytics = {
    totalEnrollments: course.enrollmentsCount || 0,
    totalRevenue: course.revenue || 0,
    monthlyEnrollments: Math.floor((course.enrollmentsCount || 0) * 0.3),
    averageRevenuePerStudent: (course.enrollmentsCount || 0) > 0 ? (course.revenue || 0) / (course.enrollmentsCount || 0) : 0,
    enrollmentTrend: [
      { month: "Jan", count: 8 },
      { month: "Feb", count: 12 },
      { month: "Mar", count: 15 },
      { month: "Apr", count: 10 }
    ]
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Analytics - {course.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{mockAnalytics.totalEnrollments}</div>
              <div className="text-sm text-gray-600">Total Enrollments</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${mockAnalytics.totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{mockAnalytics.monthlyEnrollments}</div>
              <div className="text-sm text-gray-600">Monthly Enrollments</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">${mockAnalytics.averageRevenuePerStudent.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Avg Revenue/Student</div>
            </div>
          </div>

          {/* Enrollment Trend Chart */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4">Enrollment Trend</h3>
            <div className="h-48 flex items-end justify-between gap-4">
              {mockAnalytics.enrollmentTrend.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-blue-500 w-full rounded-t"
                    style={{
                      height: `${(data.count / Math.max(...mockAnalytics.enrollmentTrend.map(d => d.count))) * 150}px`
                    }}
                  ></div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium">{data.month}</div>
                    <div className="text-xs text-gray-600">{data.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Performance Insights</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Conversion Rate:</span>
                  <span className="font-medium">12.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Rate:</span>
                  <span className="font-medium">87.3%</span>
                </div>
                <div className="flex justify-between">
                  <span>Student Satisfaction:</span>
                  <span className="font-medium">4.6/5</span>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Recent Activity</h3>
              <div className="space-y-2 text-sm">
                <div>• 3 new enrollments this week</div>
                <div>• 2 students completed the course</div>
                <div>• 1 positive review received</div>
                <div>• Course materials updated</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;