import { useState, useEffect } from "react";
import { FiUser, FiTrendingUp, FiClock, FiTarget, FiBook, FiAward, FiCalendar, FiFilter, FiSearch, FiDownload, FiEye } from "react-icons/fi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const StudentProgress = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: '',
    course: 'all',
    status: 'all',
    sortBy: 'name'
  });

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      // Mock student progress data
      const mockStudents = [
        {
          id: 1,
          name: "John Smith",
          email: "john.smith@email.com",
          avatar: null,
          enrolledCourses: ["SAT Prep", "Math Bootcamp"],
          currentLevel: "Intermediate",
          overallProgress: 68,
          studyStreak: 12,
          totalStudyTime: 45.5,
          lastActive: "2024-01-25",
          status: "active",
          scores: {
            math: 580,
            reading: 560,
            total: 1140
          },
          progressHistory: [
            { date: '2024-01-01', math: 520, reading: 510, total: 1030 },
            { date: '2024-01-08', math: 535, reading: 525, total: 1060 },
            { date: '2024-01-15', math: 550, reading: 540, total: 1090 },
            { date: '2024-01-22', math: 565, reading: 555, total: 1120 },
            { date: '2024-01-25', math: 580, reading: 560, total: 1140 }
          ],
          subjectPerformance: [
            { subject: 'Algebra', accuracy: 85, timeSpent: 8.2, improvement: 15 },
            { subject: 'Geometry', accuracy: 72, timeSpent: 7.8, improvement: 8 },
            { subject: 'Data Analysis', accuracy: 81, timeSpent: 5.4, improvement: 12 },
            { subject: 'Reading Comp', accuracy: 76, timeSpent: 12.1, improvement: 10 },
            { subject: 'Grammar', accuracy: 88, timeSpent: 6.8, improvement: 18 },
            { subject: 'Vocabulary', accuracy: 79, timeSpent: 5.2, improvement: 7 }
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
          strengths: ["Linear equations", "Data interpretation", "Grammar rules"],
          weaknesses: ["Geometric proofs", "Trigonometry", "Reading speed"],
          achievements: [
            { title: "7-Day Streak", date: "2024-01-20", icon: "🔥" },
            { title: "Math Master", date: "2024-01-18", icon: "🎯" },
            { title: "Speed Demon", date: "2024-01-15", icon: "⚡" }
          ]
        },
        {
          id: 2,
          name: "Sarah Johnson",
          email: "sarah.johnson@email.com",
          avatar: null,
          enrolledCourses: ["SAT Prep"],
          currentLevel: "Advanced",
          overallProgress: 82,
          studyStreak: 8,
          totalStudyTime: 62.3,
          lastActive: "2024-01-24",
          status: "active",
          scores: {
            math: 620,
            reading: 640,
            total: 1260
          },
          progressHistory: [
            { date: '2024-01-01', math: 580, reading: 590, total: 1170 },
            { date: '2024-01-08', math: 590, reading: 600, total: 1190 },
            { date: '2024-01-15', math: 600, reading: 615, total: 1215 },
            { date: '2024-01-22', math: 610, reading: 630, total: 1240 },
            { date: '2024-01-24', math: 620, reading: 640, total: 1260 }
          ],
          subjectPerformance: [
            { subject: 'Algebra', accuracy: 92, timeSpent: 6.5, improvement: 8 },
            { subject: 'Geometry', accuracy: 88, timeSpent: 8.2, improvement: 12 },
            { subject: 'Data Analysis', accuracy: 95, timeSpent: 7.1, improvement: 5 },
            { subject: 'Reading Comp', accuracy: 89, timeSpent: 15.3, improvement: 14 },
            { subject: 'Grammar', accuracy: 94, timeSpent: 8.9, improvement: 9 },
            { subject: 'Vocabulary', accuracy: 87, timeSpent: 6.8, improvement: 11 }
          ],
          weeklyActivity: [
            { day: 'Mon', studyTime: 3.2, questionsAnswered: 58 },
            { day: 'Tue', studyTime: 2.8, questionsAnswered: 51 },
            { day: 'Wed', studyTime: 4.1, questionsAnswered: 72 },
            { day: 'Thu', studyTime: 3.5, questionsAnswered: 63 },
            { day: 'Fri', studyTime: 2.9, questionsAnswered: 52 },
            { day: 'Sat', studyTime: 4.8, questionsAnswered: 85 },
            { day: 'Sun', studyTime: 3.7, questionsAnswered: 67 }
          ],
          strengths: ["Advanced algebra", "Critical reading", "Essay writing"],
          weaknesses: ["Time management", "Complex geometry"],
          achievements: [
            { title: "Perfect Score", date: "2024-01-22", icon: "🏆" },
            { title: "Reading Master", date: "2024-01-19", icon: "📚" },
            { title: "Consistency King", date: "2024-01-16", icon: "👑" }
          ]
        },
        {
          id: 3,
          name: "Mike Chen",
          email: "mike.chen@email.com",
          avatar: null,
          enrolledCourses: ["PSAT Prep"],
          currentLevel: "Beginner",
          overallProgress: 34,
          studyStreak: 3,
          totalStudyTime: 18.7,
          lastActive: "2024-01-23",
          status: "inactive",
          scores: {
            math: 480,
            reading: 460,
            total: 940
          },
          progressHistory: [
            { date: '2024-01-01', math: 420, reading: 410, total: 830 },
            { date: '2024-01-08', math: 440, reading: 430, total: 870 },
            { date: '2024-01-15', math: 460, reading: 445, total: 905 },
            { date: '2024-01-22', math: 475, reading: 455, total: 930 },
            { date: '2024-01-23', math: 480, reading: 460, total: 940 }
          ],
          subjectPerformance: [
            { subject: 'Algebra', accuracy: 65, timeSpent: 4.2, improvement: 18 },
            { subject: 'Geometry', accuracy: 58, timeSpent: 3.8, improvement: 12 },
            { subject: 'Data Analysis', accuracy: 71, timeSpent: 2.9, improvement: 22 },
            { subject: 'Reading Comp', accuracy: 62, timeSpent: 6.1, improvement: 15 },
            { subject: 'Grammar', accuracy: 69, timeSpent: 3.2, improvement: 19 },
            { subject: 'Vocabulary', accuracy: 64, timeSpent: 2.8, improvement: 16 }
          ],
          weeklyActivity: [
            { day: 'Mon', studyTime: 1.2, questionsAnswered: 22 },
            { day: 'Tue', studyTime: 0.8, questionsAnswered: 15 },
            { day: 'Wed', studyTime: 1.5, questionsAnswered: 28 },
            { day: 'Thu', studyTime: 0, questionsAnswered: 0 },
            { day: 'Fri', studyTime: 1.1, questionsAnswered: 20 },
            { day: 'Sat', studyTime: 2.2, questionsAnswered: 38 },
            { day: 'Sun', studyTime: 1.8, questionsAnswered: 32 }
          ],
          strengths: ["Basic arithmetic", "Vocabulary building"],
          weaknesses: ["Complex problems", "Reading comprehension", "Time pressure"],
          achievements: [
            { title: "First Steps", date: "2024-01-10", icon: "👶" },
            { title: "Improvement", date: "2024-01-17", icon: "📈" }
          ]
        }
      ];

      setStudents(mockStudents);
      setSelectedStudent(mockStudents[0]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportStudentData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Email,Level,Progress,Study Time,Last Active,Math Score,Reading Score,Total Score\n" +
      students.map(student => 
        `${student.name},${student.email},${student.currentLevel},${student.overallProgress}%,${student.totalStudyTime}h,${student.lastActive},${student.scores.math},${student.scores.reading},${student.scores.total}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_progress.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(filters.searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' || student.status === filters.status;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'progress':
        return b.overallProgress - a.overallProgress;
      case 'score':
        return b.scores.total - a.scores.total;
      case 'activity':
        return new Date(b.lastActive) - new Date(a.lastActive);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Progress Tracking</h1>
            <p className="text-gray-600">Monitor individual student performance and learning paths</p>
          </div>
          <button
            onClick={exportStudentData}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiDownload size={16} />
            Export Data
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md">
              {/* Filters */}
              <div className="p-4 border-b border-gray-200">
                <div className="space-y-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="name">Name</option>
                      <option value="progress">Progress</option>
                      <option value="score">Score</option>
                      <option value="activity">Last Active</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                            <p className="text-xs text-gray-500 truncate">{student.email}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {student.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{student.overallProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ width: `${student.overallProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Overview */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-semibold">
                      {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                      <p className="text-gray-600">{selectedStudent.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Level: {selectedStudent.currentLevel}</span>
                        <span>•</span>
                        <span>Last active: {new Date(selectedStudent.lastActive).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <FiTarget className="mx-auto mb-2 text-blue-600" size={24} />
                      <div className="text-2xl font-bold text-blue-600">{selectedStudent.overallProgress}%</div>
                      <div className="text-sm text-gray-600">Progress</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <FiAward className="mx-auto mb-2 text-green-600" size={24} />
                      <div className="text-2xl font-bold text-green-600">{selectedStudent.studyStreak}</div>
                      <div className="text-sm text-gray-600">Day Streak</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <FiClock className="mx-auto mb-2 text-purple-600" size={24} />
                      <div className="text-2xl font-bold text-purple-600">{selectedStudent.totalStudyTime}h</div>
                      <div className="text-sm text-gray-600">Study Time</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <FiTrendingUp className="mx-auto mb-2 text-orange-600" size={24} />
                      <div className="text-2xl font-bold text-orange-600">{selectedStudent.scores.total}</div>
                      <div className="text-sm text-gray-600">Total Score</div>
                    </div>
                  </div>
                </div>

                {/* Progress Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Score Progress Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={selectedStudent.progressHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[400, 800]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="math" stroke="#3B82F6" strokeWidth={2} name="Math" />
                      <Line type="monotone" dataKey="reading" stroke="#10B981" strokeWidth={2} name="Reading & Writing" />
                      <Line type="monotone" dataKey="total" stroke="#8B5CF6" strokeWidth={2} name="Total" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Subject Performance & Weekly Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subject Performance */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Subject Performance</h3>
                    <div className="space-y-3">
                      {selectedStudent.subjectPerformance.map((subject, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{subject.subject}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{subject.accuracy}%</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                subject.improvement > 10 ? 'bg-green-100 text-green-800' :
                                subject.improvement > 5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                +{subject.improvement}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${subject.accuracy}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {subject.timeSpent}h spent
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly Activity */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Weekly Study Activity</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={selectedStudent.weeklyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="studyTime" fill="#8B5CF6" name="Study Time (hours)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Strengths, Weaknesses & Achievements */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Strengths */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Strengths</h3>
                    <div className="space-y-2">
                      {selectedStudent.strengths.map((strength, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-700">Areas for Improvement</h3>
                    <div className="space-y-2">
                      {selectedStudent.weaknesses.map((weakness, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">{weakness}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Achievements */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
                    <div className="space-y-3">
                      {selectedStudent.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-xl">{achievement.icon}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{achievement.title}</div>
                            <div className="text-xs text-gray-500">{new Date(achievement.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FiUser className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600">Select a student to view their progress details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;