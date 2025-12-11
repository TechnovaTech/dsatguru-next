import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiArrowLeft, FiBookOpen, FiSettings } from "react-icons/fi";
import * as questionBankAPI from "../../services/api/questionBanks";
import { getQuestionsByQuestionBank, updateQuestion, deleteQuestion } from "../../services/api/questions";

const NewQuestionBankManagement = () => {
  const [questionBanks, setQuestionBanks] = useState([]);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Fetch question banks on component mount
  useEffect(() => {
    fetchQuestionBanks();
  }, []);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const response = await questionBankAPI.getQuestionBanks({ isActive: true });
      setQuestionBanks(response.data || []);
    } catch (error) {
      console.error("Failed to fetch question banks:", error);
      setQuestionBanks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (questionBankId) => {
    try {
      setQuestionsLoading(true);
      const response = await getQuestionsByQuestionBank(questionBankId);
      setQuestions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSelectQuestionBank = async (questionBank) => {
    setSelectedQuestionBank(questionBank);
    await fetchQuestions(questionBank.id);
  };

  const handleBackToSelection = () => {
    setSelectedQuestionBank(null);
    setQuestions([]);
    setSearchTerm("");
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteQuestion(questionId);
        await fetchQuestions(selectedQuestionBank.id);
        alert("Question deleted successfully!");
      } catch (error) {
        console.error("Failed to delete question:", error);
        alert("Failed to delete question. Please try again.");
      }
    }
  };

  const filteredQuestionBanks = questionBanks.filter(bank =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Question Bank Selection View
  if (!selectedQuestionBank) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Bank Management</h1>
          <p className="text-gray-600">Select a question bank to manage its questions</p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search question banks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Question Banks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredQuestionBanks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FiBookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Question Banks Found</h3>
              <p className="text-gray-500">
                {searchTerm ? "No question banks match your search." : "Create question banks first to manage questions."}
              </p>
            </div>
          ) : (
            filteredQuestionBanks.map((questionBank) => (
              <div
                key={questionBank.id}
                onClick={() => handleSelectQuestionBank(questionBank)}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{questionBank.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {questionBank.description || "No description provided"}
                    </p>
                  </div>
                  <FiSettings className="text-gray-400 ml-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Subject:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      questionBank.subject === 'Math' ? 'bg-blue-100 text-blue-800' :
                      questionBank.subject === 'Reading' ? 'bg-green-100 text-green-800' :
                      questionBank.subject === 'Writing' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {questionBank.subject}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Questions:</span>
                    <span className="font-semibold text-gray-900">{questionBank.totalQuestions || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Active:</span>
                    <span className="text-green-600 font-medium">{questionBank.activeQuestions || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Draft:</span>
                    <span className="text-yellow-600 font-medium">{questionBank.draftQuestions || 0}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Created: {new Date(questionBank.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      questionBank.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {questionBank.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Question Management View
  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleBackToSelection}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back to Question Banks</span>
        </button>
        <div className="border-l border-gray-300 pl-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Managing: {selectedQuestionBank.name}
          </h2>
          <p className="text-sm text-gray-600">
            Subject: {selectedQuestionBank.subject} | Total Questions: {questions.length}
          </p>
        </div>
      </div>

      {/* Questions Content */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {questionsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <FiBookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
            <p className="text-gray-500 mb-4">
              This question bank doesn't have any questions yet.
            </p>
            <p className="text-sm text-gray-400">
              Use the SAT Question Upload feature to add questions to this bank.
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
                    Difficulty
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
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {question.questionText || question.title || 'No question text'}
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
                        question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        question.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {question.difficulty || 'N/A'}
                      </span>
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
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit Question"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Question"
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
        )}
      </div>

      {/* Question Edit Modal */}
      {showQuestionModal && editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          onSave={async (updatedQuestion) => {
            try {
              await updateQuestion(editingQuestion.id, updatedQuestion);
              await fetchQuestions(selectedQuestionBank.id);
              setShowQuestionModal(false);
              setEditingQuestion(null);
              alert("Question updated successfully!");
            } catch (error) {
              console.error("Failed to update question:", error);
              alert("Failed to update question. Please try again.");
            }
          }}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
};

// Simple Question Edit Modal Component
const QuestionEditModal = ({ question, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    questionText: question.questionText || question.title || '',
    difficulty: question.difficulty || 'Medium',
    status: question.status || 'Draft',
    mathTopic: question.mathTopic || question.topic || ''
  });

  // Update formData when question prop changes
  useEffect(() => {
    if (question) {
      setFormData({
        questionText: question.questionText || question.title || '',
        difficulty: question.difficulty || 'Medium',
        status: question.status || 'Draft',
        mathTopic: question.mathTopic || question.topic || ''
      });
    }
  }, [question]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Question</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <textarea
              value={formData.questionText}
              onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter question text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input
              type="text"
              value={formData.mathTopic}
              onChange={(e) => setFormData(prev => ({ ...prev, mathTopic: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter topic"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewQuestionBankManagement;