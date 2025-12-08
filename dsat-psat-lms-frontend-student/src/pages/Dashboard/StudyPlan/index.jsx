import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlay, FiCheck, FiLock, FiArrowRight, FiTarget, FiTrendingUp } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import { getUserStudyPlan, startModule, completeModule } from "../../../services/api/studyPlan";

const StudyPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudyPlan();
  }, []);

  const fetchStudyPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserStudyPlan();
      setStudyPlan(response);
    } catch (error) {
      console.error("Error fetching study plan:", error);
      setError("Failed to load study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = async (moduleId) => {
    try {
      await startModule(moduleId);
      // Refresh study plan to update status
      await fetchStudyPlan();
      // Navigate to module instructions or practice
      navigate(`/dashboard/question-banks/${moduleId}/module/${moduleId}/instructions`);
    } catch (error) {
      console.error("Error starting module:", error);
      setError("Failed to start module. Please try again.");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <FiCheck className="w-5 h-5 text-green-500" />;
      case 'Unlocked':
      case 'InProgress':
        return <FiPlay className="w-5 h-5 text-blue-500" />;
      case 'Locked':
      default:
        return <FiLock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 border-green-200';
      case 'Unlocked':
      case 'InProgress':
        return 'bg-blue-50 border-blue-200';
      case 'Locked':
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getButtonText = (status) => {
    switch (status) {
      case 'Completed':
        return 'Review';
      case 'InProgress':
        return 'Resume';
      case 'Unlocked':
        return 'Start';
      case 'Locked':
      default:
        return 'Locked';
    }
  };

  const isButtonDisabled = (status) => {
    return status === 'Locked';
  };

  const getDifficultyColor = (type) => {
    switch (type) {
      case 'Base':
        return 'bg-gray-100 text-gray-800';
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchStudyPlan}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Study Plan</h1>
          <p className="text-gray-600">
            Follow your personalized learning path. Complete modules to unlock the next level.
          </p>
        </div>

        {/* Progress Overview */}
        {studyPlan && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Progress Overview</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FiTarget className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    {studyPlan.modules?.filter(m => m.status === 'Completed').length || 0} of {studyPlan.modules?.length || 0} completed
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiTrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {studyPlan.modules?.length > 0 
                      ? Math.round(((studyPlan.modules?.filter(m => m.status === 'Completed').length || 0) / studyPlan.modules.length) * 100)
                      : 0}% Complete
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${studyPlan.modules?.length > 0 
                    ? ((studyPlan.modules?.filter(m => m.status === 'Completed').length || 0) / studyPlan.modules.length) * 100
                    : 0}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Study Plan Modules */}
        {studyPlan?.modules && studyPlan.modules.length > 0 ? (
          <div className="space-y-6">
            {studyPlan.modules.map((module, index) => (
              <div key={module.id} className="relative">
                {/* Connection Line */}
                {index < studyPlan.modules.length - 1 && (
                  <div className="absolute left-6 top-20 w-0.5 h-16 bg-gray-300 z-0"></div>
                )}
                
                {/* Module Card */}
                <div className={`relative z-10 bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
                  getStatusColor(module.status)
                }`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-current flex items-center justify-center">
                          {getStatusIcon(module.status)}
                        </div>
                        
                        {/* Module Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{module.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getDifficultyColor(module.type)
                            }`}>
                              {module.type}
                            </span>
                          </div>
                          
                          {module.description && (
                            <p className="text-gray-600 mb-3">{module.description}</p>
                          )}
                          
                          {/* Progress Info */}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {module.progressPercentage !== undefined && (
                              <span>Progress: {module.progressPercentage}%</span>
                            )}
                            {module.score !== undefined && module.score !== null && (
                              <span>Score: {module.score}%</span>
                            )}
                            {module.completedAt && (
                              <span>Completed: {new Date(module.completedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => !isButtonDisabled(module.status) && handleStartModule(module.id)}
                          disabled={isButtonDisabled(module.status)}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                            isButtonDisabled(module.status)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : module.status === 'Completed'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <span>{getButtonText(module.status)}</span>
                          {!isButtonDisabled(module.status) && <FiArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiTarget className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Study Plan Available</h3>
            <p className="text-gray-600 mb-6">
              Your personalized study plan will appear here once modules are created by your instructor.
            </p>
            <button
              onClick={fetchStudyPlan}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlan;