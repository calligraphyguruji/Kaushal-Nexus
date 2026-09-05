import React, { useState, useEffect, useCallback } from "react";
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
  PhoneCall,
  Send,
  Building2,
  UserMinus,
  Plus,
  Sparkles,
  UserRound,
  Compass,
  Activity,
  TrendingUp,
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
import BKTSkillMasteryCard from "../components/BKTSkillMasteryCard";
import LearnerPipelineWizard from "../components/LearnerPipelineWizard";
import AdaptiveLearningWorkspace from "../components/AdaptiveLearningWorkspace";
import CareerJourneyWorkspace from "../components/CareerJourneyWorkspace";
import AIPlacementPredictionCard from "../components/AIPlacementPredictionCard";
import MLModelStudio from "../components/MLModelStudio";
import CareerIntelligenceCenter from "../components/CareerIntelligenceCenter";
import ImpactProgress from "../components/ImpactProgress";
import ImpactIntelligenceDashboard from "../components/ImpactIntelligenceDashboard";
import StateView from "../components/StateView";

// Deterministic color palette for candidate avatars
const AVATAR_COLORS = [
  "from-sky-500 to-indigo-600",
  "from-indigo-500 to-purple-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-blue-600",
  "from-amber-500 to-orange-600",
];

function getAvatarGradient(name = "") {
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

  // View Mode: 'career' (Phase 4 Journey & ML), 'remediation' (Phase 3 Loop), 'pipeline' (Phase 2), 'dossier' (Candidate 360)
  const tabParam = searchParams.get("tab");
  const [viewMode, setViewMode] = useState(tabParam || (initialTargetId ? "dossier" : "career"));

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
  const [pdfExporting, setPdfExporting] = useState(false);
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

  // Longitudinal Outcome States
  const [followUpsList, setFollowUpsList] = useState([]);
  const [selfEmpList, setSelfEmpList] = useState([]);
  const [nonPlacementList, setNonPlacementList] = useState([]);
  const [consentsList, setConsentsList] = useState([]);
  const [separationsList, setSeparationsList] = useState([]);

  // Longitudinal Outcome Modals
  const [isScheduleFollowUpModalOpen, setIsScheduleFollowUpModalOpen] = useState(false);
  const [followUpType, setFollowUpType] = useState("30_DAY");
  const [followUpChannel, setFollowUpChannel] = useState("IN_APP");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const [isRecordResponseModalOpen, setIsRecordResponseModalOpen] = useState(false);
  const [targetFollowUpId, setTargetFollowUpId] = useState(null);
  const [responseStatus, setResponseStatus] = useState("EMPLOYED");
  const [responseNotes, setResponseNotes] = useState("");

  const [isSelfEmpModalOpen, setIsSelfEmpModalOpen] = useState(false);
  const [selfEmpName, setSelfEmpName] = useState("");
  const [selfEmpActivity, setSelfEmpActivity] = useState("");
  const [selfEmpSector, setSelfEmpSector] = useState("Power & Clean Energy");
  const [selfEmpIncome, setSelfEmpIncome] = useState("₹20,000 - ₹35,000");
  const [selfEmpNotes, setSelfEmpNotes] = useState("");

  const [isNonPlacementModalOpen, setIsNonPlacementModalOpen] = useState(false);
  const [nonPlacementReason, setNonPlacementReason] = useState("SKILL_GAP");
  const [nonPlacementSkillCode, setNonPlacementSkillCode] = useState("COMP-GENAI-01");
  const [nonPlacementNotes, setNonPlacementNotes] = useState("");

  const [isSeparationModalOpen, setIsSeparationModalOpen] = useState(false);
  const [separationReason, setSeparationReason] = useState("BETTER_OPPORTUNITY");
  const [separationDate, setSeparationDate] = useState(new Date().toISOString().split("T")[0]);
  const [separationNotes, setSeparationNotes] = useState("");

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
      setCurrentLearner(null);
      setPlacements([]);
      setRetentionAudit(null);

      await authApi.ensureAuthenticated();
      const [
        dossier,
        placementList,
        consentsRes,
        followUpsRes,
        selfEmpRes,
        nonPlcRes,
      ] = await Promise.all([
        learnersApi.getById(id),
        placementsApi.getByLearnerId(id).catch(() => []),
        learnersApi.getConsents(id).catch(() => []),
        learnersApi.getFollowUps(id).catch(() => []),
        learnersApi.getSelfEmployment(id).catch(() => []),
        learnersApi.getNonPlacementReasons(id).catch(() => []),
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
      setConsentsList(consentsRes || dossier.consents || []);
      setFollowUpsList(followUpsRes || dossier.follow_ups || []);
      setSelfEmpList(selfEmpRes || dossier.self_employment_outcomes || []);
      setNonPlacementList(nonPlcRes || dossier.non_placement_reasons || []);

      if (placementList && placementList.length > 0) {
        const [audit, seps] = await Promise.all([
          placementsApi.getRetentionAudit(placementList[0].id).catch(() => null),
          placementsApi.getSeparations(placementList[0].id).catch(() => []),
        ]);
        setRetentionAudit(audit);
        setSeparationsList(seps || []);
      } else {
        setRetentionAudit(null);
        setSeparationsList([]);
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

  const handleSelectCandidate = (candidateId) => {
    if (!candidateId) return;
    setSelectedLearnerId(candidateId);
    navigate(`/learner/${encodeURIComponent(candidateId)}`);
  };

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

  const handleOpenCheckpointModal = (cp) => {
    setSelectedCheckpointModal(cp);
    setCheckpointActive(cp.is_active_at_checkpoint);
    setCheckpointCTC(cp.current_ctc_lpa || 4.5);
    setCheckpointRemarks(cp.remarks || "");
  };

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

  const handleScheduleFollowUp = async () => {
    if (!currentLearner) return;
    try {
      setActionLoading(true);
      const scheduledDate = new Date(Date.now() + 30 * 86400000).toISOString();
      await learnersApi.scheduleFollowUp(currentLearner.id, {
        follow_up_type: followUpType,
        scheduled_at: scheduledDate,
        channel: followUpChannel,
        notes: followUpNotes || undefined,
      });
      setIsScheduleFollowUpModalOpen(false);
      setFollowUpNotes("");
      setActionSuccessMsg(`✅ Scheduled ${followUpType} follow-up via ${followUpChannel} for ${currentLearner.full_name}.`);
      await fetchLearnerDossier(selectedLearnerId);
    } catch (err) {
      alert(`Follow-up scheduling failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordResponse = async () => {
    if (!currentLearner || !targetFollowUpId) return;
    try {
      setActionLoading(true);
      await learnersApi.recordFollowUpResponse(currentLearner.id, targetFollowUpId, {
        response_status: responseStatus,
        notes: responseNotes || undefined,
      });
      setIsRecordResponseModalOpen(false);
      setTargetFollowUpId(null);
      setResponseNotes("");
      setActionSuccessMsg(`✅ Outcome response recorded: ${responseStatus} for ${currentLearner.full_name}.`);
      await fetchLearnerDossier(selectedLearnerId);
    } catch (err) {
      alert(`Recording response failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSelfEmployment = async () => {
    if (!currentLearner || !selfEmpName.trim()) return;
    try {
      setActionLoading(true);
      await learnersApi.createSelfEmployment(currentLearner.id, {
        enterprise_name: selfEmpName.trim(),
        business_activity: selfEmpActivity.trim() || "Trade Operations",
        sector: selfEmpSector,
        district_id: currentLearner.district_id || "UP-VARANASI",
        start_date: new Date().toISOString().split("T")[0],
        monthly_income_range: selfEmpIncome,
        notes: selfEmpNotes || undefined,
      });
      setIsSelfEmpModalOpen(false);
      setSelfEmpName("");
      setSelfEmpActivity("");
      setSelfEmpNotes("");
      setActionSuccessMsg(`✅ Self-employment venture '${selfEmpName}' registered for ${currentLearner.full_name}.`);
      await fetchLearnerDossier(selectedLearnerId);
    } catch (err) {
      alert(`Self-employment registration failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordNonPlacement = async () => {
    if (!currentLearner) return;
    try {
      setActionLoading(true);
      await learnersApi.recordNonPlacementReason(currentLearner.id, {
        reason: nonPlacementReason,
        source: "TRAINING_PROVIDER",
        notes: nonPlacementNotes || undefined,
        associated_skill_code: nonPlacementReason === "SKILL_GAP" ? nonPlacementSkillCode : undefined,
      });
      setIsNonPlacementModalOpen(false);
      setNonPlacementNotes("");
      setActionSuccessMsg(`✅ Non-placement bottleneck '${nonPlacementReason}' logged for ${currentLearner.full_name}.`);
      await fetchLearnerDossier(selectedLearnerId);
    } catch (err) {
      alert(`Failed to log non-placement reason: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordSeparation = async () => {
    if (!activePlacement) return;
    try {
      setActionLoading(true);
      await placementsApi.recordSeparation(activePlacement.id, {
        reason: separationReason,
        separation_date: separationDate,
        source: "EMPLOYER",
        notes: separationNotes || undefined,
      });
      setIsSeparationModalOpen(false);
      setSeparationNotes("");
      setActionSuccessMsg(`✅ Job separation recorded for ${currentLearner.full_name}. Placement updated to Separated.`);
      await fetchLearnerDossier(selectedLearnerId);
    } catch (err) {
      alert(`Failed to record separation: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(totalLearners / pageSize) || 1;
  const activePlacement = placements.length > 0 ? placements[0] : null;

  return (
    <div className="space-y-8 font-sans text-[#f1f5f9]">
      {/* =====================================================
          1. PAGE HEADER & ACTIONS
      ====================================================== */}
      <PageHeader
        badge="LEARNER INTELLIGENCE"
        badgeVariant="cyan"
        title="Learner 360"
        description="Individual learner readiness, skill-gap, placement, and longitudinal outcome intelligence."
        breadcrumbs={["National Platform", "Learner Intelligence"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchLearnersList();
                if (selectedLearnerId) fetchLearnerDossier(selectedLearnerId);
              }}
              disabled={listLoading || dossierLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-2 font-mono text-xs font-semibold text-slate-300 shadow-xs transition hover:border-slate-700 hover:bg-[#0f1c33] hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={listLoading || dossierLoading ? "animate-spin text-sky-400" : "text-sky-400"}
              />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (currentLearner) {
                  try {
                    setPdfExporting(true);
                    exportLearnerDossierPDF(currentLearner, placements, retentionAudit);
                    const candidateName = currentLearner.full_name || currentLearner.name || "Candidate";
                    setActionSuccessMsg(`✅ Downloaded Candidate 360° Dossier for ${candidateName} (${currentLearner.id}).`);
                  } catch (err) {
                    console.error("PDF export error:", err);
                    setError("Error exporting PDF dossier: " + (err?.message || "Unknown error"));
                  } finally {
                    setPdfExporting(false);
                  }
                }
              }}
              disabled={!currentLearner || pdfExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-2 font-mono text-xs font-semibold text-slate-300 shadow-xs transition hover:border-slate-700 hover:bg-[#0f1c33] hover:text-white disabled:opacity-50 cursor-pointer"
              title="Download Candidate 360 Dossier & NCVET Certificate PDF"
            >
              <Download size={13} className={pdfExporting ? "animate-bounce text-sky-400" : "text-sky-400"} />
              <span>{pdfExporting ? "Generating PDF..." : "Download Dossier (PDF)"}</span>
            </button>

            {permissions.canVerifyCredential && (
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(true)}
                disabled={!currentLearner}
                className="group inline-flex items-center gap-2 rounded-lg bg-sky-400 hover:bg-sky-300 px-3.5 py-2 font-heading text-xs font-bold text-slate-950 shadow-xs transition glow-cyan disabled:opacity-50 cursor-pointer"
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
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="font-mono text-xs font-bold uppercase text-emerald-400 hover:text-emerald-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <div>
              <p className="font-heading font-bold text-white">Unable to Load Beneficiary Data</p>
              <p className="mt-0.5 font-mono text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchLearnersList()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-mono font-semibold text-white transition hover:bg-rose-500 active:scale-95 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          VIEW SWITCHER: Phase 5 Placement vs Phase 4 Career vs Phase 3 Remediation vs Phase 2 Pipeline vs Candidate 360 Dossier
      ====================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-xl border border-[#1e293b] bg-[#070d18]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("impact")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "impact"
                ? "bg-indigo-500 text-slate-950 font-bold shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <TrendingUp size={14} className={viewMode === "impact" ? "text-slate-950" : "text-indigo-400"} />
            <span>Impact &amp; Optimization</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                viewMode === "impact" ? "bg-slate-950/20 text-slate-950" : "bg-indigo-500/10 text-indigo-400"
              }`}
            >
              Phase 7
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("intelligence")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "intelligence"
                ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-400/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <Compass size={14} className={viewMode === "intelligence" ? "text-slate-950" : "text-cyan-400"} />
            <span>Career Intelligence</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                viewMode === "intelligence" ? "bg-slate-950/20 text-slate-950" : "bg-cyan-500/10 text-cyan-400"
              }`}
            >
              Phase 6
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("placement")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "placement"
                ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <Activity size={14} className={viewMode === "placement" ? "text-slate-950" : "text-sky-400"} />
            <span>AI Placement &amp; ML Studio</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                viewMode === "placement" ? "bg-slate-950/20 text-slate-950" : "bg-sky-500/10 text-sky-400"
              }`}
            >
              Phase 5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("career")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "career"
                ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <Compass size={14} className={viewMode === "career" ? "text-slate-950" : "text-sky-400"} />
            <span>Career Journey &amp; Outcomes</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                viewMode === "career" ? "bg-slate-950/20 text-slate-950" : "bg-sky-500/10 text-sky-400"
              }`}
            >
              Phase 4
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("remediation")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "remediation"
                ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <BrainCircuit size={14} className={viewMode === "remediation" ? "text-slate-950" : "text-sky-400"} />
            <span>Adaptive Learning &amp; Remediation</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                viewMode === "remediation" ? "bg-slate-950/20 text-slate-950" : "bg-sky-500/10 text-sky-400"
              }`}
            >
              Phase 3 Loop
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("pipeline")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "pipeline"
                ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <Sparkles size={14} className={viewMode === "pipeline" ? "text-slate-950" : "text-sky-400"} />
            <span>Learner Pipeline (7 Stages)</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                viewMode === "pipeline" ? "bg-slate-950/20 text-slate-950" : "bg-sky-500/10 text-sky-400"
              }`}
            >
              Phase 2
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("dossier")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              viewMode === "dossier"
                ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0b1528]"
            }`}
          >
            <UserRound size={14} className={viewMode === "dossier" ? "text-slate-950" : "text-sky-400"} />
            <span>Candidate 360° Dossier</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                viewMode === "dossier" ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}
            >
              {totalLearners} Candidates
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 pr-3 font-mono text-[11px] text-slate-400">
          <BrainCircuit size={13} className="text-sky-400" />
          <span>BKT Updates · Career Outcomes · Calibrated XGBoost</span>
        </div>
      </div>

      {viewMode === "impact" ? (
        <div className="space-y-8">
          <ImpactProgress learnerId={selectedLearnerId} />
          <ImpactIntelligenceDashboard />
        </div>
      ) : viewMode === "intelligence" ? (
        <CareerIntelligenceCenter
          learnerId={selectedLearnerId}
          onNavigateAction={(action) => {
            if (action.action_type === "PRACTICE_DRILL" || action.action_type === "REASSESS") setViewMode("remediation");
            else if (action.action_type === "COMPLETE_PROJECT" || action.action_type === "APPLY_TO_ROLE") setViewMode("career");
            else setViewMode("pipeline");
          }}
        />
      ) : viewMode === "placement" ? (
        <div className="space-y-6">
          <AIPlacementPredictionCard
            learnerId={selectedLearnerId}
            onActionClick={(rec) => {
              if (rec.category === "PRACTICE_DRILL") setViewMode("remediation");
              else if (rec.category === "PROJECT" || rec.category === "APPLICATION") setViewMode("career");
              else setViewMode("pipeline");
            }}
          />
          <MLModelStudio onModelUpdated={fetchLearnersList} />
        </div>
      ) : viewMode === "career" ? (
        <CareerJourneyWorkspace onJourneyUpdated={fetchLearnersList} />
      ) : viewMode === "remediation" ? (
        <AdaptiveLearningWorkspace onProgressUpdated={fetchLearnersList} />
      ) : viewMode === "pipeline" ? (
        <LearnerPipelineWizard
          onProfileUpdated={fetchLearnersList}
          onOpenRemediation={() => setViewMode("remediation")}
        />
      ) : (
        <>
          {/* =====================================================
              2. COHORT SELECTOR & PAGINATED BROWSER
          ====================================================== */}
          <section className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-sky-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              National Beneficiary Registry ({totalLearners} Total):
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search candidate name, ID, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-[#1e293b] bg-[#070d18] pl-8 pr-3 font-sans text-xs text-slate-200 placeholder:text-slate-500 transition-all focus:border-sky-400 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  exportLearnersCSV(learnersList, debouncedSearch);
                  setActionSuccessMsg(`✅ Exported ${learnersList.length} candidate records to CSV.`);
                } catch (err) {
                  console.error("CSV Export failed:", err);
                  setError("Failed to export candidates CSV: " + (err?.message || "Unknown error"));
                }
              }}
              disabled={learnersList.length === 0}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white disabled:opacity-50 cursor-pointer"
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
                className="flex h-12 w-64 animate-pulse items-center gap-2.5 rounded-lg border border-[#1e293b] bg-[#070d18] p-2"
              >
                <div className="h-7 w-7 rounded-md bg-[#1e293b]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 rounded bg-[#1e293b]" />
                  <div className="h-2 w-32 rounded bg-[#1e293b]" />
                </div>
              </div>
            ))
          ) : learnersList.length === 0 ? (
            <div className="w-full py-6 text-center font-mono text-xs text-slate-400">
              No beneficiary records found matching "{searchQuery}".
            </div>
          ) : (
            learnersList.map((learner) => {
              const isSelected = learner.id === selectedLearnerId;
              const avatarGrad = getAvatarGradient(learner.full_name);
              const initials = getInitials(learner.full_name);

              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => handleSelectCandidate(learner.id)}
                  className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-sky-400 bg-[#0f1c33] text-white shadow-sm ring-1 ring-sky-400/40 glow-cyan"
                      : "border-[#1e293b] bg-[#070d18] text-slate-300 hover:border-slate-700 hover:bg-[#0b1528]"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold text-slate-950 bg-gradient-to-br ${avatarGrad}`}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[130px] truncate text-xs font-heading font-bold text-white">
                        {learner.full_name}
                      </span>
                      <span className="rounded border border-sky-400/20 bg-sky-500/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-sky-300">
                        {learner.employment_readiness_score}%
                      </span>
                    </div>
                    <p className="max-w-[170px] truncate font-mono text-[10px] text-slate-400">
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
          <div className="mt-3 flex items-center justify-between border-t border-[#1e293b] pt-2.5 font-mono text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} –{" "}
              {Math.min(currentPage * pageSize, totalLearners)} of {totalLearners} candidates
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || listLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1e293b] bg-[#070d18] hover:bg-[#0f1c33] disabled:opacity-40"
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-bold text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || listLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1e293b] bg-[#070d18] hover:bg-[#0f1c33] disabled:opacity-40"
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          3. SELECTED LEARNER 360° MASTER HEADER CARD
      ====================================================== */}
      <section className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 shadow-sm">
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
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold text-slate-950 shadow-md border border-sky-400/30 bg-gradient-to-br ${getAvatarGradient(
                  currentLearner.full_name
                )}`}
              >
                {getInitials(currentLearner.full_name)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {currentLearner.full_name}
                  </h2>
                  <StatusBadge variant={getStatusVariant(currentLearner.status)} size="sm" dot>
                    {currentLearner.status}
                  </StatusBadge>
                  {currentLearner.ncvet_credential_id && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                      <ShieldCheck size={12} />
                      NCVET Verified (Aadhaar Mock Adapter)
                    </span>
                  )}
                  {consentsList && consentsList.some((c) => c.granted) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/40 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-sky-300">
                      <ShieldCheck size={12} />
                      Consent-Based Tracking (DPDP-Aligned)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-400">
                      <Clock size={12} />
                      Consent Pending
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="font-mono font-bold text-sky-400">
                    ID: {currentLearner.id}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <GraduationCap size={13} className="text-slate-400" />
                    {currentLearner.education_level || "Vocational Studies"}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin size={13} className="text-slate-400" />
                    {currentLearner.district_name || currentLearner.district_id},{" "}
                    {currentLearner.state || "India"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-[#1e293b] bg-[#070d18] px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                    {currentLearner.nsqf_level || "NSQF Level 5"}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Training Center:{" "}
                    <strong className="text-white">
                      {currentLearner.training_info?.training_center_name ||
                        "PMKK Accredited Center"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Readiness & Progress Key Metrics */}
            <div className="flex flex-wrap items-center gap-6 border-t border-[#1e293b] pt-4 lg:border-t-0 lg:pt-0">
              <div className="text-center sm:text-right">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Employment Readiness
                </p>
                <div className="mt-0.5 flex items-baseline justify-center gap-1 sm:justify-end">
                  <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums text-sky-400">
                    {currentLearner.employment_readiness_score}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    /100
                  </span>
                </div>
                <span className="font-mono text-[10px] font-semibold text-emerald-400">
                  {currentLearner.employment_readiness_score >= 80
                    ? "High Market Fit"
                    : currentLearner.employment_readiness_score >= 60
                    ? "Moderate Readiness"
                    : "Remedial Track Required"}
                </span>
              </div>

              <div className="hidden h-10 w-px bg-[#1e293b] sm:block" />

              <div className="text-center sm:text-right">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Training Progress
                </p>
                <div className="mt-0.5 flex items-baseline justify-center gap-1 sm:justify-end">
                  <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
                    {currentLearner.overall_progress}%
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {currentLearner.training_info?.modules_completed || 8} Modules (
                  {currentLearner.training_info?.training_hours || "120 hrs"})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center font-mono text-xs text-slate-400">No candidate selected.</div>
        )}
      </section>

      {/* =====================================================
          4. LONGITUDINAL PLACEMENT & RETENTION TRACKING (3M/6M/12M)
      ====================================================== */}
      {currentLearner && activePlacement && (
        <section className="rounded-xl border border-sky-500/30 bg-[#0b1528] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-sky-400" />
                <h3 className="font-heading text-sm font-bold tracking-tight text-white">
                  Verified Placement &amp; Longitudinal Retention Checkpoints
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Tracking candidate joined date, starting vs current CTC, and 3M, 6M, 12M retention checkpoints (demonstrated via mock EPFO adapter).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/50 px-2.5 py-1 font-mono text-[11px] font-semibold text-sky-300">
                <ShieldCheck size={13} className="text-sky-400" />
                ⚡ Simulated Mock EPFO Adapter Active
              </span>
              {activePlacement.status !== "Separated" && permissions.canUpdateRetention && (
                <button
                  type="button"
                  onClick={() => setIsSeparationModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-800/70 bg-rose-950/50 px-2.5 py-1 font-mono text-[11px] font-semibold text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                >
                  <UserMinus size={12} />
                  Log Job Departure / Turnover
                </button>
              )}
            </div>
          </div>

          {/* Placement Primary Summary */}
          <div className="mt-4 grid gap-3 rounded-lg border border-[#1e293b] bg-[#070d18] p-3 text-xs sm:grid-cols-4">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase text-slate-500">Employer</span>
              <p className="mt-0.5 font-heading font-bold text-white">
                {activePlacement.employer_name || "Corporate Partner"}
              </p>
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase text-slate-500">Position / Role</span>
              <p className="mt-0.5 font-medium text-slate-200">
                {activePlacement.job_title}
              </p>
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase text-slate-500">Compensation</span>
              <p className="mt-0.5 font-mono font-bold text-emerald-400">
                ₹{activePlacement.starting_ctc_lpa} LPA Starting
                {activePlacement.current_ctc_lpa && activePlacement.current_ctc_lpa > activePlacement.starting_ctc_lpa && (
                  <span className="ml-1 text-[10px] text-slate-400">
                    (Now: ₹{activePlacement.current_ctc_lpa} LPA)
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase text-slate-500">EPFO UAN</span>
              <p className="mt-0.5 font-mono font-semibold text-sky-400">
                {maskIdentifier(activePlacement.uan)}
              </p>
            </div>
          </div>

          {/* 3M / 6M / 12M Checkpoint Cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(retentionAudit?.checkpoints || []).map((cp) => (
              <div
                key={cp.checkpoint_type}
                className="flex flex-col justify-between rounded-lg border border-[#1e293b] bg-[#070d18] p-3.5 text-xs transition hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-white">
                      {cp.checkpoint_type} Checkpoint ({cp.milestone_months * 30} Days)
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${
                        cp.is_active_at_checkpoint
                          ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-950/50 text-rose-300 border-rose-800/70"
                      }`}
                    >
                      {cp.is_active_at_checkpoint ? "Retained & Active" : "Stalled"}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 font-mono text-[11px]">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Milestone Date:</span>
                      <span className="text-slate-300">
                        {cp.checkpoint_date || "Calculated"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">EPFO Remittance:</span>
                      <span className="font-semibold text-emerald-400">
                        {cp.epfo_verified ? "✓ Verified (Mock)" : "Pending"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Wage Increment:</span>
                      <span className="font-bold text-sky-400">
                        +{cp.wage_increment_percentage || 0}%
                      </span>
                    </p>
                  </div>

                  {cp.remarks && (
                    <p className="mt-2 rounded border border-[#1e293b] bg-[#0b1528] p-1.5 font-mono text-[10px] text-slate-400">
                      {cp.remarks}
                    </p>
                  )}
                </div>

                {permissions.canUpdateRetention && (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckpointModal(cp)}
                    className="mt-3 w-full rounded-lg border border-[#1e293b] bg-[#0b1528] py-1 font-mono text-[11px] font-semibold text-slate-300 transition hover:bg-[#0f1c33] hover:text-white cursor-pointer"
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
          5. LONGITUDINAL OUTCOMES, FOLLOW-UPS & BOTTLENECKS
      ====================================================== */}
      {currentLearner && (
        <section className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1e293b] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                <h3 className="font-heading text-sm font-bold tracking-tight text-white">
                  Longitudinal Follow-Ups, Self-Employment &amp; Diagnostic Tracking
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                End-to-end post-training outcomes: Scheduled milestone surveys, entrepreneurship ventures, and non-placement root-cause diagnostics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScheduleFollowUpModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1.5 font-mono text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 cursor-pointer"
              >
                <Send size={12} /> Schedule Follow-Up
              </button>
              <button
                type="button"
                onClick={() => setIsSelfEmpModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 px-2.5 py-1.5 font-mono text-xs font-semibold text-purple-300 hover:bg-purple-900/50 cursor-pointer"
              >
                <Building2 size={12} /> Record Self-Employment
              </button>
              <button
                type="button"
                onClick={() => setIsNonPlacementModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1.5 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-900/50 cursor-pointer"
              >
                <AlertCircle size={12} /> Log Non-Placement Reason
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            {/* Card 1: Longitudinal Follow-Up Milestones */}
            <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                <span className="font-heading text-xs font-bold text-white">
                  Follow-Up Milestones ({followUpsList.length})
                </span>
                <span className="font-mono text-[10px] text-slate-500">30D / 90D / 180D / 365D</span>
              </div>

              <div className="mt-3 space-y-2.5">
                {followUpsList.length === 0 ? (
                  <p className="text-center py-4 font-mono text-xs text-slate-500">
                    No outreach follow-ups scheduled yet.
                  </p>
                ) : (
                  followUpsList.map((fu) => (
                    <div
                      key={fu.id}
                      className="rounded border border-[#1e293b] bg-[#0b1528] p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-white">
                          {fu.follow_up_type} Milestone
                        </span>
                        <StatusBadge
                          variant={
                            fu.status === "COMPLETED"
                              ? "success"
                              : fu.status === "SENT"
                              ? "info"
                              : fu.status === "SKIPPED"
                              ? "danger"
                              : "warning"
                          }
                          size="sm"
                        >
                          {fu.status}
                        </StatusBadge>
                      </div>
                      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span>Channel: {fu.channel}</span>
                        <span>{fu.scheduled_at?.split("T")[0]}</span>
                      </div>
                      {fu.response_status && (
                        <p className="mt-1 font-mono text-[11px] font-semibold text-emerald-400">
                          Outcome: {fu.response_status}
                        </p>
                      )}
                      {fu.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetFollowUpId(fu.id);
                            setIsRecordResponseModalOpen(true);
                          }}
                          className="mt-2 w-full rounded border border-[#1e293b] bg-[#070d18] py-1 font-mono text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-[#0f1c33] cursor-pointer"
                        >
                          Record Feedback / Response
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card 2: Self-Employment & Micro-Enterprises */}
            <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                <span className="font-heading text-xs font-bold text-white">
                  Micro-Enterprise Ventures ({selfEmpList.length})
                </span>
                <span className="font-mono text-[10px] text-slate-500">Field &amp; Document Verified</span>
              </div>

              <div className="mt-3 space-y-2.5">
                {selfEmpList.length === 0 ? (
                  <p className="text-center py-4 font-mono text-xs text-slate-500">
                    No self-employment records documented.
                  </p>
                ) : (
                  selfEmpList.map((se) => (
                    <div
                      key={se.id}
                      className="rounded border border-[#1e293b] bg-[#0b1528] p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-white truncate max-w-[150px]">
                          {se.enterprise_name}
                        </span>
                        <StatusBadge
                          variant={se.verification_status?.includes("VERIFIED") ? "success" : "neutral"}
                          size="sm"
                        >
                          {se.verification_status || "Reported"}
                        </StatusBadge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-300">
                        {se.business_activity} · {se.sector}
                      </p>
                      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span>Income: {se.monthly_income_range || "₹15,000 - ₹25,000"}</span>
                        <span>Since: {se.start_date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card 3: Non-Placement Diagnostic Bottlenecks */}
            <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                <span className="font-heading text-xs font-bold text-white">
                  Non-Placement Factors ({nonPlacementList.length})
                </span>
                <span className="font-mono text-[10px] text-slate-500">Diagnostic Root-Causes</span>
              </div>

              <div className="mt-3 space-y-2.5">
                {nonPlacementList.length === 0 ? (
                  <p className="text-center py-4 font-mono text-xs text-slate-500">
                    No non-placement bottlenecks documented.
                  </p>
                ) : (
                  nonPlacementList.map((np) => (
                    <div
                      key={np.id}
                      className="rounded border border-[#1e293b] bg-[#0b1528] p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400">
                          {np.reason}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {np.recorded_at?.split("T")[0]}
                        </span>
                      </div>
                      {np.associated_skill_code && (
                        <p className="mt-1 font-mono text-[10px] text-sky-400">
                          Competency: {np.associated_skill_code}
                        </p>
                      )}
                      {np.notes && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {np.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          6. THREE-COLUMN INTELLIGENCE BREAKDOWN
      ====================================================== */}
      {currentLearner && (
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Verified Skills Dossier */}
          <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5">
            <div>
              <SectionHeader
                title="Verified Competencies"
                subtitle="Skills assessed &amp; authenticated by accredited bodies"
                badge={
                  <StatusBadge variant="success" size="sm">
                    {(currentLearner.skills || []).length} Verified
                  </StatusBadge>
                }
              />

              <div className="mt-4 divide-y divide-[#1e293b]">
                {(currentLearner.skills || []).map((skill) => (
                  <div key={skill.code || skill.name} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        {skill.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-sky-400">
                        {skill.score_percentage}%
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#070d18]">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all"
                        style={{ width: `${skill.score_percentage}%` }}
                      />
                    </div>

                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>{skill.verified_by || "NCVET Accredited"}</span>
                      <span className="text-slate-400">
                        {skill.sector}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3 font-mono text-[11px] text-slate-400">
              <span>
                Credential ID:{" "}
                <span className="text-sky-400 font-bold">
                  {currentLearner.ncvet_credential_id || "NCVET-PENDING"}
                </span>
              </span>
            </div>
          </div>

          {/* Detected Skill Gaps & Deficits */}
          <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5">
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

              <div className="mt-4 divide-y divide-[#1e293b]">
                {(currentLearner.detected_gaps || []).map((gap) => (
                  <div key={gap.name} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading font-semibold text-white">
                        {gap.name}
                      </span>
                      <StatusBadge
                        variant={gap.level === "Critical" ? "danger" : "warning"}
                        size="sm"
                      >
                        {gap.level} Priority
                      </StatusBadge>
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                      <strong className="text-slate-200">Impact:</strong> {gap.impact}
                    </p>
                  </div>
                ))}

                {(!currentLearner.detected_gaps || currentLearner.detected_gaps.length === 0) && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-center text-xs text-emerald-300 font-mono">
                    <CheckCircle2
                      size={22}
                      className="mx-auto mb-1 text-emerald-400"
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
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] py-2 font-mono text-xs font-semibold text-slate-200 transition-colors hover:border-slate-700 hover:bg-[#0f1c33] cursor-pointer"
              >
                <BrainCircuit size={14} className="text-amber-400" />
                <span>Generate Targeted Bridge Module</span>
              </button>
            )}
          </div>

          {/* Longitudinal Career Timeline */}
          <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5">
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
                        <div className="absolute left-[11px] top-5 h-full w-px bg-[#1e293b]" />
                      )}

                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0b1528]">
                        {isCompleted ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            <CheckCircle2 size={13} />
                          </div>
                        ) : isCurrent ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-950 text-sky-400 border border-sky-400/40">
                            <Clock size={13} />
                          </div>
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-700 bg-[#070d18]" />
                        )}
                      </div>

                      <div className="min-w-0 pb-1.5">
                        <p className="font-heading text-xs font-semibold text-white">
                          {step.title}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">{step.date}</p>
                        {step.note && (
                          <p className="mt-0.5 text-[11px] leading-tight text-slate-400">
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[#1e293b] pt-2 font-mono text-[10px] text-slate-500">
              <span>Next Verification: 180-Day Retention Check</span>
              <span className="text-sky-400 font-semibold">EPFO Synced</span>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          7. BAYESIAN KNOWLEDGE TRACING (BKT) SKILL MASTERY & GAPS
      ====================================================== */}
      {currentLearner && (
        <BKTSkillMasteryCard
          learnerId={currentLearner.id}
          learnerName={currentLearner.full_name}
        />
      )}

      {/* =====================================================
          7.5. PHASE 5: CALIBRATED XGBOOST PLACEMENT PREDICTION
      ====================================================== */}
      {currentLearner && (
        <AIPlacementPredictionCard
          learnerId={currentLearner.id}
          onActionClick={(rec) => {
            if (rec.category === "PRACTICE_DRILL") setViewMode("remediation");
            else if (rec.category === "PROJECT" || rec.category === "APPLICATION") setViewMode("career");
            else setViewMode("pipeline");
          }}
        />
      )}

      {/* =====================================================
          8. AI SKILL INTELLIGENCE & PERSONALIZED ROADMAP (GEMINI)
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
            <div className="space-y-3 font-sans">
              <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3 text-xs">
                <p className="font-heading font-bold text-white">
                  {currentLearner.full_name}
                </p>
                <p className="text-slate-400">
                  Training Center: {currentLearner.training_info?.training_center_name || "PMKK Center"}
                </p>
                <p className="font-mono text-sky-400">
                  Credential ID: {currentLearner.ncvet_credential_id || "NCVET-2026-PENDING"}
                </p>
                <p className="mt-1 font-mono font-semibold text-emerald-400">
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
            <p className="text-xs text-slate-300">
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
              <div className="space-y-4 text-xs font-sans">
                <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 p-2.5 font-mono text-[11px] text-sky-300">
                  <strong>⚡ Simulated EPFO Verification Adapter:</strong> Remittance verified
                  against 12-digit UAN:{" "}
                  <span className="font-bold">{maskIdentifier(activePlacement?.uan)}</span>.
                </div>

                <div>
                  <label className="block font-semibold text-slate-300">
                    Employment Status at Milestone:
                  </label>
                  <div className="mt-1.5 flex gap-4 font-mono text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="active_status"
                        checked={checkpointActive === true}
                        onChange={() => setCheckpointActive(true)}
                      />
                      <span className="text-white">
                        Active &amp; Retained
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="active_status"
                        checked={checkpointActive === false}
                        onChange={() => setCheckpointActive(false)}
                      />
                      <span className="text-slate-400">
                        Inactive / Resigned
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300">
                    Current Milestone CTC (LPA ₹):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="25.0"
                    value={checkpointCTC}
                    onChange={(e) => setCheckpointCTC(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-[#1e293b] bg-[#070d18] px-2.5 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-slate-500">
                    Starting CTC: ₹{activePlacement?.starting_ctc_lpa} LPA
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300">
                    Milestone Audit Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={checkpointRemarks}
                    onChange={(e) => setCheckpointRemarks(e.target.value)}
                    placeholder="e.g. Verified 3-month continuous EPF contribution remittance from employer..."
                    className="mt-1 w-full rounded-md border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>
            </ActionModal>
          )}

          {/* Schedule Outcome Follow-Up Modal */}
          <ActionModal
            isOpen={isScheduleFollowUpModalOpen}
            onClose={() => setIsScheduleFollowUpModalOpen(false)}
            title="Schedule Longitudinal Outcome Milestone"
            subtitle={`Candidate: ${currentLearner.full_name} (${currentLearner.id})`}
            confirmText={actionLoading ? "Scheduling..." : "Schedule Milestone"}
            onConfirm={handleScheduleFollowUp}
          >
            <div className="space-y-3 text-xs font-sans">
              <div className="rounded border border-sky-500/30 bg-sky-950/40 p-2 font-mono text-[11px] text-sky-300">
                Outreach dispatch strictly verifies candidate active privacy consent before queuing.
              </div>
              <div>
                <label className="block font-semibold text-slate-300">
                  Milestone Window:
                </label>
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value)}
                  className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                >
                  <option value="30_DAY">30-Day Post-Training Outreach</option>
                  <option value="90_DAY">90-Day Retention Milestone</option>
                  <option value="180_DAY">180-Day Sustainability Audit</option>
                  <option value="365_DAY">365-Day Long-Term Impact Audit</option>
                  <option value="POST_TRAINING">Immediate Post-Certification</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300">
                  Primary Notification Channel:
                </label>
                <select
                  value={followUpChannel}
                  onChange={(e) => setFollowUpChannel(e.target.value)}
                  className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                >
                  <option value="IN_APP">In-App Candidate Portal Notice</option>
                  <option value="SMS">SMS / WhatsApp Gateway (Simulated Sandbox)</option>
                  <option value="EMAIL">Email Dispatch</option>
                  <option value="ASSISTED_CALL">Assisted Counselor Tele-Calling</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300">
                  Outreach Instructions / Notes:
                </label>
                <textarea
                  rows={2}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="e.g. Inquire about current employment offer letter or freelance contracts..."
                  className="mt-1 w-full rounded border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </ActionModal>

          {/* Record Follow-Up Response Modal */}
          <ActionModal
            isOpen={isRecordResponseModalOpen}
            onClose={() => setIsRecordResponseModalOpen(false)}
            title="Record Beneficiary Outcome Feedback"
            subtitle={`Candidate: ${currentLearner.full_name} (${currentLearner.id})`}
            confirmText={actionLoading ? "Recording..." : "Save Outcome"}
            onConfirm={handleRecordResponse}
          >
            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-300">
                  Reported Destination Status:
                </label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                  className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                >
                  <option value="EMPLOYED">Wage Employment (Full-Time / Corporate)</option>
                  <option value="SELF_EMPLOYED">Self-Employed / Independent Contractor</option>
                  <option value="APPRENTICESHIP">NAPS / Industry Apprenticeship</option>
                  <option value="UNEMPLOYED">Currently Seeking Employment</option>
                  <option value="FURTHER_EDUCATION">Enrolled in Higher Technical Education</option>
                  <option value="OTHER">Other / Family Obligation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300">
                  Verification Notes / Evidence Details:
                </label>
                <textarea
                  rows={2}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="e.g. Candidate confirmed employment at local auto assembly plant..."
                  className="mt-1 w-full rounded border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </ActionModal>

          {/* Record Self-Employment Modal */}
          <ActionModal
            isOpen={isSelfEmpModalOpen}
            onClose={() => setIsSelfEmpModalOpen(false)}
            title="Document Candidate Self-Employment Venture"
            subtitle={`Candidate: ${currentLearner.full_name} (${currentLearner.id})`}
            confirmText={actionLoading ? "Registering..." : "Register Micro-Enterprise"}
            onConfirm={handleCreateSelfEmployment}
          >
            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-300">
                  Venture / Enterprise Legal or Trade Name:
                </label>
                <input
                  type="text"
                  value={selfEmpName}
                  onChange={(e) => setSelfEmpName(e.target.value)}
                  placeholder="e.g. Sunrise Solar Services"
                  className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300">
                  Primary Commercial Activity / Trade:
                </label>
                <input
                  type="text"
                  value={selfEmpActivity}
                  onChange={(e) => setSelfEmpActivity(e.target.value)}
                  placeholder="e.g. Solar panel installation & rooftop maintenance"
                  className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <label className="block font-sans font-semibold text-slate-300">
                    Sector:
                  </label>
                  <select
                    value={selfEmpSector}
                    onChange={(e) => setSelfEmpSector(e.target.value)}
                    className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  >
                    <option value="Power & Clean Energy">Power &amp; Clean Energy</option>
                    <option value="Electronics & Hardware">Electronics &amp; Hardware</option>
                    <option value="Automotive & CNC">Automotive &amp; CNC</option>
                    <option value="Apparel & Handicrafts">Apparel &amp; Handicrafts</option>
                    <option value="IT Services & Kiosks">IT Services &amp; Kiosks</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans font-semibold text-slate-300">
                    Monthly Revenue Band:
                  </label>
                  <select
                    value={selfEmpIncome}
                    onChange={(e) => setSelfEmpIncome(e.target.value)}
                    className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  >
                    <option value="Below ₹10,000">Below ₹10,000</option>
                    <option value="₹10,000 - ₹20,000">₹10,000 - ₹20,000</option>
                    <option value="₹20,000 - ₹35,000">₹20,000 - ₹35,000</option>
                    <option value="Above ₹35,000">Above ₹35,000</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300">
                  MSME Udyam / Trade Notes:
                </label>
                <textarea
                  rows={2}
                  value={selfEmpNotes}
                  onChange={(e) => setSelfEmpNotes(e.target.value)}
                  placeholder="e.g. Registered with Udyam Registration Portal (UDYAM-UP-...). Physical workshop verified."
                  className="mt-1 w-full rounded border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </ActionModal>

          {/* Record Non-Placement Reason Modal */}
          <ActionModal
            isOpen={isNonPlacementModalOpen}
            onClose={() => setIsNonPlacementModalOpen(false)}
            title="Document Candidate Non-Placement Diagnostic"
            subtitle={`Candidate: ${currentLearner.full_name} (${currentLearner.id})`}
            confirmText={actionLoading ? "Documenting..." : "Log Diagnostic Bottleneck"}
            onConfirm={handleRecordNonPlacement}
          >
            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-300">
                  Diagnostic Bottleneck Category:
                </label>
                <select
                  value={nonPlacementReason}
                  onChange={(e) => setNonPlacementReason(e.target.value)}
                  className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                >
                  <option value="SKILL_GAP">Technical Competency Deficit (Skill Gap)</option>
                  <option value="INTERVIEW_FAILURE">Interview / Technical Screening Rejection</option>
                  <option value="LOCATION_CONSTRAINT">Geographic / Relocation Constraint</option>
                  <option value="SALARY_EXPECTATION">Compensation Expectations Mismatch</option>
                  <option value="COMMUNICATION_ISSUE">Soft-Skills &amp; Communication Deficit</option>
                  <option value="HEALTH_PERSONAL">Personal / Family Circumstances</option>
                  <option value="OTHER">Other Factor</option>
                </select>
              </div>

              {nonPlacementReason === "SKILL_GAP" && (
                <div>
                  <label className="block font-semibold text-slate-300">
                    Associated Competency Code:
                  </label>
                  <input
                    type="text"
                    value={nonPlacementSkillCode}
                    onChange={(e) => setNonPlacementSkillCode(e.target.value)}
                    placeholder="e.g. COMP-GENAI-01 or COMP-CNC-02"
                    className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-slate-500">
                    Enables targeted remedial bridge course generation.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300">
                  Counselor Observations / Notes:
                </label>
                <textarea
                  rows={2}
                  value={nonPlacementNotes}
                  onChange={(e) => setNonPlacementNotes(e.target.value)}
                  placeholder="e.g. Candidate struggled in technical live coding and cloud concepts..."
                  className="mt-1 w-full rounded border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </ActionModal>

          {/* Record Job Separation Modal */}
          {activePlacement && (
            <ActionModal
              isOpen={isSeparationModalOpen}
              onClose={() => setIsSeparationModalOpen(false)}
              title="Record Job Departure / Placement Separation"
              subtitle={`Candidate: ${currentLearner.full_name} · Employer: ${activePlacement.employer_name || "Partner"}`}
              confirmText={actionLoading ? "Recording..." : "Confirm Separation"}
              onConfirm={handleRecordSeparation}
            >
              <div className="space-y-3 text-xs font-sans">
                <div>
                  <label className="block font-semibold text-slate-300">
                    Primary Separation Driver:
                  </label>
                  <select
                    value={separationReason}
                    onChange={(e) => setSeparationReason(e.target.value)}
                    className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  >
                    <option value="BETTER_OPPORTUNITY">Career Advancement / Higher Compensation</option>
                    <option value="LOW_SALARY">Compensation Insufficiency</option>
                    <option value="RELOCATION">Relocation / Housing Challenge</option>
                    <option value="SKILL_MISMATCH">On-the-Job Skill Mismatch</option>
                    <option value="WORK_ENVIRONMENT">Work Environment / Shift Hours</option>
                    <option value="HEALTH_FAMILY">Health or Family Reason</option>
                    <option value="CONTRACT_EXPIRED">Apprenticeship / Contract Completion</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300">
                    Separation Date:
                  </label>
                  <input
                    type="date"
                    value={separationDate}
                    onChange={(e) => setSeparationDate(e.target.value)}
                    className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300">
                    Audit Notes / Exit Interview Details:
                  </label>
                  <textarea
                    rows={2}
                    value={separationNotes}
                    onChange={(e) => setSeparationNotes(e.target.value)}
                    placeholder="e.g. Beneficiary received higher wage offer from Tier-1 automotive supplier..."
                    className="mt-1 w-full rounded border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>
            </ActionModal>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
