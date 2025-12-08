import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { FiGrid, FiHelpCircle, FiCalendar, FiUsers, FiMessageSquare, FiBarChart, FiDollarSign, FiSettings, FiLogOut, FiBookOpen, FiTarget, FiClipboard, FiTrendingUp, FiUserCheck, FiUpload, FiDatabase } from "react-icons/fi";
import Dashboard from "./Dashboard";
import UserManagement from "./UserManagement";
import Communication from "./Communication";
import Analytics from "./Analytics";
import PaymentManager from "./PaymentManager";
import SystemSettings from "./SystemSettings";
import CourseManagement from "./CourseManagement";
import ManageCourses from "./ManageCourses";

import TestSessionMonitoring from "./TestSessionMonitoring";
import UserResultManagement from "./UserResultManagement";
import StudyPlanManagement from "./StudyPlanManagement";
import TestManagement from "./TestManagement";
import StudentProgress from "./StudentProgress";
import SATQuestionUpload from "./SATQuestionUpload";
import EnhancedQuestionBank from "./EnhancedQuestionBank";
import QuestionBankManagement from "./QuestionBankManagement";

const AdminDashboard = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Add event listener for tab switching with parameters
  useEffect(() => {
    const handleSetActiveTab = (event) => {
      setActiveTab(event.detail.tab);
      if (event.detail.params) {
        // Store parameters in sessionStorage to be used by the component
        sessionStorage.setItem('tabParams', JSON.stringify(event.detail.params));
      }
    };
    
    window.addEventListener('setActiveTab', handleSetActiveTab);
    
    return () => {
      window.removeEventListener('setActiveTab', handleSetActiveTab);
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
    { id: 'manage-courses', label: 'Manage Courses', icon: <FiBookOpen /> },
    { id: 'courses', label: 'Course & Question Bank', icon: <FiBookOpen /> },

    { id: 'sat-question-upload', label: 'SAT Question Upload', icon: <FiUpload /> },
    { id: 'question-bank', label: 'Question Bank Management', icon: <FiDatabase /> },
    { id: 'study-plan', label: 'Study Plan Management', icon: <FiTarget /> },
    { id: 'test-management', label: 'Test Management', icon: <FiClipboard /> },
    { id: 'test-sessions', label: 'Test Session Monitoring', icon: <FiBarChart /> },
    { id: 'user-results', label: 'User Result Management', icon: <FiUsers /> },
    { id: 'student-progress', label: 'Student Progress', icon: <FiTrendingUp /> },

    { id: 'users', label: 'User Management', icon: <FiUsers /> },
    { id: 'communication', label: 'Communication', icon: <FiMessageSquare /> },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart /> },
    { id: 'payments', label: 'Payments', icon: <FiDollarSign /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'manage-courses': return <ManageCourses />;
      case 'courses': return <CourseManagement />;

      case 'sat-question-upload': return <SATQuestionUpload />;
      case 'question-bank': return <QuestionBankManagement />;
      case 'study-plan': return <StudyPlanManagement />;
      case 'test-management': return <TestManagement />;
      case 'test-sessions': return <TestSessionMonitoring />;
      case 'user-results': return <UserResultManagement />;
      case 'student-progress': return <StudentProgress />;

      case 'users': return <UserManagement />;
      case 'communication': return <Communication />;
      case 'analytics': return <Analytics />;
      case 'payments': return <PaymentManager />;
      case 'settings': return <SystemSettings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">DSATGURU Admin</h1>
          <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
        </div>
        
        <nav className="p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-8 text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut />
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;