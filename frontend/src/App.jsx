import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Statically imported critical entry routes
import LearnerHome from "./pages/LearnerHome";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Route-level code-split internal dashboard pages
const ImpactDashboard = lazy(() => import("./pages/ImpactDashboard"));
const RegionalIntelligence = lazy(() => import("./pages/RegionalIntelligence"));
const EmployerMatching = lazy(() => import("./pages/EmployerMatching"));
const LearnerIntelligence = lazy(() => import("./pages/LearnerIntelligence"));
const SkillGapIntelligence = lazy(() => import("./pages/SkillGapIntelligence"));
const Settings = lazy(() => import("./pages/Settings"));
const Experience = lazy(() => import("./pages/Experience"));
const SaasTemplatePage = lazy(() => import("./pages/SaasTemplatePage"));

// Lightweight cyber-navy fallback indicator
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 font-mono text-xs text-slate-400">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
        </span>
        <span className="font-heading font-semibold text-slate-200">
          Loading KaushalNexus...
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        System modules initializing...
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Learner Landing Page & Immersive Showcases */}
            <Route path="/" element={<LearnerHome />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/saas-template" element={<SaasTemplatePage />} />

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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
