import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import LearnerHome from "./pages/LearnerHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ImpactDashboard from "./pages/ImpactDashboard";
import RegionalIntelligence from "./pages/RegionalIntelligence";
import EmployerMatching from "./pages/EmployerMatching";
import LearnerIntelligence from "./pages/LearnerIntelligence";
import SkillGapIntelligence from "./pages/SkillGapIntelligence";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Learner Landing Page */}
          <Route path="/" element={<LearnerHome />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ImpactDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/learner"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LearnerIntelligence />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/learner/:learnerId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LearnerIntelligence />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/skill-gap"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SkillGapIntelligence />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/regional"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RegionalIntelligence />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/matching"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmployerMatching />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Fallback Redirect */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;