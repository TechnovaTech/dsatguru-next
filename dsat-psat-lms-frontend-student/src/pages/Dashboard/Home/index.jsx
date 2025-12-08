import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBook, FiClock, FiTarget, FiTrendingUp, FiBookmark, FiVideo, FiMessageSquare, FiPlay, FiUsers, FiExternalLink, FiEdit, FiDatabase, FiCalendar, FiActivity, FiBarChart } from "react-icons/fi";
import { FaCalculator } from "react-icons/fa";
import { useAuth } from "../../../context/AuthContext";
import { getAllEnrolledCourses } from "../../../services/api/courses/index.js";
import { getUserStatistics, getRecentActivity } from "../../../services/api/analytics/index.js";
import { getBookmarks } from "../../../services/api/bookmarks/index.js";
import { getAllEnrolledQuestionBanks } from "../../../services/api/questionBankEnrollments/index.js";
import { useCourses } from "../../../context/CourseContext";
import { useLiveClassSignalR } from "../../../hooks/useSignalR";

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [enrolledQuestionBanks, setEnrolledQuestionBanks] = useState([]);
  const [stats, setStats] = useState({
    totalAttempted: 0,
    correctAnswers: 0,
    accuracy: 0,
    studyHours: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [practiceMenuOpen, setPracticeMenuOpen] = useState(null);
  
  // Question Bank Card Component
  const QuestionBankCard = ({ questionBank }) => {
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

    const handlePracticeOption = (id, option) => {
      const qb = enrolledQuestionBanks.find(q => (q.questionBankId || q.id) === id);
      const qbId = qb?.questionBankId || qb?.id;
      if (!qbId) return;
      navigate(`/dashboard/practice/qb-${qbId}`, { state: option });
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiDatabase className="text-blue-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {questionBank.questionBankName || questionBank.name || questionBank.title}
              </h3>
            </div>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
              getSubjectColor(questionBank.subject)
            }`}>
              {questionBank.subject || 'General'}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {questionBank.description || 'Practice questions to improve your skills'}
          </p>
          
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <FiBook className="mr-1" />
            <span>{questionBank.questionCount || 0} Questions</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="relative">
              <button
                onClick={() => navigate(`/dashboard/practice/qb-${questionBank.questionBankId || questionBank.id}`)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <FiPlay className="mr-2" /> Practice
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => navigate(`/dashboard/study-plan/${questionBank.questionBankId || questionBank.id}`)}
                className="bg-green-100 text-green-700 px-2 py-1 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1 text-xs"
                title="Study Plan"
              >
                <FiCalendar size={12} />
                <span className="hidden sm:inline">Study</span>
              </button>
              
              <button
                onClick={() => navigate(`/dashboard/diagnostic/${questionBank.questionBankId || questionBank.id}`)}
                className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors flex items-center justify-center gap-1 text-xs"
                title="Diagnostic Test"
              >
                <FiActivity size={12} />
                <span className="hidden sm:inline">Test</span>
              </button>
              
              <button
                onClick={() => navigate(`/dashboard/analytics/${questionBank.questionBankId || questionBank.id}`)}
                className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200 transition-colors flex items-center justify-center gap-1 text-xs"
                title="Analytics"
              >
                <FiBarChart size={12} />
                <span className="hidden sm:inline">Stats</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const { isConnected } = useLiveClassSignalR();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch enrolled courses
      const coursesResponse = await getAllEnrolledCourses();
      setEnrolledCourses(coursesResponse || []);
      
      // Fetch enrolled question banks
      const questionBanksResponse = await getAllEnrolledQuestionBanks();
      setEnrolledQuestionBanks(questionBanksResponse || []);
      
      // Fetch user statistics
      await fetchUserStatistics();
      
      // Fetch recent activity
      await fetchRecentActivity();
      
      // Fetch bookmarks
      await fetchBookmarks();
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserStatistics = async () => {
    try {
      const response = await getUserStatistics();
      const data = response?.data || response || {};
      setStats({
        totalAttempted: data.totalQuestionsAttempted || data.totalAttempted || 0,
        correctAnswers: data.totalCorrectAnswers || data.correctAnswers || 0,
        accuracy: data.overallAccuracy || data.accuracy || 0,
        studyHours: data.totalStudyHours || data.studyHours || 0
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      // Fallback to mock data for development
      setStats({
        totalAttempted: 245,
        correctAnswers: 189,
        accuracy: 77,
        studyHours: 24
      });
    }
  };
  
  const fetchRecentActivity = async () => {
    try {
      const response = await getRecentActivity(5); // Get last 5 activities
      const data = response?.data || response || [];
      
      // Transform backend data to match frontend expectations
      const transformedData = Array.isArray(data) ? data.map(item => ({
        topic: item.title || item.topic || 'Unknown Topic',
        attempted: item.totalQuestions || item.attempted || 0,
        score: item.score || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString()
      })) : [];
      
      setRecentActivity(transformedData);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fallback to mock data for development
      setRecentActivity([
        { topic: "Algebra", attempted: 15, score: 80, date: "2024-01-20" },
        { topic: "Reading Comprehension", attempted: 12, score: 75, date: "2024-01-19" },
        { topic: "Geometry", attempted: 18, score: 85, date: "2024-01-18" }
      ]);
    }
  };
  
  const fetchBookmarks = async () => {
    try {
      const response = await getBookmarks();
      const bookmarksData = response?.data?.bookmarks || response?.bookmarks || [];
      // Transform the data to match frontend expectations
      const transformedBookmarks = bookmarksData.map(bookmark => ({
        id: bookmark.id,
        question: bookmark.questionText || bookmark.question,
        subject: bookmark.subject
      }));
      setBookmarks(transformedBookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      // Fallback to mock data for development
      setBookmarks([
        { id: 1, question: "Solve for x: 2x + 5 = 15", subject: "Math" },
        { id: 2, question: "What is the main idea of the passage?", subject: "Reading" }
      ]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || 'Student'}!</h1>
        <p className="text-blue-100 mb-4">"Success is the sum of small efforts repeated day in and day out."</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => navigate('/dashboard/practice/create')}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Create Practice Test
          </button>
          <button
            onClick={() => navigate('/dashboard/study-plan')}
            className="border border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            View Study Plan
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Questions Attempted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAttempted}</p>
            </div>
            <FiTarget className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{stats.accuracy}%</p>
            </div>
            <FiTrendingUp className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Correct Answers</p>
              <p className="text-2xl font-bold text-blue-600">{stats.correctAnswers}</p>
            </div>
            <FiBook className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Study Hours</p>
              <p className="text-2xl font-bold text-purple-600">{stats.studyHours}h</p>
            </div>
            <FiClock className="text-purple-600" size={24} />
          </div>
        </div>
      </div>

      {/* SAT Quick Start */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-100">
        <div className="flex items-center mb-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg mr-3">
            <FiTarget size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">SAT Preparation</h2>
            <p className="text-sm text-gray-600">Start your SAT journey with our adaptive testing system</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/dashboard/practice/create')}
            className="flex items-center justify-center p-4 bg-white hover:bg-blue-50 rounded-lg transition-colors group border border-blue-200"
          >
            <FaCalculator className="text-blue-600 mr-3 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-left">
              <div className="text-blue-700 font-medium">Math Practice</div>
              <div className="text-xs text-gray-600">Create custom practice</div>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/practice/create')}
            className="flex items-center justify-center p-4 bg-white hover:bg-green-50 rounded-lg transition-colors group border border-green-200"
          >
            <FiEdit className="text-green-600 mr-3 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-left">
              <div className="text-green-700 font-medium">Reading & Writing Practice</div>
              <div className="text-xs text-gray-600">Create custom practice</div>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SAT Progress Overview */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">SAT Progress Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Math Progress */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Math Section</h3>
                <span className="text-sm text-gray-600">Last Score: 650</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>400</span>
                <span>Current: 650</span>
                <span>800</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: 700 • 50 points to go
              </div>
            </div>
            
            {/* Reading & Writing Progress */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Reading & Writing</h3>
                <span className="text-sm text-gray-600">Last Score: 620</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>400</span>
                <span>Current: 620</span>
                <span>800</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: 680 • 60 points to go
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-900">Total SAT Score</div>
                <div className="text-2xl font-bold text-blue-600">1270</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700">Target: 1380</div>
                <div className="text-xs text-blue-600">110 points to go</div>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mt-6 mb-4">Recent Practice</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{activity.topic}</h3>
                  <p className="text-sm text-gray-600">{activity.attempted} questions • {activity.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">{activity.score}%</p>
                  <button className="text-blue-600 text-sm hover:underline">Resume Practice</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookmarks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Bookmarks</h2>
            <FiBookmark className="text-gray-400" size={20} />
          </div>
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900 mb-1">{bookmark.question}</p>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{bookmark.subject}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Practice by Subject */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Practice by Subject</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/dashboard/practice/create')}
              className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors"
            >
              <FaCalculator className="text-blue-600 mx-auto mb-2" size={24} />
              <p className="font-medium">Math</p>
              <p className="text-sm text-gray-600">Custom Practice</p>
            </button>
            <button 
              onClick={() => navigate('/dashboard/practice/create')}
              className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors"
            >
              <FiBook className="text-green-600 mx-auto mb-2" size={24} />
              <p className="font-medium">Reading & Writing</p>
              <p className="text-sm text-gray-600">Custom Practice</p>
            </button>
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
          {enrolledCourses.length > 0 ? (
            <div className="space-y-3">
              {enrolledCourses.slice(0, 3).map((course, index) => {
                const courseData = courses.find(c => c.id === course.courseId);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{courseData?.title || 'Course'}</h3>
                      <p className="text-sm text-gray-600">Progress: 65%</p>
                    </div>
                    <button 
                      onClick={() => navigate('/dashboard/courses')}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Continue
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600">No courses enrolled yet</p>
          )}
        </div>
        
        {/* Enrolled Question Banks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Question Banks</h2>
            <button 
              onClick={() => navigate('/dashboard/question-banks')}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
            >
              View All <FiExternalLink size={14} />
            </button>
          </div>
          
          {enrolledQuestionBanks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't enrolled in any question banks yet</p>
              <button 
                onClick={() => navigate('/dashboard/question-banks')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Browse Question Banks
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledQuestionBanks.slice(0, 3).map(questionBank => (
                <QuestionBankCard key={questionBank.questionBankId || questionBank.id} questionBank={questionBank} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Classes & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiVideo className="text-red-600" size={20} />
              <h2 className="text-xl font-semibold">Live Classes</h2>
              {isConnected && (
                <div className="flex items-center space-x-1 text-green-600 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/dashboard/live-classes')}
              className="text-blue-600 text-sm hover:underline"
            >
              View All
            </button>
          </div>
          
          {liveClasses.length > 0 ? (
            <div className="space-y-4">
              {liveClasses.slice(0, 2).map((liveClass) => {
                const startTime = new Date(liveClass.startTime);
                const isLive = liveClass.status === 'Live';
                const isUpcoming = liveClass.status === 'Upcoming';
                
                return (
                  <div key={liveClass.id} className={`p-4 rounded-lg border-2 ${
                    isLive ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{liveClass.title}</h3>
                        <p className="text-sm text-gray-600">by {liveClass.instructor}</p>
                      </div>
                      {isLive && (
                        <div className="flex items-center space-x-1 text-red-600 text-sm font-medium">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span>LIVE</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <FiClock className="w-4 h-4" />
                          <span>
                            {startTime.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FiUsers className="w-4 h-4" />
                          <span>{liveClass.attendeeCount}/{liveClass.maxAttendees}</span>
                        </div>
                      </div>
                      <span>{liveClass.duration} min</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      {isLive && (
                        <button
                          onClick={() => navigate(`/dashboard/live-class/${liveClass.id}`)}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <FiPlay className="w-4 h-4" />
                          <span>Join Live Class</span>
                        </button>
                      )}
                      
                      {liveClass.zoomJoinUrl && (
                        <button
                          onClick={() => window.open(liveClass.zoomJoinUrl, '_blank')}
                          className={`${isLive ? 'flex-none' : 'flex-1'} bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2`}
                        >
                          <FiExternalLink className="w-4 h-4" />
                          <span>Zoom</span>
                        </button>
                      )}
                      
                      {isUpcoming && (
                        <button
                          disabled
                          className="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          <FiClock className="w-4 h-4" />
                          <span>Upcoming</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiVideo className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No live classes scheduled</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiMessageSquare className="text-green-600" size={20} />
            <h2 className="text-xl font-semibold">Support</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              Ask a Question
            </button>
            <button className="w-full p-3 text-left bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
