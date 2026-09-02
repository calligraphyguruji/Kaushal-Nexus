import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { skillGapsApi } from "../api/skillGaps";
import { regionalApi } from "../api/regional";
import { matchingApi } from "../api/matching";
import { dashboardApi } from "../api/dashboard";
import { UserRole, ROLE_LABELS } from "../utils/permissions";

function getInitialStats(user) {
  const roleName = user?.role ? (ROLE_LABELS[user.role] || user.role) : "National Platform";
  return {
    overview: { badge: "Live", tone: "neutral" },
    learner360: { badge: "Active", tone: "neutral" },
    skillGaps: { badge: "Telemetry", tone: "neutral" },
    regional: { badge: "Scoped", tone: "neutral" },
    matching: { badge: "Verified", tone: "neutral" },
    footerSummary: `Institutional scope active for ${roleName}.`,
  };
}

export function useSidebarStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(() => getInitialStats(user));

  const refreshStats = useCallback(async () => {
    if (!user) {
      setStats(getInitialStats(null));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [priorityGapsRes, districtsRes, summaryRes, mandatesRes] = await Promise.allSettled([
        skillGapsApi.getPriorityGaps({ limit: 60 }),
        regionalApi.getDistricts({}),
        dashboardApi.getSummary({}),
        matchingApi.listMandates({}),
      ]);

      let gapsBadge = "Active";
      if (priorityGapsRes.status === "fulfilled" && Array.isArray(priorityGapsRes.value)) {
        const count = priorityGapsRes.value.length;
        gapsBadge = `${count} Gaps`;
      }

      let regionalBadge = "Districts";
      if (districtsRes.status === "fulfilled" && Array.isArray(districtsRes.value)) {
        const count = districtsRes.value.length;
        regionalBadge = `${count} Reg`;
      }

      let matchingBadge = "Mandates";
      if (summaryRes.status === "fulfilled" && summaryRes.value?.active_jobs) {
        const jobs = summaryRes.value.active_jobs;
        matchingBadge = jobs >= 1000 ? `${(jobs / 1000).toFixed(1)}k Jobs` : `${jobs} Jobs`;
      } else if (mandatesRes.status === "fulfilled" && Array.isArray(mandatesRes.value)) {
        const jobs = mandatesRes.value.reduce((acc, m) => acc + (m.openings || 1), 0);
        matchingBadge = jobs >= 1000 ? `${(jobs / 1000).toFixed(1)}k Jobs` : `${jobs} Jobs`;
      }

      let footerSummary = `Institutional access active for ${ROLE_LABELS[user.role] || user.role}.`;
      if (summaryRes.status === "fulfilled" && summaryRes.value?.total_beneficiaries) {
        const count = summaryRes.value.total_beneficiaries;
        footerSummary = `Tracking ${Number(count).toLocaleString()} candidates in authorized jurisdiction.`;
      }

      setStats({
        overview: { badge: "Live", tone: "neutral" },
        learner360: { badge: "360°", tone: "neutral" },
        skillGaps: {
          badge: gapsBadge,
          tone: priorityGapsRes.status === "fulfilled" ? "danger" : "neutral",
        },
        regional: {
          badge: regionalBadge,
          tone: "neutral",
        },
        matching: {
          badge: matchingBadge,
          tone: "neutral",
        },
        footerSummary,
      });
    } catch (err) {
      console.warn("Failed to fetch sidebar metrics:", err);
      setError(err);
      setStats(getInitialStats(user));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, loading, error, refreshStats };
}
