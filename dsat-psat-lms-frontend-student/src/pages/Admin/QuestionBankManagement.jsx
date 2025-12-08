import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch, FiFilter, FiUsers, FiBookOpen, FiCalendar, FiArrowLeft, FiSettings } from "react-icons/fi";
import { getCourses, createCourse, updateCourse, deleteCourse } from "../../services/api/courseManagement";
import { getQuestionsByQuestionBank, createQuestion, updateQuestion, deleteQuestion } from "../../services/api/questions";
import { deleteQuestion as deleteQuestionFromQBM } from "../../services/api/questionBankManagement";
import { showToast } from "../../utils/toastUtils";
import { useLocation } from "react-router-dom";

const QuestionBankManagement = () => {
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestionBank, setEditingQuestionBank] = useState(null);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentView, setCurrentView] = useState('banks'); // 'banks' or 'questions'
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    subject: "",
    status: "",
    createdBy: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [questionsPagination, setQuestionsPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });
  const location = useLocation();
  const [autoOpenedFromUpload, setAutoOpenedFromUpload] = useState(false);

  useEffect(() => {
    fetchQuestionBanks();
  }, [filters, pagination.page]);

  useEffect(() => {
    if (selectedQuestionBank && currentView === 'questions') {
      fetchQuestions(selectedQuestionBank.id);
    }
  }, [questionsPagination.page]);

  // Auto-open a question bank after successful bulk upload
  useEffect(() => {
    const state = location?.state;
    if (!state || autoOpenedFromUpload) return;
    const { openBankId, justUploaded } = state || {};
    if (!openBankId || loading) return;

    const bank = (questionBanks || []).find(b => String(b.id) === String(openBankId));
    if (bank) {
      if (justUploaded) {
        showToast('Bulk upload completed. Opening the question bank...', 'success');
      }
      // Switch view and fetch latest questions
      handleManageQuestions(bank);
      setAutoOpenedFromUpload(true);
    }
  }, [location?.state, loading, questionBanks, autoOpenedFromUpload]);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const params = {
        type: 'question_bank',
        search: filters.search,
        page: pagination.page,
        pageSize: pagination.pageSize
      };
      
      const response = await getCourses(params);
      setQuestionBanks(response.data || []);
      
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          totalCount: response.pagination.totalCount,
          totalPages: response.pagination.totalPages
        }));
      }
      
      if ((response.data || []).length === 0) {
        showToast('No question banks found. Create question banks in Course Management.', 'info');
      }
    } catch (error) {
      console.error("Failed to fetch question banks:", error);
      showToast('Failed to load question banks. Please try again.', 'error');
      setQuestionBanks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionBankId) => {
    if (window.confirm("Are you sure you want to delete this question bank?")) {
      try {
        await deleteCourse(questionBankId);
        showToast('Question bank deleted successfully', 'success');
        fetchQuestionBanks(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete question bank:", error);
        showToast('Failed to delete question bank. Please try again.', 'error');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleEdit = (questionBank) => {
    setEditingQuestionBank(questionBank);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingQuestionBank(null);
    setShowModal(true);
  };

  const handleSave = async (questionBankData) => {
    try {
      const courseData = {
        ...questionBankData,
        type: 'question_bank',
        title: questionBankData.name || questionBankData.title,
        mainPrice: 0,
        discountedPrice: 0
      };
      
      if (editingQuestionBank) {
        await updateCourse(editingQuestionBank.id, courseData);
        showToast('Question bank updated successfully', 'success');
      } else {
        await createCourse(courseData);
        showToast('Question bank created successfully', 'success');
      }
      setShowModal(false);
      setEditingQuestionBank(null);
      fetchQuestionBanks();
    } catch (error) {
      console.error("Failed to save question bank:", error);
      showToast('Failed to save question bank. Please try again.', 'error');
    }
  };

  const handleViewDetails = (questionBank) => {
    setSelectedQuestionBank(questionBank);
    setShowDetailsModal(true);
  };

  const handleManageQuestions = async (questionBank) => {
    setSelectedQuestionBank(questionBank);
    setCurrentView('questions');
    await fetchQuestions(questionBank.id);
  };

  const fetchQuestions = async (questionBankId, filters = {}) => {
    try {
      setQuestionsLoading(true);
      const response = await getQuestionsByQuestionBank(questionBankId, {
        ...filters,
        page: filters.page || questionsPagination.page,
        pageSize: filters.pageSize || questionsPagination.pageSize
      });
      setQuestions(response.data || []);
      
      if (response.pagination) {
        setQuestionsPagination(prev => ({
          ...prev,
          totalCount: response.pagination.totalCount,
          totalPages: response.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleBackToBanks = () => {
    setCurrentView('banks');
    setSelectedQuestionBank(null);
    setQuestions([]);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteQuestionFromQBM(questionId);
        showToast('Question deleted successfully', 'success');
        await fetchQuestions(selectedQuestionBank.id);
      } catch (error) {
        console.error("Failed to delete question:", error);
        showToast('Failed to delete question. Please try again.', 'error');
      }
    }
  };

  const handleSaveQuestion = async (questionData) => {
    try {
      if (editingQuestion && editingQuestion.id) {
        // Update existing question
        await updateQuestion(editingQuestion.id, questionData);
        showToast('Question updated successfully', 'success');
      } else {
        // Create new question
        const newQuestionData = {
          ...questionData,
          questionBankId: selectedQuestionBank.id
        };
        await createQuestion(newQuestionData);
        showToast('Question created successfully', 'success');
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      await fetchQuestions(selectedQuestionBank.id);
    } catch (error) {
      console.error("Failed to save question:", error);
      showToast('Failed to save question. Please try again.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Active': 'bg-green-100 text-green-800',
      'Draft': 'bg-yellow-100 text-yellow-800',
      'Archived': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSubjectBadge = (subject) => {
    const subjectColors = {
      'Math': 'bg-blue-100 text-blue-800',
      'English': 'bg-purple-100 text-purple-800',
      'Science': 'bg-green-100 text-green-800',
      'History': 'bg-orange-100 text-orange-800',
      'Mixed': 'bg-gray-100 text-gray-800'
    };
    return subjectColors[subject] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-6">Loading question banks...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Question Bank Management</h1>
            <p className="text-blue-100">Manage your question banks and collections with ease</p>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <FiBookOpen className="text-blue-200" />
                <span className="text-sm">{questionBanks.length} Question Banks</span>
              </div>
              <div className="flex items-center gap-2">
                <FiUsers className="text-blue-200" />
                <span className="text-sm">{questionBanks.reduce((sum, bank) => sum + (bank.totalQuestions || 0), 0)} Total Questions</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 flex items-center gap-2 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            <FiPlus /> Create Question Bank
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiFilter className="text-blue-600" />
            Filter & Search
          </h3>
          {currentView === 'questions' && selectedQuestionBank && (
            <button
              onClick={() => {
                setEditingQuestion({ questionBankId: selectedQuestionBank.id });
                setShowQuestionModal(true);
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center gap-2 shadow-md transition-all duration-200"
            >
              <FiPlus /> Add Question
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search question banks..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">All Subjects</option>
              <option value="Math">Math</option>
              <option value="English">English</option>
              <option value="Science">Science</option>
              <option value="History">History</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Module Type</label>
            <select
              value={filters.moduleType || ''}
              onChange={(e) => handleFilterChange('moduleType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">All Modules</option>
              <option value="Reading and Writing">Reading and Writing</option>
              <option value="Math">Math</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
            <select
              value={filters.questionType || ''}
              onChange={(e) => handleFilterChange('questionType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">All Types</option>
              <option value="Multiple Choice">Multiple Choice</option>
              <option value="Student-Produced Response">Student-Produced Response</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Created By</label>
            <input
              type="text"
              placeholder="Creator name..."
              value={filters.createdBy}
              onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Question Banks Table - Only show when currentView is 'banks' */}
      {currentView === 'banks' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiBookOpen className="text-blue-600" />
              Question Banks ({questionBanks.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Question Bank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {questionBanks.map((questionBank, index) => (
                  <tr key={questionBank.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {questionBank.title.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{questionBank.title}</div>
                          <div className="text-sm text-gray-500 mt-1">{questionBank.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm border ${getSubjectBadge('Mixed')}`}>
                        Mixed
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-semibold text-gray-800 mb-1">Total: {questionBank.totalQuestions || 0}</div>
                        <div className="flex gap-3 text-xs">
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Active: {questionBank.activeQuestions || 0}
                          </span>
                          <span className="flex items-center gap-1 text-yellow-600 font-medium">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            Draft: {questionBank.draftQuestions || 0}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm border ${getStatusBadge('Active')}`}>
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                      <div className="font-medium">{new Date(questionBank.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">Course-based</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleManageQuestions(questionBank)}
                          className="p-2 text-purple-600 hover:text-white hover:bg-purple-600 rounded-lg transition-all duration-200 hover:shadow-md"
                          title="Manage Questions"
                        >
                          <FiSettings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewDetails(questionBank)}
                          className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 hover:shadow-md"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(questionBank)}
                          className="p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-lg transition-all duration-200 hover:shadow-md"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(questionBank.id)}
                          className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 hover:shadow-md"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-all duration-200"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-all duration-200"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">
                    Showing <span className="font-bold text-blue-600">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to{' '}
                    <span className="font-bold text-blue-600">
                      {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
                    </span>{' '}
                    of <span className="font-bold text-blue-600">{pagination.totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-lg shadow-sm gap-1">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition-all duration-200"
                    >
                      Previous
                    </button>
                    {[...Array(pagination.totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === pagination.page) {
                        return (
                          <button
                            key={pageNum}
                            className="relative inline-flex items-center px-4 py-2 rounded-lg border border-blue-500 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white shadow-md"
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (Math.abs(pageNum - pagination.page) <= 2 || pageNum === 1 || pageNum === pagination.totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (Math.abs(pageNum - pagination.page) === 3) {
                        return <span key={pageNum} className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-400">...</span>;
                      }
                      return null;
                    })}
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition-all duration-200"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Questions Management View */}
      {currentView === 'questions' && selectedQuestionBank && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToBanks}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <FiArrowLeft size={20} />
                <span>Back to Question Banks</span>
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Managing Questions: {selectedQuestionBank.title}
                </h2>
                <p className="text-sm text-gray-600">
                  Type: Question Bank | Total Questions: {questions.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FiPlus size={16} />
              <span>Add New Question</span>
            </button>
          </div>

          {questionsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No questions found in this question bank.</p>
              <p className="text-sm text-gray-400 mt-2">
                Questions uploaded through SAT Question Upload will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject/Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Features
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.map((question) => (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">
                          <div className="font-medium truncate">
                            {question.questionText || 'No question text'}
                          </div>
                          {question.questionParagraph && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Context: {question.questionParagraph.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {question.subject || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {question.topic || 'No topic'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          question.moduleType === 'Base' ? 'bg-blue-100 text-blue-800' :
                          question.moduleType === 'Adaptive' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {question.moduleType || 'Base'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          question.questionType === 'MultipleChoice' ? 'bg-green-100 text-green-800' :
                          question.questionType === 'TrueFalse' ? 'bg-blue-100 text-blue-800' :
                          question.questionType === 'ShortAnswer' ? 'bg-orange-100 text-orange-800' :
                          question.questionType === 'Essay' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {question.questionType === 'MultipleChoice' ? 'Multiple Choice' :
                           question.questionType === 'TrueFalse' ? 'True/False' :
                           question.questionType === 'ShortAnswer' ? 'Short Answer' :
                           question.questionType === 'Essay' ? 'Essay' :
                           question.questionType || 'Multiple Choice'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          question.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {question.difficulty || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {question.passageText && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800" title="Has passage text">
                              📖
                            </span>
                          )}
                          {question.imageUrl && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800" title="Has image">
                              🖼️
                            </span>
                          )}
                          {question.explanation && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800" title="Has explanation">
                              💡
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-32">
                          {question.tags ? (
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                // Handle both string and array cases for tags
                                const tagsArray = typeof question.tags === 'string' 
                                  ? question.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                                  : Array.isArray(question.tags) ? question.tags : [];
                                
                                return tagsArray.slice(0, 2).map((tag, index) => (
                                  <span key={index} className="inline-flex px-1 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                    {tag}
                                  </span>
                                ));
                              })()} 
                              {(() => {
                                const tagsArray = typeof question.tags === 'string' 
                                  ? question.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                                  : Array.isArray(question.tags) ? question.tags : [];
                                return tagsArray.length > 2 && (
                                  <span className="text-xs text-gray-500">+{tagsArray.length - 2}</span>
                                );
                              })()} 
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No tags</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          question.status === 'Active' ? 'bg-green-100 text-green-800' :
                          question.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {question.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditQuestion(question)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Question"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Question"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Questions Pagination */}
          {questionsPagination.totalPages > 1 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, questionsPagination.page - 1);
                    setQuestionsPagination(prev => ({ ...prev, page: newPage }));
                    fetchQuestions(selectedQuestionBank.id, { page: newPage });
                  }}
                  disabled={questionsPagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-all duration-200"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    const newPage = Math.min(questionsPagination.totalPages, questionsPagination.page + 1);
                    setQuestionsPagination(prev => ({ ...prev, page: newPage }));
                    fetchQuestions(selectedQuestionBank.id, { page: newPage });
                  }}
                  disabled={questionsPagination.page === questionsPagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-all duration-200"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">
                    Showing <span className="font-bold text-blue-600">{((questionsPagination.page - 1) * questionsPagination.pageSize) + 1}</span> to{' '}
                    <span className="font-bold text-blue-600">
                      {Math.min(questionsPagination.page * questionsPagination.pageSize, questionsPagination.totalCount)}
                    </span>{' '}
                    of <span className="font-bold text-blue-600">{questionsPagination.totalCount}</span> questions
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-lg shadow-sm gap-1">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, questionsPagination.page - 1);
                        setQuestionsPagination(prev => ({ ...prev, page: newPage }));
                        fetchQuestions(selectedQuestionBank.id, { page: newPage });
                      }}
                      disabled={questionsPagination.page === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition-all duration-200"
                    >
                      Previous
                    </button>
                    {[...Array(questionsPagination.totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === questionsPagination.page) {
                        return (
                          <button
                            key={pageNum}
                            className="relative inline-flex items-center px-4 py-2 rounded-lg border border-blue-500 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white shadow-md"
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (Math.abs(pageNum - questionsPagination.page) <= 2 || pageNum === 1 || pageNum === questionsPagination.totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setQuestionsPagination(prev => ({ ...prev, page: pageNum }));
                              fetchQuestions(selectedQuestionBank.id, { page: pageNum });
                            }}
                            className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (Math.abs(pageNum - questionsPagination.page) === 3) {
                        return <span key={pageNum} className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-400">...</span>;
                      }
                      return null;
                    })}
                    <button
                      onClick={() => {
                        const newPage = Math.min(questionsPagination.totalPages, questionsPagination.page + 1);
                        setQuestionsPagination(prev => ({ ...prev, page: newPage }));
                        fetchQuestions(selectedQuestionBank.id, { page: newPage });
                      }}
                      disabled={questionsPagination.page === questionsPagination.totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition-all duration-200"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <QuestionBankModal
          questionBank={editingQuestionBank}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingQuestionBank(null);
          }}
        />
      )}

      {showDetailsModal && selectedQuestionBank && (
        <QuestionBankDetailsModal
          questionBank={selectedQuestionBank}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedQuestionBank(null);
          }}
        />
      )}

      {showQuestionModal && (
        <QuestionEditModal
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
};

const QuestionBankModal = ({ questionBank, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: questionBank?.title || '',
    description: questionBank?.description || '',
    subject: questionBank?.subject || 'Math',
    status: questionBank?.status || 'Draft',
    tags: questionBank?.tags ? questionBank.tags.join(', ') : '',
    isPublic: questionBank?.isPublic || false
  });
  const [loading, setLoading] = useState(false);

  // Update formData when questionBank prop changes
  useEffect(() => {
    if (questionBank) {
      setFormData({
        title: questionBank?.title || '',
        description: questionBank?.description || '',
        subject: questionBank?.subject || 'Math',
        status: questionBank?.status || 'Draft',
        tags: questionBank?.tags ? questionBank.tags.join(', ') : '',
        isPublic: questionBank?.isPublic || false
      });
    } else {
      // Reset form for creating new question bank
      setFormData({
        title: '',
        description: '',
        subject: 'Math',
        status: 'Draft',
        tags: '',
        isPublic: false
      });
    }
  }, [questionBank]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      await onSave(submitData);
    } catch (error) {
      console.error('Error saving question bank:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {questionBank ? 'Edit Question Bank' : 'Create Question Bank'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter question bank title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                required
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Math">Math</option>
                <option value="English">English</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter tags separated by commas"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
              Make this question bank public
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (questionBank ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const QuestionBankDetailsModal = ({ questionBank, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Question Bank Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Title</label>
                  <p className="text-gray-900">{questionBank.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900">{questionBank.description || 'No description provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Subject</label>
                    <p className="text-gray-900">{questionBank.subject}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${questionBank.status === 'Active' ? 'bg-green-100 text-green-800' : questionBank.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {questionBank.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Public</label>
                  <p className="text-gray-900">{questionBank.isPublic ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {questionBank.tags && questionBank.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {questionBank.tags.map((tag, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistics</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{questionBank.totalQuestions}</div>
                    <div className="text-sm text-gray-600">Total Questions</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{questionBank.activeQuestions}</div>
                    <div className="text-sm text-gray-600">Active</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{questionBank.draftQuestions}</div>
                    <div className="text-sm text-gray-600">Draft</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Metadata</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Created By</label>
                  <p className="text-gray-900">{questionBank.createdBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created At</label>
                  <p className="text-gray-900">{new Date(questionBank.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-gray-900">{new Date(questionBank.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionEditModal = ({ question, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: question?.title || '',
    questionParagraph: question?.questionParagraph || '',
    questionText: question?.content || question?.questionText || '',
    subject: question?.subject || 'Math',
    mathTopic: question?.mathTopic || '',
    mathSubtopic: question?.mathSubtopic || '',
    readingWritingTopic: question?.readingWritingTopic || '',
    difficulty: question?.difficulty || 1,
    correctAnswer: question?.correctAnswer || 'A',
    optionA: question?.optionA || '',
    optionB: question?.optionB || '',
    optionC: question?.optionC || '',
    optionD: question?.optionD || '',
    explanation: question?.explanation || '',
    tags: Array.isArray(question?.tags) ? question?.tags.join(', ') : (question?.tags || ''),
    imageUrl: question?.imageUrl || ''
  });

  // Update formData when question prop changes
  useEffect(() => {
    if (question) {
      setFormData({
        title: question?.title || '',
        questionParagraph: question?.questionParagraph || '',
        questionText: question?.content || question?.questionText || '',
        subject: question?.subject || 'Math',
        mathTopic: question?.mathTopic || '',
        mathSubtopic: question?.mathSubtopic || '',
        readingWritingTopic: question?.readingWritingTopic || '',
        difficulty: question?.difficulty || 1,
        correctAnswer: question?.correctAnswer || 'A',
        optionA: question?.optionA || '',
        optionB: question?.optionB || '',
        optionC: question?.optionC || '',
        optionD: question?.optionD || '',
        explanation: question?.explanation || '',
        tags: Array.isArray(question?.tags) ? question?.tags.join(', ') : (question?.tags || ''),
        imageUrl: question?.imageUrl || ''
      });
    }
  }, [question]);

  // Math subtopics hierarchy
  const mathSubtopics = {
    'algebra': {
      label: 'Algebra',
      subtopics: {
        'expression': 'Expression',
        'linear-equations': 'Linear Equations',
        'linear-system-equations': 'Linear System of Equations',
        'linear-functions': 'Linear Functions',
        'linear-inequalities': 'Linear Inequalities'
      }
    },
    'advance-math': {
      label: 'Advance Math',
      subtopics: {
        'polynomials': 'Polynomials',
        'exponents-radicals': 'Exponents & Radicals',
        'functions-notation': 'Functions & Function Notations',
        'exponential-functions': 'Exponential Functions',
        'quadratics': 'Quadratics'
      }
    },
    'word-problem-data-analysis': {
      label: 'Word Problem and Data Analysis',
      subtopics: {}
    },
    'geometry': {
      label: 'Geometry',
      subtopics: {}
    }
  };

  // Reading and Writing subtopics hierarchy
  const readingWritingTopics = {
    'reading': 'Reading',
    'writing': 'Writing'
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        showToast('Image uploaded successfully!', 'success');
      } catch (error) {
        showToast('Failed to upload image. Please try again.', 'error');
      }
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {question?.id ? 'Edit Question' : 'Add New Question'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const questionData = {
            title: formData.title || 'Question',
            content: formData.questionText,
            questionParagraph: formData.questionParagraph,
            subject: formData.subject || 'Math',
            mathTopic: formData.mathTopic,
            mathSubtopic: formData.mathSubtopic,
            readingWritingTopic: formData.readingWritingTopic,
            difficulty: parseInt(formData.difficulty) || 1,
            type: 1, // MultipleChoice
            testType: 1, // Base
            correctAnswer: formData.correctAnswer || 'A',
            optionA: formData.optionA,
            optionB: formData.optionB,
            optionC: formData.optionC,
            optionD: formData.optionD,
            options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
            points: 1,
            explanation: formData.explanation || '',
            imageUrl: formData.imageUrl
          };
          onSave(questionData);
        }}>
          <div className="space-y-4">
            {/* Subject Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Math">Math</option>
                  <option value="Reading and Writing">Reading and Writing</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="1">Easy</option>
                  <option value="2">Medium</option>
                  <option value="3">Hard</option>
                </select>
              </div>
            </div>

            {/* Math Topic Selection (only for Math subject) */}
            {formData.subject === 'Math' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Math Topic *
                  </label>
                  <select
                    value={formData.mathTopic}
                    onChange={(e) => {
                      handleInputChange('mathTopic', e.target.value);
                      handleInputChange('mathSubtopic', ''); // Reset subtopic when topic changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={formData.subject === 'Math'}
                  >
                    <option value="">Select Math Topic</option>
                    {Object.entries(mathSubtopics).map(([key, topic]) => (
                      <option key={key} value={key}>{topic.label}</option>
                    ))}
                  </select>
                </div>
                
                {formData.mathTopic && Object.keys(mathSubtopics[formData.mathTopic]?.subtopics || {}).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Math Subtopic *
                    </label>
                    <select
                      value={formData.mathSubtopic}
                      onChange={(e) => handleInputChange('mathSubtopic', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.subject === 'Math' && Object.keys(mathSubtopics[formData.mathTopic]?.subtopics || {}).length > 0}
                    >
                      <option value="">Select Math Subtopic</option>
                      {Object.entries(mathSubtopics[formData.mathTopic]?.subtopics || {}).map(([key, subtopic]) => (
                        <option key={key} value={key}>{subtopic}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Reading and Writing Topic Selection (only for Reading and Writing subject) */}
            {formData.subject === 'Reading and Writing' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <select
                    value={formData.readingWritingTopic}
                    onChange={(e) => handleInputChange('readingWritingTopic', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={formData.subject === 'Reading and Writing'}
                  >
                    <option value="">Select Topic</option>
                    {Object.entries(readingWritingTopics).map(([key, topic]) => (
                      <option key={key} value={key}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter question title"
                required
              />
            </div>

            {/* Question Paragraph (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Paragraph (Optional)
              </label>
              <textarea
                value={formData.questionParagraph}
                onChange={(e) => handleInputChange('questionParagraph', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter optional paragraph or context for the question..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Content *
              </label>
              <textarea
                value={formData.questionText}
                onChange={(e) => handleInputChange('questionText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter the question content"
                required
              />
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Image (Optional)
              </label>
              
              {!formData.imageUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
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

            {/* Answer Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Options *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option A</label>
                  <input
                    type="text"
                    value={formData.optionA}
                    onChange={(e) => handleInputChange('optionA', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option B</label>
                  <input
                    type="text"
                    value={formData.optionB}
                    onChange={(e) => handleInputChange('optionB', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option B"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option C</label>
                  <input
                    type="text"
                    value={formData.optionC}
                    onChange={(e) => handleInputChange('optionC', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option C"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option D</label>
                  <input
                    type="text"
                    value={formData.optionD}
                    onChange={(e) => handleInputChange('optionD', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option D"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Correct Answer and Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer *
                </label>
                <select
                  value={formData.correctAnswer}
                  onChange={(e) => handleInputChange('correctAnswer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={formData.subject === 'Math' ? 'algebra, linear-equations, polynomials' : 'reading-comprehension, grammar, vocabulary'}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Explanation
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => handleInputChange('explanation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Explain why this is the correct answer..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {question?.id ? 'Save Changes' : 'Create Question'}
            </button>
          </div>
        </form>
       </div>
     </div>
   );
 };

 export default QuestionBankManagement;