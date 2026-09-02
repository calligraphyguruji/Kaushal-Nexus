import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  GraduationCap,
  BrainCircuit,
  CheckCircle2,
  Award,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Loader2,
  Briefcase,
  UserX,
  Download,
} from "lucide-react";

import { learnersApi } from "../api/learners";
import { placementsApi } from "../api/placements";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { exportLearnerDossierPDF } from "../utils/pdfExport";
import { exportLearnersCSV } from "../utils/csvExport";
import { usePermissions } from "../hooks/usePermissions";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";
import AISkillIntelligence from "../components/AISkillIntelligence";
import StateView from "../components/StateView";


// Deterministic color palette for candidate avatars
const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-indigo-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function getAvatarBg(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  if (!name) return "KN";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStatusVariant(status = "") {
  const s = status.toLowerCase();
  if (s.includes("retained") || s.includes("placed")) return "success";
  if (s.includes("interview") || s.includes("passed")) return "info";
  if (s.includes("training")) return "warning";
  return "neutral";
}

function maskIdentifier(id = "") {
  if (!id) return "•••• •••• ••••";
  const str = String(id).replace(/\s+/g, "");
  if (str.length <= 4) return `•••• •••• ${str}`;
  return `•••• •••• ${str.slice(-4)}`;
}

export default function LearnerIntelligence() {
  const { learnerId, id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const urlSearch = searchParams.get("search") || "";
  const initialTargetId = learnerId || routeId || searchParams.get("id") || "";

  // Candidate List & Pagination States
  const [learnersList, setLearnersList] = useState([]);
  const [totalLearners, setTotalLearners] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  // Selected Candidate 360 Dossier States
  const [selectedLearnerId, setSelectedLearnerId] = useState(initialTargetId || null);
  const [currentLearner, setCurrentLearner] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [retentionAudit, setRetentionAudit] = useState(null);
  const [dossierNotFound, setDossierNotFound] = useState(false);
  const [dossierForbidden, setDossierForbidden] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState(null);

  // Status & Loading States
  const [listLoading, setListLoading] = useState(true);
  const [dossierLoading, setDossierLoading] = useState(Boolean(initialTargetId));
  const [error, setError] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Modals
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedCheckpointModal, setSelectedCheckpointModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Checkpoint update form states
  const [checkpointActive, setCheckpointActive] = useState(true);
  const [checkpointCTC, setCheckpointCTC] = useState(4.5);
  const [checkpointRemarks, setCheckpointRemarks] = useState("");

  // Sync route / URL parameters when route changes
  useEffect(() => {
    const routeParamId = learnerId || routeId || searchParams.get("id");
    if (routeParamId && routeParamId !== selectedLearnerId) {
      setSelectedLearnerId(routeParamId);
    }
    const queryParamSearch = searchParams.get("search");
    if (queryParamSearch !== null && queryParamSearch !== searchQuery) {
      setSearchQuery(queryParamSearch);
      setDebouncedSearch(queryParamSearch);
    }
  }, [learnerId, routeId, searchParams]);

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch paginated candidate list from backend
  const fetchLearnersList = useCallback(async () => {
    try {
      setListLoading(true);
      setError(null);
      await authApi.ensureAuthenticated();

      const res = await learnersApi.list({
        search: debouncedSearch || undefined,
        page: currentPage,
        page_size: pageSize,
      });

      const items = res.items || [];
      setLearnersList(items);
      setTotalLearners(res.total || 0);

      // Only auto-select first item if no candidate is currently selected AND no route param exists
      setSelectedLearnerId((prev) => {
        if (prev) return prev;
        return items.length > 0 ? items[0].id : null;
      });
    } catch (err) {
      console.error("Failed to fetch learners list:", err);
      setError(getErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  }, [debouncedSearch, currentPage, pageSize]);

  useEffect(() => {
    fetchLearnersList();
  }, [fetchLearnersList]);

  // Fetch full Candidate 360 dossier & placement/retention records when selection changes
  const fetchLearnerDossier = useCallback(async (id) => {
    if (!id || id === "0" || id === "undefined" || id === "null") {
      setCurrentLearner(null);
      setPlacements([]);
      setRetentionAudit(null);
      setDossierNotFound(true);
      setDossierForbidden(false);
      setDossierLoading(false);
      return;
    }
    try {
      setDossierLoading(true);
      setDossierNotFound(false);
      setDossierForbidden(false);
      setForbiddenMessage(null);
      // Immediately clear previous candidate to prevent showing stale details
      setCurrentLearner(null);
      setPlacements([]);
      setRetentionAudit(null);

      await authApi.ensureAuthenticated();
      const [dossier, placementList] = await Promise.all([
        learnersApi.getById(id),
        placementsApi.getByLearnerId(id).catch(() => []),
      ]);

      if (!dossier || !dossier.id) {
        setCurrentLearner(null);
        setDossierNotFound(true);
        setDossierForbidden(false);
        return;
      }

      setCurrentLearner(dossier);
      setDossierNotFound(false);
      setDossierForbidden(false);
      setPlacements(placementList || []);

      if (placementList && placementList.length > 0) {
        const audit = await placementsApi
          .getRetentionAudit(placementList[0].id)
          .catch(() => null);
        setRetentionAudit(audit);
      } else {
        setRetentionAudit(null);
      }
    } catch (err) {
      console.error(`Failed to fetch dossier for learner ${id}:`, err);
      setCurrentLearner(null);
      if (err.response?.status === 403) {
        setDossierForbidden(true);
        setForbiddenMessage(
          getErrorMessage(err) || "This candidate is outside your authorized institutional scope."
        );
        setDossierNotFound(false);
      } else if (err.response?.status === 404) {
        setDossierNotFound(true);
        setDossierForbidden(false);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setDossierLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLearnerId) {
      fetchLearnerDossier(selectedLearnerId);
    }
  }, [selectedLearnerId, fetchLearnerDossier]);

  // When clicking a candidate in the registry list
  const handleSelectCandidate = (candidateId) => {
    if (!candidateId) return;
    setSelectedLearnerId(candidateId);
    navigate(`/learner/${encodeURIComponent(candidateId)}`);
  };

  // Execute NCVET Credential Verification Action
  const handleVerifyCredential = async () => {
    if (!currentLearner) return;
    try {
      setActionLoading(true);
      const res = await learnersApi.verifyCredential(currentLearner.id, {
        notes: "Audited and verified against National Skills Registry (NSR) database.",
      });
      setIsDossierModalOpen(false);
      setActionSuccessMsg(
        res.message || `NCVET Credential ${res.credential_id} successfully verified.`
      );
      await fetchLearnerDossier(currentLearner.id);
    } catch (err) {
      alert(`Verification failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Bridge Module Allocation Action
  const handleAllocateBridgeModule = async () => {
    if (!currentLearner) return;
    try {
      setActionLoading(true);
      const res = await learnersApi.allocateBridgeModule(currentLearner.id, {
        module_name: "Advanced Applied Lab Specialization & Cloud Architecture",
        duration_hours: 40,
        notes: "Targeted intervention to boost candidate employment readiness.",
      });
      setIsInterventionModalOpen(false);
      setActionSuccessMsg(
        `Bridge Module Allocated! Readiness score improved to ${res.new_readiness_score}%.`
      );
      await fetchLearnerDossier(currentLearner.id);
      await fetchLearnersList();
    } catch (err) {
      alert(`Allocation failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Retention Checkpoint Edit Modal
  const handleOpenCheckpointModal = (cp) => {
    setSelectedCheckpointModal(cp);
    setCheckpointActive(cp.is_active_at_checkpoint);
    setCheckpointCTC(cp.current_ctc_lpa || 4.5);
    setCheckpointRemarks(cp.remarks || "");
  };

  // Execute Retention Checkpoint Update
  const handleUpdateCheckpoint = async () => {
    if (!selectedCheckpointModal || !placements[0]) return;
    try {
      setActionLoading(true);
      const res = await placementsApi.updateCheckpoint(
        placements[0].id,
        selectedCheckpointModal.checkpoint_type,
        {
          is_active_at_checkpoint: checkpointActive,
          current_ctc_lpa: Number(checkpointCTC),
          remarks: checkpointRemarks || undefined,
          epfo_verified: true,
        }
      );

      setSelectedCheckpointModal(null);
      setActionSuccessMsg(
        `✅ Checkpoint ${res.checkpoint_type} Updated! Wage Growth: +${res.wage_increment_percentage}%. Active Status: ${
          res.is_active_at_checkpoint ? "Retained" : "Inactive"
        }.`
      );
      await fetchLearnerDossier(selectedLearnerId);
    } catch (err) {
      alert(`Checkpoint update failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(totalLearners / pageSize) || 1;
  const activePlacement = placements.length > 0 ? placements[0] : null;

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER & ACTIONS
      ====================================================== */}
      <PageHeader
        badge="Beneficiary 360° Intelligence"
        badgeVariant="indigo"
        title="Learner Dossier & Competency Tracker"
        description="Individual-level tracking of verified skills, assessment scores, detected skill gaps, employment readiness, and longitudinal career progression."
        breadcrumbs={["National Platform", "Learner Intelligence"]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchLearnersList();
                if (selectedLearnerId) fetchLearnerDossier(selectedLearnerId);
              }}
              disabled={listLoading || dossierLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={13}
                className={listLoading || dossierLoading ? "animate-spin text-blue-600" : ""}
              />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentLearner) {
                  exportLearnerDossierPDF(currentLearner, placements, retentionAudit);
                  setActionSuccessMsg(`✅ Downloaded Candidate 360° Dossier for ${currentLearner.full_name} (${currentLearner.id}).`);
                }
              }}
              disabled={!currentLearner}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Download Candidate 360 Dossier & NCVET Certificate PDF"
            >
              <Download size={13} />
              <span>Download Dossier (PDF)</span>
            </button>

            {permissions.canVerifyCredential && (
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(true)}
                disabled={!currentLearner}
                className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                <Award size={14} />
                <span>Verify NCVET Credential</span>
                <ArrowUpRight
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>
            )}
          </div>
        }
      />

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs font-bold uppercase text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold">Unable to Load Beneficiary Data</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchLearnersList()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700 active:scale-95"
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          1. COHORT SELECTOR & PAGINATED BROWSER
      ====================================================== */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={15} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              National Beneficiary Registry ({totalLearners} Total):
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                placeholder="Search candidate name, ID, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                exportLearnersCSV(learnersList, debouncedSearch);
                setActionSuccessMsg(`✅ Exported ${learnersList.length} candidate records to CSV.`);
              }}
              disabled={learnersList.length === 0}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
              title="Export visible candidates to CSV"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Learner Switcher Grid */}
        <div className="mt-3 flex flex-wrap gap-2">
          {listLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex h-12 w-64 animate-pulse items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800"
              >
                <div className="h-7 w-7 rounded-md bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2 w-32 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))
          ) : learnersList.length === 0 ? (
            <div className="w-full py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No beneficiary records found matching "{searchQuery}".
            </div>
          ) : (
            learnersList.map((learner) => {
              const isSelected = learner.id === selectedLearnerId;
              const avatarBg = getAvatarBg(learner.full_name);
              const initials = getInitials(learner.full_name);

              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => handleSelectCandidate(learner.id)}
                  className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? "border-slate-900 bg-slate-50 font-semibold text-slate-950 dark:border-blue-500 dark:bg-slate-800 dark:text-white"
                      : "border-slate-200/80 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white ${avatarBg}`}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[130px] truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {learner.full_name}
                      </span>
                      <StatusBadge variant={getStatusVariant(learner.status)} size="sm">
                        {learner.employment_readiness_score}%
                      </StatusBadge>
                    </div>
                    <p className="max-w-[170px] truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {learner.district_name || learner.district_id} · {learner.nsqf_level || "NSQF"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalLearners > pageSize && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} –{" "}
              {Math.min(currentPage * pageSize, totalLearners)} of {totalLearners} candidates
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || listLoading}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || listLoading}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          2. SELECTED LEARNER 360° MASTER HEADER CARD
      ====================================================== */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        {dossierLoading ? (
          <StateView
            variant="loading"
            title="Loading Candidate 360° Dossier..."
            message="Querying candidate credentials, verified competencies, and longitudinal placement status."
          />
        ) : dossierForbidden ? (
          <StateView
            variant="forbidden"
            title="Candidate Dossier Restricted"
            message={
              forbiddenMessage ||
              `Access denied. Candidate "${selectedLearnerId}" is outside your authorized institutional jurisdiction.`
            }
            actionLabel="View First Accessible Beneficiary"
            onAction={() => {
              if (learnersList.length > 0) {
                handleSelectCandidate(learnersList[0].id);
              }
            }}
          />
        ) : dossierNotFound ? (
          <StateView
            variant="notfound"
            title="Candidate Dossier Not Found"
            message={`No beneficiary record matching ID "${selectedLearnerId}" was found in the database.`}
            actionLabel="View First Available Beneficiary"
            onAction={() => {
              if (learnersList.length > 0) {
                handleSelectCandidate(learnersList[0].id);
              } else {
                navigate("/learner");
              }
            }}
          />
        ) : currentLearner ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Candidate Info */}
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-xs ${getAvatarBg(
                  currentLearner.full_name
                )}`}
              >
                {getInitials(currentLearner.full_name)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {currentLearner.full_name}
                  </h2>
                  <StatusBadge variant={getStatusVariant(currentLearner.status)} size="sm" dot>
                    {currentLearner.status}
                  </StatusBadge>
                  {currentLearner.ncvet_credential_id && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <ShieldCheck size={12} />
                      Aadhaar & NCVET Verified
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    ID: {currentLearner.id}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <GraduationCap size={13} className="text-slate-400 dark:text-slate-500" />
                    {currentLearner.education_level || "Vocational Studies"}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                    {currentLearner.district_name || currentLearner.district_id},{" "}
                    {currentLearner.state || "India"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {currentLearner.nsqf_level || "NSQF Level 5"}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Training Center:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {currentLearner.training_info?.training_center_name ||
                        "PMKK Accredited Center"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Readiness & Progress Key Metrics */}
            <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0 dark:border-slate-800">
              <div className="text-center sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Employment Readiness
                </p>
                <div className="mt-0.5 flex items-baseline justify-center gap-1 sm:justify-end">
                  <span className="text-3xl font-bold tracking-tight tabular-nums text-blue-700 dark:text-blue-400">
                    {currentLearner.employment_readiness_score}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    /100
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {currentLearner.employment_readiness_score >= 80
                    ? "High Market Fit"
                    : currentLearner.employment_readiness_score >= 60
                    ? "Moderate Readiness"
                    : "Remedial Track Required"}
                </span>
              </div>

              <div className="hidden h-10 w-px bg-slate-200 sm:block dark:bg-slate-800" />

              <div className="text-center sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Training Progress
                </p>
                <div className="mt-0.5 flex items-baseline justify-center gap-1 sm:justify-end">
                  <span className="text-3xl font-bold tracking-tight tabular-nums text-slate-950 dark:text-white">
                    {currentLearner.overall_progress}%
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {currentLearner.training_info?.modules_completed || 8} Modules (
                  {currentLearner.training_info?.training_hours || "120 hrs"})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">No candidate selected.</div>
        )}
      </section>

      {/* =====================================================
          2.5. LONGITUDINAL PLACEMENT & RETENTION TRACKING (3M/6M/12M)
      ====================================================== */}
      {currentLearner && activePlacement && (
        <section className="rounded-xl border border-blue-200/80 bg-white p-5 sm:p-6 dark:border-blue-900/50 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  Verified Placement & Longitudinal Retention Checkpoints
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Continuous tracking of candidate joined date, starting vs current CTC, and 3M, 6M,
                12M EPFO remittances.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400" />
                ⚡ Simulated Mock EPFO Adapter Active
              </span>
            </div>
          </div>

          {/* Placement Primary Summary */}
          <div className="mt-4 grid gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Employer</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                {activePlacement.employer_name || "Corporate Partner"}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Position / Role</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                {activePlacement.job_title}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Compensation</span>
              <p className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                ₹{activePlacement.starting_ctc_lpa} LPA Starting
                {activePlacement.current_ctc_lpa && activePlacement.current_ctc_lpa > activePlacement.starting_ctc_lpa && (
                  <span className="ml-1 text-[10px] text-slate-500">
                    (Now: ₹{activePlacement.current_ctc_lpa} LPA)
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">EPFO UAN</span>
              <p className="mt-0.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                {maskIdentifier(activePlacement.uan)}
              </p>
            </div>
          </div>

          {/* 3M / 6M / 12M Checkpoint Cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(retentionAudit?.checkpoints || []).map((cp) => (
              <div
                key={cp.checkpoint_type}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 text-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {cp.checkpoint_type} Checkpoint ({cp.milestone_months * 30} Days)
                    </span>
                    <StatusBadge
                      variant={cp.is_active_at_checkpoint ? "success" : "danger"}
                      size="sm"
                    >
                      {cp.is_active_at_checkpoint ? "Retained & Active" : "Stalled"}
                    </StatusBadge>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Milestone Date:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {cp.checkpoint_date || "Calculated"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">EPFO Remittance:</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {cp.epfo_verified ? "✓ Verified (Mock)" : "Pending"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Wage Increment:</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        +{cp.wage_increment_percentage || 0}%
                      </span>
                    </p>
                  </div>

                  {cp.remarks && (
                    <p className="mt-2 rounded bg-slate-50 p-1.5 text-[10px] text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                      {cp.remarks}
                    </p>
                  )}
                </div>

                {permissions.canUpdateRetention && (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckpointModal(cp)}
                    className="mt-3 w-full rounded border border-slate-200 bg-slate-50 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
                  >
                    Audit / Update Checkpoint
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          3. THREE-COLUMN INTELLIGENCE BREAKDOWN
      ====================================================== */}
      {currentLearner && (
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Verified Skills Dossier */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <SectionHeader
                title="Verified Competencies"
                subtitle="Skills assessed & authenticated by accredited bodies"
                badge={
                  <StatusBadge variant="success" size="sm">
                    {(currentLearner.skills || []).length} Verified
                  </StatusBadge>
                }
              />

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {(currentLearner.skills || []).map((skill) => (
                  <div key={skill.code || skill.name} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {skill.name}
                      </span>
                      <span className="font-bold tabular-nums text-blue-700 dark:text-blue-400">
                        {skill.score_percentage}%
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all dark:bg-blue-600"
                        style={{ width: `${skill.score_percentage}%` }}
                      />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{skill.verified_by || "NCVET Accredited"}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        {skill.sector}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                Credential ID:{" "}
                {currentLearner.ncvet_credential_id || "NCVET-PENDING-EVALUATION"}
              </span>
            </div>
          </div>

          {/* Detected Skill Gaps & Deficits */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <SectionHeader
                title="Detected Skill Gaps"
                subtitle="Shortages hindering immediate employer match"
                badge={
                  <StatusBadge variant="warning" size="sm">
                    {(currentLearner.detected_gaps || []).length} Actionable Gaps
                  </StatusBadge>
                }
              />

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {(currentLearner.detected_gaps || []).map((gap) => (
                  <div key={gap.name} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {gap.name}
                      </span>
                      <StatusBadge
                        variant={gap.level === "Critical" ? "danger" : "warning"}
                        size="sm"
                      >
                        {gap.level} Priority
                      </StatusBadge>
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <strong>Impact:</strong> {gap.impact}
                    </p>
                  </div>
                ))}

                {(!currentLearner.detected_gaps || currentLearner.detected_gaps.length === 0) && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center text-xs text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2
                      size={22}
                      className="mx-auto mb-1 text-emerald-600 dark:text-emerald-400"
                    />
                    No critical skill gaps detected. Candidate is fully aligned with market demand.
                  </div>
                )}
              </div>
            </div>

            {permissions.canAllocateBridgeModule && (
              <button
                type="button"
                onClick={() => setIsInterventionModalOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
              >
                <BrainCircuit size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Generate Targeted Bridge Module</span>
              </button>
            )}
          </div>

          {/* Longitudinal Career Timeline */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <SectionHeader
                title="Longitudinal Career Journey"
                subtitle="From enrollment to employment milestone"
              />

              <div className="mt-4 space-y-3">
                {(currentLearner.career_timeline || []).map((step, idx) => {
                  const isCompleted = step.status === "completed";
                  const isCurrent = step.status === "current";

                  return (
                    <div key={step.title} className="relative flex gap-3">
                      {/* Line Connector */}
                      {idx < (currentLearner.career_timeline || []).length - 1 && (
                        <div className="absolute left-[11px] top-5 h-full w-px bg-slate-200 dark:bg-slate-800" />
                      )}

                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900">
                        {isCompleted ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 size={13} />
                          </div>
                        ) : isCurrent ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            <Clock size={13} />
                          </div>
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800" />
                        )}
                      </div>

                      <div className="min-w-0 pb-1.5">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {step.title}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{step.date}</p>
                        {step.note && (
                          <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
              <span>Next Verification: 180-Day Retention Check</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">EPFO Synced</span>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          4. AI SKILL INTELLIGENCE & PERSONALIZED ROADMAP (GEMINI)
      ====================================================== */}
      {currentLearner && (
        <AISkillIntelligence
          learner={currentLearner}
          onInterventionDeploy={() => setIsInterventionModalOpen(true)}
        />
      )}


      {/* =====================================================
          ACTION MODALS
      ====================================================== */}
      {currentLearner && (
        <>
          {/* NCVET Verification Modal */}
          <ActionModal
            isOpen={isDossierModalOpen}
            onClose={() => setIsDossierModalOpen(false)}
            title="NCVET Credential Verification Certificate"
            subtitle={`Candidate ID: ${currentLearner.id} · ${currentLearner.nsqf_level || "NSQF Level 5"}`}
            confirmText={actionLoading ? "Verifying..." : "Confirm & Verify Credential"}
            onConfirm={handleVerifyCredential}
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {currentLearner.full_name}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Training Center: {currentLearner.training_info?.training_center_name || "PMKK Center"}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Credential ID: {currentLearner.ncvet_credential_id || "NCVET-2026-PENDING"}
                </p>
                <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  Status: Authenticated on National Skills Registry (NSR)
                </p>
              </div>
            </div>
          </ActionModal>

          {/* Bridge Module Allocation Modal */}
          <ActionModal
            isOpen={isInterventionModalOpen}
            onClose={() => setIsInterventionModalOpen(false)}
            title="Allocate Individual Bridge Upskilling Module"
            subtitle={`Candidate: ${currentLearner.full_name} (${currentLearner.id})`}
            confirmText={actionLoading ? "Allocating..." : "Enroll in Specialization Track"}
            onConfirm={handleAllocateBridgeModule}
          >
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This action assigns a 40-hour lab specialization credit to {currentLearner.full_name}{" "}
              to close the detected competency deficit and enhance employer placement match scores.
            </p>
          </ActionModal>

          {/* Checkpoint Audit & Update Modal */}
          {selectedCheckpointModal && (
            <ActionModal
              isOpen={!!selectedCheckpointModal}
              onClose={() => setSelectedCheckpointModal(null)}
              title={`Audit ${selectedCheckpointModal.checkpoint_type} Retention Milestone`}
              subtitle={`Candidate: ${currentLearner.full_name} · Employer: ${
                activePlacement?.employer_name || "Partner"
              }`}
              confirmText={actionLoading ? "Auditing..." : "Update Retention Milestone"}
              onConfirm={handleUpdateCheckpoint}
            >
              <div className="space-y-4 text-xs">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                  <strong>⚡ Simulated EPFO Verification Adapter:</strong> Remittance verified
                  against 12-digit UAN:{" "}
                  <span className="font-mono font-bold">{maskIdentifier(activePlacement?.uan)}</span>.
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Employment Status at Milestone:
                  </label>
                  <div className="mt-1.5 flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="active_status"
                        checked={checkpointActive === true}
                        onChange={() => setCheckpointActive(true)}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        Active & Retained
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="active_status"
                        checked={checkpointActive === false}
                        onChange={() => setCheckpointActive(false)}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        Inactive / Resigned
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Current Milestone CTC (LPA ₹):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="25.0"
                    value={checkpointCTC}
                    onChange={(e) => setCheckpointCTC(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                  <span className="text-[10px] text-slate-400">
                    Starting CTC: ₹{activePlacement?.starting_ctc_lpa} LPA
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Milestone Audit Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={checkpointRemarks}
                    onChange={(e) => setCheckpointRemarks(e.target.value)}
                    placeholder="e.g. Verified 3-month continuous EPF contribution remittance from employer..."
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </ActionModal>
          )}
        </>
      )}
    </div>
  );
}