import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import AdminLayout from "../layouts/AdminLayout";
import { getUserFromStorage } from "../services/api/auth/authService";

import Home from "../pages/Home";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/Signup";
import ForgotPasswordPage from "../pages/Auth/ForgotPassword";
import ResetPassword from "../pages/Auth/ResetPassword";
import DashboardHome from "../pages/Dashboard/Home";
import CoursesPage from "../pages/Dashboard/Courses";
import QuestionBanks from "../pages/Dashboard/QuestionBanks";
import StudyPlan from "../pages/Dashboard/StudyPlan";
import CheckoutStatus from "../pages/Dashboard/CheckoutStatus";

import TestResults from "../pages/Dashboard/TestResults";
import BaseTest from "../pages/Dashboard/SATTest/BaseTest";
import AdaptiveTest from "../pages/Dashboard/SATTest/AdaptiveTest";
import SATTestResults from "../pages/Dashboard/SATTest/TestResults";
import StudentAnalytics from "../pages/Dashboard/Analytics/index.jsx";
import PaymentsPage from "../pages/Dashboard/Payments";
import AboutPage from "../pages/About";
import ContactUs from "../pages/Contact";
import CourseDetail from "../pages/Dashboard/Courses/Detail";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import Dashboard from "../pages/Admin/Dashboard";
import UserManagement from "../pages/Admin/UserManagement";
import Communication from "../pages/Admin/Communication";
import Analytics from "../pages/Admin/Analytics";
import PaymentManager from "../pages/Admin/PaymentManager";
import SystemSettings from "../pages/Admin/SystemSettings";
import CourseManagement from "../pages/Admin/CourseManagement";
import ManageCourses from "../pages/Admin/ManageCourses";
import TestSessionMonitoring from "../pages/Admin/TestSessionMonitoring";
import UserResultManagement from "../pages/Admin/UserResultManagement";
import StudyPlanManagement from "../pages/Admin/StudyPlanManagement";
import TestManagement from "../pages/Admin/TestManagement";
import StudentProgress from "../pages/Admin/StudentProgress";
import SATQuestionUpload from "../pages/Admin/SATQuestionUpload";
import SingleQuestionUpload from "../pages/Admin/SingleQuestionUpload";
import BulkUpload from "../pages/Admin/BulkUpload";
import ManageQuestions from "../pages/Admin/ManageQuestions";
import EnhancedQuestionBank from "../pages/Admin/EnhancedQuestionBank";
import QuestionBankManagement from "../pages/Admin/QuestionBankManagement";
import ReviewAttempts from "../pages/Admin/ReviewAttempts";
import ReviewAttemptDetail from "../pages/Admin/ReviewAttemptDetail";
import EnrollmentPage from "../pages/Enrollment";
import LiveClassRoom from "../components/LiveClass/LiveClassRoom";
import Practice from "../pages/Dashboard/Practice";
import CreatePracticePage from "../pages/Dashboard/Practice/CreatePracticePage";
import PracticeRunner from "../pages/Dashboard/Practice/PracticeRunner";
import HistoryPage from "../pages/Dashboard/Practice/HistoryPage";
import PerformancePage from "../pages/Dashboard/Practice/PerformancePage";
import ResultsPage from "../pages/Dashboard/Practice/ResultsPage";

const isAuthenticated = () => !!localStorage.getItem("authToken");

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const user = getUserFromStorage();
  if (isAuthenticated()) {
    return user?.role === 'Admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/enrollment/:courseId" element={<EnrollmentPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactUs />} />
      </Route>

      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <Signup />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={"/checkout-success"}
        element={
          <ProtectedRoute>
            <CheckoutStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path={"/checkout-cancel"}
        element={
          <ProtectedRoute>
            <CheckoutStatus />
          </ProtectedRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="manage-courses" element={<ManageCourses />} />
        <Route path="courses" element={<CourseManagement />} />
        <Route path="sat-question-upload" element={<SATQuestionUpload />} />
        <Route path="single-question-upload" element={<SingleQuestionUpload />} />
        <Route path="bulk-upload" element={<BulkUpload />} />
        <Route path="manage-questions" element={<ManageQuestions />} />
        <Route path="question-bank" element={<QuestionBankManagement />} />
        <Route path="study-plan" element={<StudyPlanManagement />} />
        <Route path="test-management" element={<TestManagement />} />
        <Route path="test-sessions" element={<TestSessionMonitoring />} />
        <Route path="user-results" element={<UserResultManagement />} />
        <Route path="student-progress" element={<StudentProgress />} />
        <Route path="student-attempts" element={<ReviewAttempts />} />
        <Route path="student-attempts/:testSessionId" element={<ReviewAttemptDetail />} />

        <Route path="users" element={<UserManagement />} />
        <Route path="communication" element={<Communication />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="payments" element={<PaymentManager />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>
      
      {/* Legacy admin dashboard route - redirect to new structure */}
      <Route
        path="/admin-dashboard"
        element={<Navigate to="/admin/dashboard" replace />}
      />

      {/* Dashboard layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetail />} />
        <Route path="question-banks" element={<QuestionBanks />} />
        <Route path="study-plan" element={<StudyPlan />} />
        <Route path="checkout-status" element={<CheckoutStatus />} />


        <Route path="test-results" element={<TestResults />} />
        <Route path="sat-test/base/:subject" element={<BaseTest />} />
        <Route path="sat-test/base/:subject/:questionBankId" element={<BaseTest />} />
        <Route path="sat-test/adaptive/:level/:subject" element={<AdaptiveTest />} />
        <Route path="sat-test/results" element={<SATTestResults />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="live-class/:classId" element={<LiveClassRoom />} />
        <Route path="practice/create" element={<CreatePracticePage />} />
        <Route path="practice/session/:sessionId" element={<PracticeRunner />} />
        <Route path="practice/history" element={<HistoryPage />} />
        <Route path="practice/performance" element={<PerformancePage />} />
        <Route path="practice/results/:sessionId" element={<ResultsPage />} />
        <Route path="practice/:qbSlug" element={<Practice />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
