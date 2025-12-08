import { useState, useEffect } from "react";
import { FiSearch, FiAlertTriangle } from "react-icons/fi";
import axios from "axios";

const UserResultManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/user-results`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: localStorage.getItem("authToken") ? `Bearer ${localStorage.getItem("authToken")}` : '',
          "ngrok-skip-browser-warning": "69420",
        },
        params: {
          search: searchQuery
        }
      });
      
      console.log('User results API response:', response.data);
      
      if (response.data && response.data.data) {
        setUserResults(response.data.data);
      } else {
        setUserResults(null);
      }
    } catch (error) {
      console.error("Failed to fetch user results:", error);
      setUserResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Result Management</h1>
      </div>
      
      {/* Search Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by User ID, Email, or Name</label>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter user ID, email, or name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              <FiSearch /> {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>
      
      {/* User Results */}
      {userResults && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="font-medium">{userResults.userId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{userResults.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{userResults.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Date</p>
                <p className="font-medium">{new Date(userResults.registrationDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            
            {/* Base Module Performance */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Base Module Performance</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Math Score</p>
                    <p className="font-medium">{userResults.baseModule?.mathScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reading & Writing Score</p>
                    <p className="font-medium">{userResults.baseModule?.rwScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Score</p>
                    <p className="font-medium">{userResults.baseModule?.totalScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion Date</p>
                    <p className="font-medium">
                      {userResults.baseModule?.completionDate 
                        ? new Date(userResults.baseModule.completionDate).toLocaleDateString() 
                        : 'Not completed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Questions Attempted</p>
                    <p className="font-medium">{userResults.baseModule?.questionsAttempted || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Correct Answers</p>
                    <p className="font-medium">{userResults.baseModule?.correctAnswers || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Route Taken */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Route Taken</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Difficulty Module</p>
                    <p className="font-medium">{userResults.routeTaken?.difficultyModule || 'Not determined'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Determination Date</p>
                    <p className="font-medium">
                      {userResults.routeTaken?.determinationDate 
                        ? new Date(userResults.routeTaken.determinationDate).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Adaptive Scores */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Adaptive Module Scores</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Math Score</p>
                    <p className="font-medium">{userResults.adaptiveModule?.mathScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reading & Writing Score</p>
                    <p className="font-medium">{userResults.adaptiveModule?.rwScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Score</p>
                    <p className="font-medium">{userResults.adaptiveModule?.totalScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion Date</p>
                    <p className="font-medium">
                      {userResults.adaptiveModule?.completionDate 
                        ? new Date(userResults.adaptiveModule.completionDate).toLocaleDateString() 
                        : 'Not completed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Questions Attempted</p>
                    <p className="font-medium">{userResults.adaptiveModule?.questionsAttempted || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Correct Answers</p>
                    <p className="font-medium">{userResults.adaptiveModule?.correctAnswers || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Final SAT Score */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Final SAT Score</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Math Score</p>
                    <p className="font-medium text-xl">{userResults.finalScore?.mathScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reading & Writing Score</p>
                    <p className="font-medium text-xl">{userResults.finalScore?.rwScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Score</p>
                    <p className="font-medium text-xl text-blue-600">{userResults.finalScore?.totalScore || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Calculation Date</p>
                    <p className="font-medium">
                      {userResults.finalScore?.calculationDate 
                        ? new Date(userResults.finalScore.calculationDate).toLocaleDateString() 
                        : 'Not calculated'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* IRT Calculation */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">IRT Calculation Breakdown</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Math Ability (θ)</p>
                    <p className="font-medium">{userResults.irtCalculation?.mathAbility?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reading & Writing Ability (θ)</p>
                    <p className="font-medium">{userResults.irtCalculation?.rwAbility?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Math Standard Error</p>
                    <p className="font-medium">{userResults.irtCalculation?.mathStandardError?.toFixed(3) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reading & Writing Standard Error</p>
                    <p className="font-medium">{userResults.irtCalculation?.rwStandardError?.toFixed(3) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Critical Warnings */}
            {userResults.criticalWarnings && userResults.criticalWarnings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium mb-2 flex items-center gap-2 text-red-600">
                  <FiAlertTriangle /> Critical Warnings
                </h3>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <ul className="list-disc pl-5 space-y-2">
                    {userResults.criticalWarnings.map((warning, index) => (
                      <li key={index} className="text-red-700">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* No Results Message */}
      {searchQuery && !loading && !userResults && (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">No results found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default UserResultManagement;