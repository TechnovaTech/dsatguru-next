import { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiFilter, FiDownload, FiUpload, FiEdit, FiTrash2, FiEye, FiBarChart } from "react-icons/fi";
import {
  getEnhancedQuestions,
  createEnhancedQuestion,
  updateEnhancedQuestion,
  deleteEnhancedQuestion,
  bulkImportEnhancedQuestions,
  exportEnhancedQuestions
} from "../../services/api/enhancedQuestions";

const EnhancedQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    topic: "",
    subtopic: "",
    difficulty: "",
    subject: "",
    status: "",
    fromDate: "",
    toDate: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchQuestions();
  }, [filters, pagination.page]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const filterParams = {
        search: filters.search,
        subject: filters.subject,
        topic: filters.topic,
        difficulty: filters.difficulty,
        dateFrom: filters.fromDate,
        dateTo: filters.toDate
      };
      
      const response = await getEnhancedQuestions(filterParams, pagination.page, pagination.pageSize);
      setQuestions(response.questions || []);
      setPagination(prev => ({
        ...prev,
        totalCount: response.totalCount || 0,
        totalPages: response.totalPages || 1
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      topic: "",
      subtopic: "",
      difficulty: "",
      subject: "",
      status: "",
      fromDate: "",
      toDate: ""
    });
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const filterParams = {
        search: filters.search,
        subject: filters.subject,
        topic: filters.topic,
        difficulty: filters.difficulty,
        dateFrom: filters.fromDate,
        dateTo: filters.toDate
      };
      await exportEnhancedQuestions(filterParams);
    } catch (error) {
      console.error('Error exporting questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      try {
        const text = await file.text();
        const questions = JSON.parse(text);
        await bulkImportEnhancedQuestions(questions);
        fetchQuestions(); // Refresh the list
      } catch (error) {
        console.error('Error importing questions:', error);
        // You might want to show a toast notification here
      } finally {
        setLoading(false);
      }
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'UnderReview': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-6">Loading questions...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Enhanced Question Bank</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(true)}
            className="bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FiBarChart /> Analytics
          </button>
          <button
            onClick={handleExport}
            className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FiDownload /> Export
          </button>
          <label className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer">
            <FiUpload /> Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FiPlus /> Add Question
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-gray-500" />
          <h3 className="font-semibold">Advanced Filters</h3>
          <button
            onClick={clearFilters}
            className="ml-auto text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-10 pr-3 py-2 border rounded"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              type="text"
              value={filters.topic}
              onChange={(e) => handleFilterChange("topic", e.target.value)}
              placeholder="Filter by topic"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange("subject", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Subjects</option>
              <option value="Math">Math</option>
              <option value="Verbal">Verbal</option>
              <option value="Reading">Reading</option>
              <option value="Writing">Writing</option>
              <option value="Science">Science</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => handleFilterChange("difficulty", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
              <option value="UnderReview">Under Review</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject/Topic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={question.content}>
                      {question.content}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => {
                        // Handle both string and array cases for tags
                        const tagsArray = typeof question.tags === 'string' 
                          ? question.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                          : Array.isArray(question.tags) ? question.tags : [];
                        
                        return tagsArray.slice(0, 2).map((tag, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {tag}
                          </span>
                        ));
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{question.topic}</div>
                    {question.subtopic && (
                      <div className="text-xs text-gray-500">{question.subtopic}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{question.subject}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(question.status)}`}>
                      {question.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{question.usageCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-1">{question.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{question.successRate.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <FiEye />
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        <FiEdit />
                      </button>
                      <button 
                        onClick={() => handleDelete(question.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} results
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      {showModal && (
        <QuestionModal
          question={editingQuestion}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingQuestion(null);
          }}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsModal onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
};

const QuestionModal = ({ question, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    content: question?.content || "",
    explanation: question?.explanation || "",
    topic: question?.topic || "",
    subtopic: question?.subtopic || "",
    difficulty: question?.difficulty || "Easy",
    type: question?.type || "MultipleChoice",
    subject: question?.subject || "Math",
    status: question?.status || "Draft",
    correctAnswer: question?.correctAnswer || "",
    options: question?.options || ["", "", "", ""],
    points: question?.points || 1,
    imageUrl: question?.imageUrl || "",
    tags: question?.tags?.join(", ") || ""
  });

  const [showPreview, setShowPreview] = useState(false);

  // Update formData when question prop changes
  useEffect(() => {
    if (question) {
      setFormData({
        content: question?.content || "",
        explanation: question?.explanation || "",
        topic: question?.topic || "",
        subtopic: question?.subtopic || "",
        difficulty: question?.difficulty || "Easy",
        type: question?.type || "MultipleChoice",
        subject: question?.subject || "Math",
        status: question?.status || "Draft",
        correctAnswer: question?.correctAnswer || "",
        options: question?.options || ["", "", "", ""],
        points: question?.points || 1,
        imageUrl: question?.imageUrl || "",
        tags: question?.tags?.join(", ") || ""
      });
    } else {
      // Reset form for creating new question
      setFormData({
        content: "",
        explanation: "",
        topic: "",
        subtopic: "",
        difficulty: "Easy",
        type: "MultipleChoice",
        subject: "Math",
        status: "Draft",
        correctAnswer: "",
        options: ["", "", "", ""],
        points: 1,
        imageUrl: "",
        tags: ""
      });
    }
  }, [question]);

  // Upload image function
  const uploadImage = async (file) => {
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await fetch('/api/FileUpload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.imageUrl;
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const imageUrl = await uploadImage(file);
        setFormData(prev => ({ ...prev, imageUrl }));
        alert('Image uploaded successfully!');
      } catch (error) {
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const questionData = {
      ...formData,
      options: formData.options.filter(opt => opt.trim() !== ""),
      tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag !== "")
    };
    onSave(questionData);
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {question ? "Edit Question" : "Add Question"}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        {showPreview ? (
          <QuestionPreview formData={formData} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="Math">Math</option>
                  <option value="Verbal">Verbal</option>
                  <option value="Reading">Reading</option>
                  <option value="Writing">Writing</option>
                  <option value="Science">Science</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="MultipleChoice">Multiple Choice</option>
                  <option value="TrueFalse">True/False</option>
                  <option value="ShortAnswer">Short Answer</option>
                  <option value="Essay">Essay</option>
                  <option value="FillInTheBlank">Fill in the Blank</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Topic</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subtopic</label>
                <input
                  type="text"
                  value={formData.subtopic}
                  onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Question Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows="4"
                placeholder="Enter question content (LaTeX supported: $x^2 + y^2 = z^2$)"
                required
              />
            </div>

            {formData.type === "MultipleChoice" && (
              <div>
                <label className="block text-sm font-medium mb-1">Answer Options</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <span className="w-8 h-10 flex items-center justify-center bg-gray-100 rounded">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Correct Answer</label>
              <input
                type="text"
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter correct answer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Explanation</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows="3"
                placeholder="Detailed explanation of the answer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="UnderReview">Under Review</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Question Image (Optional)
              </label>
              
              {!formData.imageUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="enhanced-image-upload"
                  />
                  <label
                    htmlFor="enhanced-image-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                  >
                    Click to upload an image
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={formData.imageUrl}
                    alt="Question"
                    className="max-w-full h-auto max-h-48 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="algebra, equations, basic (comma separated)"
              />
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
                {question ? "Update" : "Create"} Question
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const QuestionPreview = ({ formData }) => (
  <div className="bg-gray-50 p-6 rounded-lg">
    <div className="mb-4">
      <div className="flex gap-2 mb-2">
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{formData.subject}</span>
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{formData.difficulty}</span>
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">{formData.points} pts</span>
      </div>
      <h3 className="font-semibold">{formData.topic} {formData.subtopic && `> ${formData.subtopic}`}</h3>
    </div>
    
    <div className="bg-white p-4 rounded border mb-4">
      <p className="text-lg mb-4">{formData.content}</p>
      
      {formData.imageUrl && (
        <img src={formData.imageUrl} alt="Question" className="max-w-md mb-4" />
      )}
      
      {formData.type === "MultipleChoice" && (
        <div className="space-y-2">
          {formData.options.filter(opt => opt.trim()).map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-sm">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    
    {formData.explanation && (
      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold mb-2">Explanation:</h4>
        <p>{formData.explanation}</p>
      </div>
    )}
  </div>
);

const AnalyticsModal = ({ onClose }) => {
  const mockAnalytics = {
    totalQuestions: 1247,
    activeQuestions: 892,
    mostUsedQuestions: [
      { id: 1, content: "What is the derivative of x²?", topic: "Calculus", usageCount: 156 },
      { id: 2, content: "Solve for x: 2x + 5 = 15", topic: "Algebra", usageCount: 134 }
    ],
    successRatesByDifficulty: [
      { difficulty: "Easy", averageSuccessRate: 87.5, count: 324 },
      { difficulty: "Medium", averageSuccessRate: 72.3, count: 456 },
      { difficulty: "Hard", averageSuccessRate: 58.7, count: 112 }
    ],
    topRatedQuestions: [
      { id: 1, content: "Identify the main theme...", topic: "Reading", averageRating: 4.8, totalRatings: 45 },
      { id: 2, content: "Calculate the area...", topic: "Geometry", averageRating: 4.6, totalRatings: 67 }
    ]
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Question Bank Analytics</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Questions</h3>
            <p className="text-2xl font-bold text-blue-600">{mockAnalytics.totalQuestions}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Active Questions</h3>
            <p className="text-2xl font-bold text-green-600">{mockAnalytics.activeQuestions}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Most Used Questions</h3>
            <div className="space-y-2">
              {mockAnalytics.mostUsedQuestions.map((q, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium truncate">{q.content}</div>
                  <div className="text-sm text-gray-600">{q.topic} • Used {q.usageCount} times</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Success Rates by Difficulty</h3>
            <div className="space-y-3">
              {mockAnalytics.successRatesByDifficulty.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{item.difficulty}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${item.averageSuccessRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{item.averageSuccessRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuestionBank;