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
import { UserRole } from "./utils/permissions";

// Statically imported critical entry routes
import LearnerHome from "./pages/LearnerHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";

// Route-level code-split internal dashboard pages
const ImpactDashboard = lazy(() => import("./pages/ImpactDashboard"));
const RegionalIntelligence = lazy(() => import("./pages/RegionalIntelligence"));
const EmployerMatching = lazy(() => import("./pages/EmployerMatching"));
const LearnerIntelligence = lazy(() => import("./pages/LearnerIntelligence"));
const SkillGapIntelligence = lazy(() => import("./pages/SkillGapIntelligence"));
const Settings = lazy(() => import("./pages/Settings"));
const Experience = lazy(() => import("./pages/Experience"));
const SaasTemplatePage = lazy(() => import("./pages/SaasTemplatePage"));
const LearnerAssessmentPage = lazy(() => import("./pages/LearnerAssessmentPage"));
const AvailableInternships = lazy(() => import("./pages/AvailableInternships"));
const InternshipDetails = lazy(() => import("./pages/InternshipDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            <Route path="/otp-login" element={<Login defaultMode="phone" />} />
            <Route path="/phone-login" element={<Login defaultMode="phone" />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Institutional Officer & Administration Routes */}
            <Route
              path="/msde"
              element={
                <ProtectedRoute
                  requiredRoles={[UserRole.MSDE_OFFICER]}
                  disallowedRoles={[UserRole.LEARNER]}
                >
                  <DashboardLayout>
                    <ImpactDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  requiredRoles={[UserRole.SYSTEM_ADMIN, UserRole.STATE_ADMIN, UserRole.MSDE_OFFICER]}
                  disallowedRoles={[UserRole.LEARNER]}
                >
                  <DashboardLayout>
                    <ImpactDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* General Overview Route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute disallowedRoles={[UserRole.LEARNER]}>
                  <DashboardLayout>
                    <ImpactDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Candidate Learner Only Portal */}
            <Route
              path="/learner"
              element={
                <ProtectedRoute
                  requiredRoles={[UserRole.LEARNER]}
                  disallowedRoles={[
                    UserRole.MSDE_OFFICER,
                    UserRole.SYSTEM_ADMIN,
                    UserRole.STATE_ADMIN,
                    UserRole.TRAINING_PROVIDER,
                    UserRole.EMPLOYER,
                    UserRole.EVALUATOR,
                  ]}
                >
                  <DashboardLayout>
                    <LearnerIntelligence />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Officer / Administrator Candidate 360 Registry */}
            <Route
              path="/learner-intelligence"
              element={
                <ProtectedRoute disallowedRoles={[UserRole.LEARNER]}>
                  <DashboardLayout>
                    <LearnerIntelligence />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/learner/:learnerId"
              element={
                <ProtectedRoute disallowedRoles={[UserRole.LEARNER]}>
                  <DashboardLayout>
                    <LearnerIntelligence />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/skill-gap"
              element={
                <ProtectedRoute disallowedRoles={["LEARNER"]}>
                  <DashboardLayout>
                    <SkillGapIntelligence />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/regional"
              element={
                <ProtectedRoute disallowedRoles={["LEARNER"]}>
                  <DashboardLayout>
                    <RegionalIntelligence />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/matching"
              element={
                <ProtectedRoute disallowedRoles={["LEARNER"]}>
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

            <Route
              path="/assessment"
              element={
                <ProtectedRoute>
                  <LearnerAssessmentPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/internships"
              element={
                <DashboardLayout>
                  <AvailableInternships />
                </DashboardLayout>
              }
            />

            <Route
              path="/internships/:internshipId"
              element={
                <DashboardLayout>
                  <InternshipDetails />
                </DashboardLayout>
              }
            />

            {/* 404 Fallback Route */}
            <Route
              path="*"
              element={<NotFound />}
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
