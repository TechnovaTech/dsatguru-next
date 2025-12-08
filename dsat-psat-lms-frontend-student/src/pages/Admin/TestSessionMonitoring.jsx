import { useState, useEffect } from "react";
import { FiDownload, FiFilter, FiSearch } from "react-icons/fi";
import axios from "axios";

const TestSessionMonitoring = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "",
    userName: "",
    moduleRoute: "" // "Low", "Medium", "High"
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/test-sessions`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: localStorage.getItem("authToken") ? `Bearer ${localStorage.getItem("authToken")}` : '',
          "ngrok-skip-browser-warning": "69420",
        },
        params: {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          userId: filters.userId || undefined,
          userName: filters.userName || undefined,
          moduleRoute: filters.moduleRoute || undefined
        }
      });
      
      console.log('Sessions API response:', response.data);
      
      if (response.data && response.data.data) {
        setSessions(response.data.data);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error("Failed to fetch test sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSessions();
  };

  const downloadCSV = () => {
    // Create CSV content
    const headers = ["Session ID", "User ID", "User Name", "Start Time", "End Time", "Status", "Module Route", "% Correct", "Score"];
    const csvContent = [
      headers.join(","),
      ...sessions.map(session => [
        session.id,
        session.userId,
        session.userName,
        session.startTime,
        session.endTime,
        session.status,
        session.moduleRoute,
        session.percentCorrect,
        session.score
      ].join(","))
    ].join("\\n");
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "test-sessions.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    // In a real implementation, you would generate a PDF here
    alert("PDF download functionality would be implemented here");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Test Session Monitoring</h1>
        <div className="flex gap-2">
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <FiDownload /> CSV
          </button>
          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FiDownload /> PDF
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              value={filters.startDate} 
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input 
              type="date" 
              name="endDate" 
              value={filters.endDate} 
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input 
              type="text" 
              name="userId" 
              value={filters.userId} 
              onChange={handleFilterChange}
              placeholder="Enter user ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
            <input 
              type="text" 
              name="userName" 
              value={filters.userName} 
              onChange={handleFilterChange}
              placeholder="Enter user name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Route</label>
            <select 
              name="moduleRoute" 
              value={filters.moduleRoute} 
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Routes</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          
          <div className="lg:col-span-5 flex justify-end">
            <button 
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <FiFilter /> Apply Filters
            </button>
          </div>
        </form>
      </div>
      
      {/* Sessions Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Test Sessions</h2>
        
        {loading ? (
          <div className="text-center py-4">Loading sessions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Correct</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{session.userName}</div>
                        <div className="text-sm text-gray-500">ID: {session.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.endTime ? new Date(session.endTime).toLocaleString() : 'Active'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          session.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.moduleRoute}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.percentCorrect}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.score}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <a href={`/admin-dashboard/test-sessions/${session.id}`} className="text-indigo-600 hover:text-indigo-900">
                          View Details
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">
                      No test sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSessionMonitoring;