import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiDownload, FiFilter, FiSearch, FiCalendar, FiClock, FiUsers, FiTarget } from "react-icons/fi";

const TestManagement = () => {
  const [tests, setTests] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    fetchTestData();
  }, []);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      // Mock test data
      const mockTests = [
        {
          id: 1,
          title: "SAT Diagnostic Test - Math Focus",
          description: "Comprehensive math diagnostic covering algebra, geometry, and data analysis",
          type: "diagnostic",
          duration: 90,
          totalQuestions: 44,
          sections: [
            { name: "Algebra", questions: 15, timeLimit: 30 },
            { name: "Geometry", questions: 15, timeLimit: 30 },
            { name: "Data Analysis", questions: 14, timeLimit: 30 }
          ],
          status: "active",
          createdDate: "2024-01-15",
          attempts: 156,
          averageScore: 78.5
        },
        {
          id: 2,
          title: "SAT Diagnostic Test - Reading & Writing",
          description: "Reading comprehension and writing skills assessment",
          type: "diagnostic",
          duration: 64,
          totalQuestions: 44,
          sections: [
            { name: "Reading Comprehension", questions: 27, timeLimit: 32 },
            { name: "Writing & Language", questions: 17, timeLimit: 32 }
          ],
          status: "active",
          createdDate: "2024-01-15",
          attempts: 142,
          averageScore: 72.3
        },
        {
          id: 3,
          title: "PSAT Practice Test",
          description: "Full-length PSAT practice test",
          type: "practice",
          duration: 134,
          totalQuestions: 98,
          sections: [
            { name: "Reading", questions: 25, timeLimit: 32 },
            { name: "Writing & Language", questions: 25, timeLimit: 32 },
            { name: "Math (No Calculator)", questions: 17, timeLimit: 25 },
            { name: "Math (Calculator)", questions: 31, timeLimit: 45 }
          ],
          status: "draft",
          createdDate: "2024-01-20",
          attempts: 0,
          averageScore: 0
        }
      ];

      const mockResults = [
        {
          id: 1,
          studentName: "John Smith",
          studentEmail: "john.smith@email.com",
          testTitle: "SAT Diagnostic Test - Math Focus",
          completedDate: "2024-01-25",
          duration: 87,
          totalScore: 650,
          maxScore: 800,
          percentage: 81.25,
          sectionScores: [
            { section: "Algebra", score: 220, maxScore: 267, percentage: 82.4 },
            { section: "Geometry", score: 200, maxScore: 267, percentage: 74.9 },
            { section: "Data Analysis", score: 230, maxScore: 266, percentage: 86.5 }
          ],
          strengths: ["Linear equations", "Data interpretation"],
          weaknesses: ["Geometric proofs", "Trigonometry"]
        },
        {
          id: 2,
          studentName: "Sarah Johnson",
          studentEmail: "sarah.johnson@email.com",
          testTitle: "SAT Diagnostic Test - Reading & Writing",
          completedDate: "2024-01-24",
          duration: 62,
          totalScore: 580,
          maxScore: 800,
          percentage: 72.5,
          sectionScores: [
            { section: "Reading Comprehension", score: 320, maxScore: 432, percentage: 74.1 },
            { section: "Writing & Language", score: 260, maxScore: 368, percentage: 70.7 }
          ],
          strengths: ["Vocabulary", "Main idea identification"],
          weaknesses: ["Grammar rules", "Sentence structure"]
        }
      ];

      setTests(mockTests);
      setTestResults(mockResults);
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = () => {
    setShowCreateModal(true);
  };

  const handleViewResults = (test) => {
    setSelectedTest(test);
    setShowResultsModal(true);
  };

  const handleDeleteTest = (testId) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      setTests(tests.filter(test => test.id !== testId));
    }
  };

  const handleToggleStatus = (testId) => {
    setTests(tests.map(test => 
      test.id === testId 
        ? { ...test, status: test.status === 'active' ? 'inactive' : 'active' }
        : test
    ));
  };

  const exportResults = () => {
    // Mock CSV export
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Student Name,Email,Test,Date,Score,Percentage\n" +
      testResults.map(result => 
        `${result.studentName},${result.studentEmail},${result.testTitle},${result.completedDate},${result.totalScore}/${result.maxScore},${result.percentage}%`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "test_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTests = tests.filter(test => {
    const matchesStatus = filters.status === 'all' || test.status === filters.status;
    const matchesSearch = test.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredResults = testResults.filter(result => {
    const matchesSearch = result.studentName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         result.testTitle.toLowerCase().includes(filters.searchTerm.toLowerCase());
    return matchesSearch;
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Management</h1>
            <p className="text-gray-600">Create and manage diagnostic tests and view student results</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload size={16} />
              Export Results
            </button>
            <button
              onClick={handleCreateTest}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus size={16} />
              Create Test
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tests ({tests.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'results'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Results ({testResults.length})
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search tests or students..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {activeTab === 'tests' && (
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'tests' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <div key={test.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{test.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <FiClock size={12} />
                        <span>{test.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiTarget size={12} />
                        <span>{test.totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiUsers size={12} />
                        <span>{test.attempts} attempts</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    test.status === 'active' ? 'bg-green-100 text-green-800' :
                    test.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {test.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {test.sections.map((section, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{section.name}</span>
                      <span className="text-gray-500">{section.questions} questions</span>
                    </div>
                  ))}
                </div>

                {test.attempts > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Average Score</div>
                    <div className="text-lg font-semibold text-blue-600">{test.averageScore}%</div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewResults(test)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <FiEye size={14} />
                    View Results
                  </button>
                  <button
                    onClick={() => handleToggleStatus(test.id)}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      test.status === 'active'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {test.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{result.studentName}</div>
                          <div className="text-sm text-gray-500">{result.studentEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.testTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.completedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.totalScore}/{result.maxScore}
                        </div>
                        <div className={`text-sm ${
                          result.percentage >= 80 ? 'text-green-600' :
                          result.percentage >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {result.percentage}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.duration} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Test Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Create New Test</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter test title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter test description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="diagnostic">Diagnostic</option>
                      <option value="practice">Practice</option>
                      <option value="mock">Mock Test</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    // Handle test creation
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestManagement;