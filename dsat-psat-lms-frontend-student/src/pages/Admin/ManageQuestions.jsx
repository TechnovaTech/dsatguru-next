import { useState, useEffect, useCallback } from "react";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiFilter, FiRefreshCw, FiEye, FiEyeOff } from "react-icons/fi";
import axios from 'axios';
import { getQuestionsByQuestionBank, deleteQuestion } from "../../services/api/questions";
import { showToast } from "../../utils/toastUtils";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ManageQuestions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(searchParams.get('bankId') || '');
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState(null);
  
  // Filters and search
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    subject: searchParams.get('subject') || '',
    difficulty: searchParams.get('difficulty') || '',
    testType: searchParams.get('testType') || '',
    isActive: searchParams.get('isActive') !== 'false' // Default to true
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: parseInt(searchParams.get('page')) || 1,
    totalPages: 0,
    totalCount: 0,
    pageSize: 20,
    hasNextPage: false,
    hasPreviousPage: false
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // Initialize component
  useEffect(() => {
    fetchQuestionBanks();
  }, []);

  // Auto-load questions when bank is selected
  useEffect(() => {
    if (selectedBankId) {
      fetchQuestions();
    } else {
      setQuestions([]);
      setSelectedQuestionBank(null);
    }
  }, [selectedBankId]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBankId) params.set('bankId', selectedBankId);
    if (filters.search) params.set('search', filters.search);
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.testType) params.set('testType', filters.testType);
    if (!filters.isActive) params.set('isActive', 'false');
    if (pagination.currentPage > 1) params.set('page', pagination.currentPage.toString());
    
    setSearchParams(params);
  }, [selectedBankId, filters, pagination.currentPage, setSearchParams]);

  // Fetch question banks
  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/questions/question-banks`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "ngrok-skip-browser-warning": "69420",
        },
      });
      
      const banks = response.data.data || [];
      setQuestionBanks(banks);
      
      if (banks.length === 0) {
        showToast('No question banks found. Please create question banks in Course Management first.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching question banks:', error);
      showToast('Failed to load question banks. Please check your connection and try again.', 'error');
      setQuestionBanks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions with current filters
  const fetchQuestions = useCallback(async (page = pagination.currentPage) => {
    if (!selectedBankId) return;
    
    try {
      setQuestionsLoading(true);
      const response = await getQuestionsByQuestionBank(selectedBankId, {
        page,
        pageSize: pagination.pageSize,
        ...filters
      });
      
      setQuestions(response.data || []);
      setPagination(prev => ({
        ...prev,
        currentPage: response.pagination.currentPage,
        totalPages: response.pagination.totalPages,
        totalCount: response.pagination.totalCount,
        hasNextPage: response.pagination.hasNextPage,
        hasPreviousPage: response.pagination.hasPreviousPage
      }));
      
      if (response.questionBank) {
        setSelectedQuestionBank(response.questionBank);
      }
      
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      showToast(error.message || 'Failed to load questions', 'error');
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedBankId, filters, pagination.pageSize, pagination.currentPage]);

  // Handle bank selection
  const handleBankChange = (bankId) => {
    setSelectedBankId(bankId);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchQuestions(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      fetchQuestions(newPage);
    }
  };

  // Handle edit
  const handleEdit = (question) => {
    navigate(`/admin/single-question-upload?edit=${question.id}`);
  };

  // Handle delete
  const handleDelete = async (questionId) => {
    const question = questions.find(q => q.id === questionId);
    const confirmMessage = `Are you sure you want to delete this question?\n\n"${question?.title || question?.content?.slice(0, 100) || 'Untitled'}"\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setDeletingQuestionId(questionId);
      await deleteQuestion(questionId);
      showToast('Question deleted successfully', 'success');
      
      // Refresh questions list
      await fetchQuestions();
    } catch (error) {
      console.error('Delete failed:', error);
      showToast(error?.response?.data?.message || 'Failed to delete question', 'error');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // Handle create new
  const handleCreateNew = () => {
    const params = selectedBankId ? `?bankId=${selectedBankId}` : '';
    navigate(`/admin/single-question-upload${params}`);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      subject: '',
      difficulty: '',
      testType: '',
      isActive: true
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Refresh questions
  const refreshQuestions = () => {
    fetchQuestions();
  };

  // Get difficulty label and color
  const getDifficultyInfo = (difficulty) => {
    const difficultyMap = {
      1: { label: 'Easy', color: 'bg-green-100 text-green-800' },
      2: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
      3: { label: 'Hard', color: 'bg-red-100 text-red-800' }
    };
    return difficultyMap[difficulty] || { label: difficulty || '-', color: 'bg-gray-100 text-gray-800' };
  };

  // Get test type label and color
  const getTestTypeInfo = (testType) => {
    const testTypeMap = {
      1: { label: 'Base', color: 'bg-gray-100 text-gray-800' },
      2: { label: 'Adaptive', color: 'bg-purple-100 text-purple-800' }
    };
    return testTypeMap[testType] || { label: testType || '-', color: 'bg-gray-100 text-gray-800' };
  };

  // Get subject color
  const getSubjectColor = (subject) => {
    return subject === 'Math' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Manage Questions
              </h1>
              <p className="text-gray-600">
                View, edit, and delete existing SAT questions from your question banks
                {selectedQuestionBank && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • {selectedQuestionBank.title}
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={refreshQuestions}
                disabled={!selectedBankId || questionsLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className={`mr-2 ${questionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FiPlus className="mr-2" />
                Add New Question
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {/* Filters Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Question Bank Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Bank *</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || questionBanks.length === 0}
                >
                  <option value="">
                    {loading ? 'Loading question banks...' : 
                     questionBanks.length === 0 ? 'No question banks available' : 
                     'Select Question Bank'}
                  </option>
                  {questionBanks.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.title}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search questions..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subjects</option>
                  <option value="Math">Math</option>
                  <option value="Reading and Writing">Reading and Writing</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Difficulties</option>
                  <option value="1">Easy</option>
                  <option value="2">Medium</option>
                  <option value="3">Hard</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <FiFilter className="mr-1" />
                  {showFilters ? 'Hide' : 'Show'} Advanced Filters
                </button>
                
                {(filters.search || filters.subject || filters.difficulty || filters.testType || !filters.isActive) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSearch}
                  disabled={!selectedBankId || questionsLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {questionsLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                    <select
                      value={filters.testType}
                      onChange={(e) => handleFilterChange('testType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="1">Base</option>
                      <option value="2">Adaptive</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isActive"
                          checked={filters.isActive === true}
                          onChange={() => handleFilterChange('isActive', true)}
                          className="mr-2"
                        />
                        <FiEye className="mr-1" />
                        Active
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isActive"
                          checked={filters.isActive === false}
                          onChange={() => handleFilterChange('isActive', false)}
                          className="mr-2"
                        />
                        <FiEyeOff className="mr-1" />
                        Inactive
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Questions Table */}
          <div className="p-6">
            {!selectedBankId ? (
              <div className="text-center py-12">
                <FiSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Question Bank</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a question bank from the dropdown above to view and manage its questions.
                </p>
                {questionBanks.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No question banks found. Please create question banks in Course Management first.
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Results Summary */}
                {pagination.totalCount > 0 && (
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
                    {pagination.totalCount} questions
                    {(filters.search || filters.subject || filters.difficulty || filters.testType || !filters.isActive) && (
                      <span className="ml-2 text-blue-600">(filtered)</span>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {questionsLoading ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                              <span className="text-sm text-gray-500">Loading questions...</span>
                            </div>
                          </td>
                        </tr>
                      ) : questions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <div className="text-center">
                              <FiSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                {filters.search || filters.subject || filters.difficulty || filters.testType || !filters.isActive ? 
                                  'No questions match your current filters.' :
                                  'This question bank doesn\'t have any questions yet.'
                                }
                              </p>
                              <div className="flex justify-center space-x-3">
                                {(filters.search || filters.subject || filters.difficulty || filters.testType || !filters.isActive) && (
                                  <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                  >
                                    Clear Filters
                                  </button>
                                )}
                                <button
                                  onClick={handleCreateNew}
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  <FiPlus className="mr-2" />
                                  Add First Question
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        questions.map((question) => {
                          const difficultyInfo = getDifficultyInfo(question.difficulty);
                          const testTypeInfo = getTestTypeInfo(question.testType);
                          const isDeleting = deletingQuestionId === question.id;
                          
                          return (
                            <tr key={question.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="max-w-xs">
                                  <div className="text-sm text-gray-900 font-medium truncate">
                                    {question.title || (question.content ? question.content.slice(0, 60) + '...' : 'Untitled')}
                                  </div>
                                  {question.content && question.content.length > 60 && (
                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                      {question.content.slice(60, 120)}...
                                    </div>
                                  )}
                                  {question.questionParagraph && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      Has paragraph
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSubjectColor(question.subject)}`}>
                                  {question.subject || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${difficultyInfo.color}`}>
                                  {difficultyInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${testTypeInfo.color}`}>
                                  {testTypeInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  question.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {question.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-sm">
                                <div className="flex justify-end space-x-2">
                                  <button 
                                    onClick={() => handleEdit(question)} 
                                    disabled={questionsLoading || isDeleting}
                                    className="inline-flex items-center px-3 py-1.5 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Edit question"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(question.id)} 
                                    disabled={questionsLoading || isDeleting}
                                    className="inline-flex items-center px-3 py-1.5 rounded text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Delete question"
                                  >
                                    {isDeleting ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                    ) : (
                                      <FiTrash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPreviousPage || questionsLoading}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const startPage = Math.max(1, pagination.currentPage - 2);
                        const pageNum = startPage + i;
                        if (pageNum > pagination.totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={questionsLoading}
                            className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                              pageNum === pagination.currentPage
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage || questionsLoading}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageQuestions;