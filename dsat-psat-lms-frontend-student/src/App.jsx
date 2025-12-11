import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { CourseProvider } from "./context/CourseContext";
import { AuthProvider } from "./context/AuthContext";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourseProvider>
          <AppRoutes />
        </CourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
