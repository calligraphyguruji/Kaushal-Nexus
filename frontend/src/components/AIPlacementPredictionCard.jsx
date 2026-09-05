import React, { useState, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Target,
  Clock,
  BookOpen,
  Briefcase,
  Code2,
  FileText,
} from "lucide-react";
import { mlPlacementApi } from "../api/mlPlacement";
import { getErrorMessage } from "../api/client";

export default function AIPlacementPredictionCard({ learnerId = null, onActionClick = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);

  const fetchPrediction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (learnerId) {
        data = await mlPlacementApi.getLearnerPlacementPrediction(learnerId);
      } else {
        data = await mlPlacementApi.getMyPlacementPrediction();
      }
      setPrediction(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load AI placement prediction."));
    } finally {
      setLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0b1528]/80 p-8 text-center">
        <Loader2 size={32} className="mx-auto animate-spin text-sky-400 mb-3" />
        <p className="font-mono text-sm text-slate-300">Computing Calibrated Placement Prediction...</p>
        <p className="text-xs text-slate-500 mt-1">Reconstructing BKT latent knowledge state &amp; TreeSHAP margins</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-6 text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-400 shrink-0" />
          <div className="flex-1 text-sm font-medium">{error}</div>
          <button
            type="button"
            onClick={fetchPrediction}
            className="rounded-lg bg-rose-900/40 px-3 py-1.5 text-xs font-semibold hover:bg-rose-900/60"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const probPct = prediction.placement_probability_pct;
  const isHigh = probPct >= 70;
  const isMod = probPct >= 40 && probPct < 70;

  const tierBg = isHigh
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isMod
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-rose-500/10 text-rose-400 border-rose-500/30";

  const barColor = isHigh
    ? "from-emerald-500 to-teal-400"
    : isMod
    ? "from-amber-500 to-orange-400"
    : "from-rose-500 to-amber-500";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-gradient-to-b from-[#0b1528] to-[#070d18] p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1e293b] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <BrainCircuit size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">AI Placement Probability &amp; Readiness</h3>
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300">
                Phase 5 XGBoost
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calibrated gradient boosted model · {prediction.horizon_days}-day forward empirical horizon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPrediction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] text-xs text-slate-400 hover:text-slate-200 hover:bg-[#111e38] transition"
          >
            <RefreshCw size={13} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* Probability Gauge & Metrics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center p-5 rounded-xl border border-[#1e293b]/70 bg-[#070d18]">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl font-black text-slate-100 tracking-tight">
              {probPct.toFixed(1)}%
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${tierBg}`}>
              {isHigh ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {prediction.readiness_tier.replace("_", " ")}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`}
              style={{ width: `${Math.min(Math.max(probPct, 3), 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>0% (Developing)</span>
            <span>50% (Competitive)</span>
            <span>100% (High Offer)</span>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-[#1e293b] bg-[#0b1528]">
            <span className="text-[11px] text-slate-400 uppercase font-mono font-medium block">Cohort Percentile</span>
            <span className="text-lg font-bold text-sky-400 font-mono">Top {100 - Math.round(prediction.percentile_rank)}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{prediction.percentile_rank}th percentile</span>
          </div>

          <div className="p-3 rounded-lg border border-[#1e293b] bg-[#0b1528]">
            <span className="text-[11px] text-slate-400 uppercase font-mono font-medium block">Confidence Score</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{(prediction.confidence_score * 100).toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Isotonic Calibrated</span>
          </div>

          <div className="p-3 rounded-lg border border-[#1e293b] bg-[#0b1528] col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 uppercase font-mono font-medium block">Observation Window</span>
            <span className="text-lg font-bold text-indigo-400 font-mono">{prediction.horizon_days} Days</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Strict forward cutoff</span>
          </div>
        </div>
      </div>

      {/* Explainability Breakdown: Positive Drivers vs Risk Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Positive Strengths */}
        <div className="p-4 rounded-xl border border-emerald-950/40 bg-emerald-950/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <TrendingUp size={16} />
            <span>Key Strength Drivers (+ Impact)</span>
          </div>
          <div className="space-y-2">
            {prediction.top_positive_drivers.length > 0 ? (
              prediction.top_positive_drivers.map((d, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-[#070d18] border border-emerald-900/30 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{d.feature_name}</span>
                    <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{d.description}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 shrink-0">
                    +{d.contribution_pct}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No significant positive drivers identified yet.</p>
            )}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="p-4 rounded-xl border border-amber-950/40 bg-amber-950/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <TrendingDown size={16} />
            <span>Primary Placement Inhibitors (- Risk)</span>
          </div>
          <div className="space-y-2">
            {prediction.top_risk_factors.length > 0 ? (
              prediction.top_risk_factors.map((d, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-[#070d18] border border-amber-900/30 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{d.feature_name}</span>
                    <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{d.description}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 shrink-0">
                    {d.contribution_pct}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No critical risk inhibitors identified.</p>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Next Steps / Recommended Remediations */}
      {prediction.actionable_recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Sparkles size={16} />
            <span>Personalized Next Best Actions to Maximize Placement Odds</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {prediction.actionable_recommendations.map((rec, i) => {
              const boostPct = Math.round(rec.potential_probability_boost * 100);
              return (
                <div key={i} className="p-3.5 rounded-xl border border-[#1e293b] bg-[#070d18] flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-sky-500/10 text-sky-400">
                        {rec.category.replace("_", " ")}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                        +{boostPct}% Placement Boost
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-200">{rec.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{rec.description}</p>
                  </div>
                  {onActionClick && (
                    <button
                      type="button"
                      onClick={() => onActionClick(rec)}
                      className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                    >
                      <span>Take Action</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Raw Snapshot Inspection */}
      <div className="border-t border-[#1e293b] pt-4">
        <button
          type="button"
          onClick={() => setShowFeatures(!showFeatures)}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition"
        >
          {showFeatures ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{showFeatures ? "Hide" : "Inspect"} Point-in-Time Feature Snapshot ({Object.keys(prediction.feature_snapshot || {}).length} Features)</span>
        </button>

        {showFeatures && (
          <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto">
            <pre>{JSON.stringify(prediction.feature_snapshot, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Model Governance Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 font-mono border-t border-[#1e293b] pt-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>Model: {prediction.model_version}</span>
        </div>
        <div className="text-slate-500 italic max-w-md text-right">
          {prediction.disclaimer}
        </div>
      </div>
    </div>
  );
}
