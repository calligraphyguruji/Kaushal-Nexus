import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";

import ImpactDashboard from "./pages/ImpactDashboard";
import RegionalIntelligence from "./pages/RegionalIntelligence";
import EmployerMatching from "./pages/EmployerMatching";
import LearnerIntelligence from "./pages/LearnerIntelligence";
import SkillGapIntelligence from "./pages/SkillGapIntelligence";

function App() {
  return (
    <BrowserRouter>

      <DashboardLayout>

        <Routes>

          {/* =========================
              OVERVIEW
          ========================== */}
          <Route
            path="/dashboard"
            element={<ImpactDashboard />}
          />


          {/* =========================
              LEARNER INTELLIGENCE
          ========================== */}
          <Route
            path="/learner"
            element={<LearnerIntelligence />}
          />


          {/* =========================
              SKILL GAP
          ========================== */}
          <Route
            path="/skill-gap"
            element={<SkillGapIntelligence />}
          />


          {/* =========================
              REGIONAL INTELLIGENCE
          ========================== */}
          <Route
            path="/regional"
            element={<RegionalIntelligence />}
          />


          {/* =========================
              EMPLOYER NETWORK
          ========================== */}
          <Route
            path="/matching"
            element={<EmployerMatching />}
          />


          {/* =========================
              DEFAULT
          ========================== */}
          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

        </Routes>

      </DashboardLayout>

    </BrowserRouter>
  );
}

export default App;