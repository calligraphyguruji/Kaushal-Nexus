import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Target,
  Sparkles,
  Info,
  Check,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  getMyImpact,
  getMyEarlyWarnings,
  getMyInterventions,
  updateMyInterventionStatus,
} from '../api/impact';

export default function ImpactProgress({ learnerId }) {
  const [impactData, setImpactData] = useState(null);
  const [earlyWarnings, setEarlyWarnings] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [impactRes, warningsRes, intervRes] = await Promise.all([
        getMyImpact(),
        getMyEarlyWarnings(),
        getMyInterventions(),
      ]);
      setImpactData(impactRes);
      setEarlyWarnings(warningsRes);
      setInterventions(intervRes);
    } catch (err) {
      console.error('Failed to load learner impact data:', err);
      setError('Unable to load impact progression data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [learnerId]);

  const handleStatusUpdate = async (interventionId, newStatus) => {
    try {
      setUpdatingId(interventionId);
      await updateMyInterventionStatus(interventionId, { status: newStatus });
      await fetchData();
    } catch (err) {
      console.error('Failed to update intervention status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Computing longitudinal skill progression...</p>
      </div>
    );
  }

  if (error || !impactData) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-800/40 rounded-xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-slate-200 font-semibold">{error || 'Data unavailable'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    initial_mastery,
    current_mastery,
    mastery_delta,
    initial_gap,
    current_gap,
    gap_reduction,
    learning_hours,
    modules_completed,
    projects_completed,
    applications_submitted,
    interviews_scheduled,
    offers_received,
    placement_status,
    observation_days,
    timeline_events,
    disclaimer,
  } = impactData;

  const riskBadgeStyles = {
    HEALTHY: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
    NEEDS_SUPPORT: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
    AT_RISK: 'bg-red-950/40 text-red-300 border-red-800/50',
  };

  const statusColors = {
    PLACED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    IN_PROCESS: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    SEEKING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/80 border border-slate-800 p-5 rounded-2xl gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
              Phase 7 Intelligence
            </span>
            <span className="text-xs text-slate-400">
              Observed over {observation_days} day{observation_days !== 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            Skill Progression & Career Impact
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              statusColors[placement_status] || 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            ● {placement_status.replace('_', ' ')}
          </span>
          {earlyWarnings && (
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                riskBadgeStyles[earlyWarnings.risk_level] || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Academic Status: {earlyWarnings.risk_level.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* 4-Column Stat Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Skill Mastery Growth */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>BKT Skill Mastery</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white">
              {(current_mastery * 100).toFixed(0)}%
            </div>
            <div
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                mastery_delta >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {mastery_delta >= 0 ? `+${(mastery_delta * 100).toFixed(1)}%` : `${(mastery_delta * 100).toFixed(1)}%`}
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Baseline: {(initial_mastery * 100).toFixed(0)}% at enrollment
          </p>
        </div>

        {/* Metric 2: Skill Gap Reduction */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Target Skill Gap</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white">
              {(current_gap * 100).toFixed(0)}%
            </div>
            <div className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
              -{(gap_reduction * 100).toFixed(1)}% Deficit
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Initial Gap: {(initial_gap * 100).toFixed(0)}% across target role
          </p>
        </div>

        {/* Metric 3: Learning Engagement */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Learning Effort</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white">
              {learning_hours} <span className="text-xs font-normal text-slate-400">hrs</span>
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {modules_completed} Modules
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {projects_completed} Verified Project Artifact{projects_completed !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Metric 4: Career Velocity */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Career Conversion</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white">
              {applications_submitted}
            </div>
            <div className="text-xs text-slate-300">
              {interviews_scheduled} Interviews · {offers_received} Offers
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Active application pipeline milestones
          </p>
        </div>
      </div>

      {/* Early Warning Signal Box (if active) */}
      {earlyWarnings && earlyWarnings.risks.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-800/40 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white text-sm">
                Proactive Mentoring Guidance
              </h3>
            </div>
            <span className="text-xs text-amber-300/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
              Non-Punitive Academic Support
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {earlyWarnings.risks.map((risk, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {risk.risk_type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      risk.severity === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {risk.evidence}
                </p>
                <div className="text-xs text-indigo-300 font-medium pt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {risk.recommended_intervention}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Grid: Milestone Timeline & Interventions Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestone Timeline */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Progression Timeline & Milestones
          </h3>

          <div className="space-y-3 relative pl-4 border-l-2 border-slate-800">
            {timeline_events.map((evt, idx) => (
              <div key={idx} className="relative group space-y-1">
                <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-indigo-400"></div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{evt.title}</span>
                  <span className="text-slate-400">{evt.date}</span>
                </div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                  {evt.stage}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Interventions Queue */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Intervention Action Queue
            </h3>
            <span className="text-xs text-slate-400">
              {interventions.filter((i) => i.status !== 'COMPLETED').length} Active
            </span>
          </div>

          {interventions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              No active interventions assigned. Complete diagnostic assessments to receive tailored drills.
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.slice(0, 5).map((interv) => (
                <div
                  key={interv.id}
                  className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">
                        {interv.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {interv.intervention_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {interv.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {interv.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                      <span>Est: {interv.estimated_hours} hr(s)</span>
                      {interv.baseline_mastery !== null && (
                        <span>
                          Prior Mastery: {(interv.baseline_mastery * 100).toFixed(0)}%
                        </span>
                      )}
                      {interv.status === 'COMPLETED' && interv.mastery_delta !== null && (
                        <span className="text-emerald-400 font-semibold">
                          Δ +{(interv.mastery_delta * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {interv.status === 'RECOMMENDED' && (
                      <button
                        onClick={() => handleStatusUpdate(interv.id, 'IN_PROGRESS')}
                        disabled={updatingId === interv.id}
                        className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-medium rounded-lg flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}
                    {interv.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusUpdate(interv.id, 'COMPLETED')}
                        disabled={updatingId === interv.id}
                        className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs font-medium rounded-lg flex items-center gap-1 transition"
                      >
                        <Check className="w-3 h-3" />
                        Complete
                      </button>
                    )}
                    {interv.status === 'COMPLETED' && (
                      <span className="px-2.5 py-1 bg-emerald-950/40 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-800/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Done
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Methodological / Legal Disclaimer Notice */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-400 flex items-start space-x-3">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-slate-300 font-medium">Methodological Notice:</strong> {disclaimer}
        </p>
      </div>
    </div>
  );
}
