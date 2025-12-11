import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDatabase, FiBook, FiPlay, FiClock, FiUsers, FiTrendingUp, FiCalendar, FiActivity, FiBarChart, FiSettings } from 'react-icons/fi';
import { getAllEnrolledQuestionBanks, getAvailableQuestionBanks } from '../../../services/api/questionBankEnrollments/index.js';

import { createCheckoutSession } from '../../../services/api/courses';
import { showToast } from '../../../utils/toastUtils';

const QuestionBanks = () => {
  const navigate = useNavigate();
  const [enrolledQuestionBanks, setEnrolledQuestionBanks] = useState([]);
  const [availableQuestionBanks, setAvailableQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' or 'available'
  const [practiceMenuOpen, setPracticeMenuOpen] = useState(null);


  const slugify = (str) => (str || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  useEffect(() => {
    fetchQuestionBanks();

  }, []);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const [enrolledResponse, availableResponse] = await Promise.all([
        getAllEnrolledQuestionBanks(),
        getAvailableQuestionBanks()
      ]);
      
      const enrolledData = Array.isArray(enrolledResponse)
        ? enrolledResponse
        : (enrolledResponse?.data || []);
      const availableData = Array.isArray(availableResponse)
        ? availableResponse
        : (availableResponse?.data || []);

      setEnrolledQuestionBanks(enrolledData);
      setAvailableQuestionBanks(availableData);
    } catch (error) {
      console.error('Error fetching question banks:', error);
      showToast('Failed to load question banks', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleEnroll = async (questionBankId) => {
    try {
      setEnrolling(questionBankId);
      const response = await createCheckoutSession(questionBankId, null, '/dashboard/question-banks');
      if (response?.sessionUrl) {
        window.location.href = response.sessionUrl;
      } else {
        showToast('Unable to start checkout session', 'error');
      }
    } catch (error) {
      console.error('Error starting checkout for question bank:', error);
      showToast('Failed to start checkout', 'error');
    } finally {
      setEnrolling(null);
    }
  };

  const handlePractice = (questionBankId) => {
    const qb = enrolledQuestionBanks.find(q => (q.id || q.questionBankId) === questionBankId);
    if (!qb) {
      showToast('Question Bank not found', 'error');
      return;
    }
    // Use question bank ID directly instead of slug to avoid conflicts
    navigate(`/dashboard/practice/qb-${questionBankId}`);
  };

  const handlePracticeOption = (questionBankId, option) => {
    const qb = enrolledQuestionBanks.find(q => (q.id || q.questionBankId) === questionBankId);
    if (!qb) {
      showToast('Question Bank not found', 'error');
      return;
    }
    // Use question bank ID directly instead of slug to avoid conflicts
    navigate(`/dashboard/practice/qb-${questionBankId}`, {
      state: option
    });
  };

  const handleStudyPlan = (questionBankId) => {
    navigate(`/dashboard/study-plan/${questionBankId}`);
  };

  const handleDiagnosticTest = (questionBankId) => {
    navigate(`/dashboard/diagnostic/${questionBankId}`);
  };

  const handleAnalytics = (questionBankId) => {
    navigate(`/dashboard/analytics/${questionBankId}`);
  };

  const QuestionBankCard = ({ questionBank, isEnrolled = false }) => {
    const getSubjectColor = (subject) => {
      switch (subject?.toLowerCase()) {
        case 'math':
          return 'bg-blue-100 text-blue-800';
        case 'reading':
        case 'english':
          return 'bg-green-100 text-green-800';
        case 'writing':
          return 'bg-purple-100 text-purple-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiDatabase className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {questionBank.name || questionBank.title}
              </h3>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                getSubjectColor(questionBank.subject)
              }`}>
                {questionBank.subject || 'General'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {questionBank.description || 'Practice questions to improve your skills'}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <FiBook size={16} />
              <span>{questionBank.totalQuestions || 0} Questions</span>
            </div>
            {questionBank.difficulty && (
              <div className="flex items-center gap-1">
                <FiTrendingUp size={16} />
                <span>{questionBank.difficulty}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isEnrolled ? (
            <>
              {/* Practice Button with Options Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    const qbId = questionBank?.id || questionBank?.questionBankId;
                    if (qbId) {
                      navigate(`/dashboard/practice/qb-${qbId}`);
                    } else {
                      showToast('Question Bank not found', 'error');
                    }
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiPlay size={16} />
                  Practice
                </button>
                {practiceMenuOpen === questionBank.id && (
                  <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                    <button
                      onClick={() => {
                        setPracticeMenuOpen(null);
                        handlePracticeOption(questionBank.id, { mode: 'quick', limit: 10, timed: false });
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Quick Practice (10 Questions)
                    </button>
                    <button
                      onClick={() => {
                        setPracticeMenuOpen(null);
                        handlePracticeOption(questionBank.id, { mode: 'timed', limit: 20, timed: true, timePerQuestionSec: 75 });
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Timed Practice (20 Questions)
                    </button>
                    <button
                      onClick={() => {
                        setPracticeMenuOpen(null);
                        handlePracticeOption(questionBank.id, { mode: 'topic', timed: false });
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Practice by Topic
                    </button>
                    <button
                      onClick={() => {
                        setPracticeMenuOpen(null);
                        handlePracticeOption(questionBank.id, { mode: 'mixed', limit: 15, timed: false });
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Mixed Set (15 Questions)
                    </button>
                  </div>
                )}
              </div>
              
              {/* Personalized Practice Button */}
              <button
                onClick={() => {
                  const qbId = questionBank?.id || questionBank?.questionBankId;
                  navigate(`/dashboard/practice/create?questionBankId=${qbId}`);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 mb-2"
                title="Personalized Practice"
              >
                <FiSettings size={16} />
                <span>Personalized Practice</span>
              </button>
              
              {/* Secondary Options */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStudyPlan(questionBank.id)}
                  className="bg-green-100 text-green-700 px-3 py-2 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1 text-sm"
                  title="Study Plan"
                >
                  <FiCalendar size={14} />
                  <span className="hidden sm:inline">Study Plan</span>
                </button>
                
                <button
                  onClick={() => handleDiagnosticTest(questionBank.id)}
                  className="bg-orange-100 text-orange-700 px-3 py-2 rounded-md hover:bg-orange-200 transition-colors flex items-center justify-center gap-1 text-sm"
                  title="Diagnostic Test"
                >
                  <FiActivity size={14} />
                  <span className="hidden sm:inline">Diagnostic</span>
                </button>
                
                <button
                  onClick={() => handleAnalytics(questionBank.id)}
                  className="bg-purple-100 text-purple-700 px-3 py-2 rounded-md hover:bg-purple-200 transition-colors flex items-center justify-center gap-1 text-sm"
                  title="Analytics"
                >
                  <FiBarChart size={14} />
                  <span className="hidden sm:inline">Analytics</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => handleEnroll(questionBank.id)}
              disabled={enrolling === questionBank.id}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrolling === questionBank.id ? 'Enrolling...' : 'Enroll'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question banks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Banks</h1>
            <p className="text-gray-600">
              Practice with curated question collections to improve your SAT/PSAT scores
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'enrolled'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Question Banks ({enrolledQuestionBanks.length})
              </button>
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Question Banks ({availableQuestionBanks.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'enrolled' ? (
            enrolledQuestionBanks.length > 0 ? (
              enrolledQuestionBanks.map((questionBank) => (
                <QuestionBankCard
                  key={questionBank.id}
                  questionBank={questionBank}
                  isEnrolled={true}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FiDatabase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Enrolled Question Banks
                </h3>
                <p className="text-gray-500 mb-4">
                  You haven't enrolled in any question banks yet.
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Browse Available Question Banks
                </button>
              </div>
            )
          ) : (
            availableQuestionBanks.length > 0 ? (
              availableQuestionBanks.map((questionBank) => (
                <QuestionBankCard
                  key={questionBank.id}
                  questionBank={questionBank}
                  isEnrolled={false}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FiDatabase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Available Question Banks
                </h3>
                <p className="text-gray-500 mb-4">
                  There are currently no question banks available to enroll.
                </p>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default QuestionBanks;