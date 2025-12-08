import { useState, useEffect } from "react";
import { FiTrendingUp, FiTarget, FiClock, FiAward, FiBarChart, FiCalendar } from "react-icons/fi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const StudentAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Mock analytics data
      const mockData = {
        overview: {
          totalStudyTime: 45.5, // hours
          questionsAttempted: 1247,
          averageAccuracy: 78.5,
          currentStreak: 12,
          improvementRate: 15.3
        },
        scoreProgress: [
          { date: '2024-01-01', math: 520, reading: 510, total: 1030 },
          { date: '2024-01-08', math: 535, reading: 525, total: 1060 },
          { date: '2024-01-15', math: 550, reading: 540, total: 1090 },
          { date: '2024-01-22', math: 565, reading: 555, total: 1120 },
          { date: '2024-01-29', math: 580, reading: 570, total: 1150 }
        ],
        subjectPerformance: [
          { subject: 'Algebra', accuracy: 85, attempted: 156, timeSpent: 8.2 },
          { subject: 'Geometry', accuracy: 72, attempted: 134, timeSpent: 7.8 },
          { subject: 'Data Analysis', accuracy: 81, attempted: 98, timeSpent: 5.4 },
          { subject: 'Reading Comp', accuracy: 76, attempted: 187, timeSpent: 12.1 },
          { subject: 'Grammar', accuracy: 88, attempted: 145, timeSpent: 6.8 },
          { subject: 'Vocabulary', accuracy: 79, attempted: 123, timeSpent: 5.2 }
        ],
        weeklyActivity: [
          { day: 'Mon', studyTime: 2.5, questionsAnswered: 45 },
          { day: 'Tue', studyTime: 1.8, questionsAnswered: 32 },
          { day: 'Wed', studyTime: 3.2, questionsAnswered: 58 },
          { day: 'Thu', studyTime: 2.1, questionsAnswered: 38 },
          { day: 'Fri', studyTime: 2.8, questionsAnswered: 51 },
          { day: 'Sat', studyTime: 4.1, questionsAnswered: 72 },
          { day: 'Sun', studyTime: 3.5, questionsAnswered: 63 }
        ],
        difficultyBreakdown: [
          { name: 'Easy', value: 45, color: '#10B981' },
          { name: 'Medium', value: 35, color: '#F59E0B' },
          { name: 'Hard', value: 20, color: '#EF4444' }
        ],
        recentAchievements: [
          { title: '7-Day Streak', description: 'Studied for 7 consecutive days', date: '2024-01-20', icon: '🔥' },
          { title: 'Math Master', description: 'Achieved 90%+ accuracy in Algebra', date: '2024-01-18', icon: '🎯' },
          { title: 'Speed Demon', description: 'Completed 100 questions in one session', date: '2024-01-15', icon: '⚡' }
        ]
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">No analytics data available yet. Start practicing to see your progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Analytics</h1>
            <p className="text-gray-600">Track your progress and identify areas for improvement</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Study Time</p>
                <p className="text-2xl font-bold text-blue-600">{analyticsData.overview.totalStudyTime}h</p>
              </div>
              <FiClock className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Questions</p>
                <p className="text-2xl font-bold text-green-600">{analyticsData.overview.questionsAttempted}</p>
              </div>
              <FiTarget className="text-green-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-purple-600">{analyticsData.overview.averageAccuracy}%</p>
              </div>
              <FiBarChart className="text-purple-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-orange-600">{analyticsData.overview.currentStreak}</p>
              </div>
              <FiAward className="text-orange-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Improvement</p>
                <p className="text-2xl font-bold text-red-600">+{analyticsData.overview.improvementRate}%</p>
              </div>
              <FiTrendingUp className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Score Progress Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Score Progress Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.scoreProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[400, 800]} />
                <Tooltip />
                <Line type="monotone" dataKey="math" stroke="#3B82F6" strokeWidth={2} name="Math" />
                <Line type="monotone" dataKey="reading" stroke="#10B981" strokeWidth={2} name="Reading & Writing" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Study Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="studyTime" fill="#8B5CF6" name="Study Time (hours)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Performance & Difficulty Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Subject Performance */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Subject Performance</h3>
            <div className="space-y-4">
              {analyticsData.subjectPerformance.map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{subject.subject}</span>
                      <span className="text-sm text-gray-600">{subject.accuracy}% accuracy</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${subject.accuracy}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{subject.attempted} questions</span>
                      <span>{subject.timeSpent}h spent</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Question Difficulty</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analyticsData.difficultyBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {analyticsData.difficultyBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {analyticsData.difficultyBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.recentAchievements.map((achievement, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <FiCalendar size={12} />
                      <span>{new Date(achievement.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;