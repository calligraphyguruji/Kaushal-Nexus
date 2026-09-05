import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Layers,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Target,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Filter,
} from 'lucide-react';
import {
  getProgramImpactScorecard,
  getCareerFunnel,
  getSkillBottlenecksAndCurriculum,
  getInterventionEffectiveness,
  getCohortImpactAnalytics,
  getImpactDataQuality,
} from '../api/impact';

export default function ImpactIntelligenceDashboard() {
  const [scorecard, setScorecard] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [skillsData, setSkillsData] = useState(null);
  const [interventionsData, setInterventionsData] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [cohortData, setCohortData] = useState(null);

  const [selectedDimension, setSelectedDimension] = useState('INSTITUTION');
  const [dimensionValue, setDimensionValue] = useState('');
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard', 'funnel', 'bottlenecks', 'interventions', 'cohort', 'quality'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sc, fn, sk, iv, dq, ch] = await Promise.all([
        getProgramImpactScorecard(),
        getCareerFunnel(),
        getSkillBottlenecksAndCurriculum(10),
        getInterventionEffectiveness(),
        getImpactDataQuality(),
        getCohortImpactAnalytics(selectedDimension, dimensionValue || null),
      ]);
      setScorecard(sc);
      setFunnel(fn);
      setSkillsData(sk);
      setInterventionsData(iv);
      setDataQuality(dq);
      setCohortData(ch);
    } catch (err) {
      console.error('Failed to load institutional impact intelligence:', err);
      setError('Failed to fetch impact intelligence data. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCohortFilter = async (dim, val) => {
    try {
      setSelectedDimension(dim);
      setDimensionValue(val);
      const res = await getCohortImpactAnalytics(dim, val || null);
      setCohortData(res);
    } catch (err) {
      console.error('Failed to filter cohort:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Synthesizing institutional impact intelligence...</p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-slate-200 font-semibold">{error || 'Unable to load impact scorecard'}</p>
        <button
          onClick={loadAll}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/90 border border-slate-800 p-5 rounded-2xl gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
              Phase 7 Impact Measurement
            </span>
            <span className="text-xs text-slate-400">
              Window: {scorecard.observation_period.start} → {scorecard.observation_period.end}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            Institutional Impact & Skilling Program Optimization
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Observational analysis of learner mastery gains, persistent competency bottlenecks,
            intervention effectiveness, and verified employment outcomes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {dataQuality && (
            <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="text-slate-400">Data Quality: </span>
                <span className="font-bold text-white">{dataQuality.overall_quality_score}%</span>
                <span className="text-[10px] text-emerald-400 ml-1">({dataQuality.quality_grade})</span>
              </div>
            </div>
          )}
          <button
            onClick={loadAll}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'scorecard', label: 'Program Scorecard' },
          { id: 'funnel', label: 'Career Outcome Funnel' },
          { id: 'bottlenecks', label: 'Skill Bottlenecks & Curriculum' },
          { id: 'interventions', label: 'Intervention Effectiveness' },
          { id: 'cohort', label: 'Cohort Comparison' },
          { id: 'quality', label: 'Data Quality Audit' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Institutional Program Scorecard */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Learners Served</span>
              <div className="text-2xl font-bold text-white mt-1">
                {scorecard.learners_served.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">Enrolled Candidates</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Diagnostic Assessment</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {scorecard.assessment_completion_pct}%
              </div>
              <span className="text-[11px] text-slate-400">Initial BKT Baseline</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Avg Mastery Gain</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                +{scorecard.average_mastery_gain.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">Empirical Delta (t₀ → t)</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Critical Gap Reduction</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {scorecard.critical_gap_reduction_pct}%
              </div>
              <span className="text-[11px] text-slate-400">Deficit Remediated</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Verified Placement</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {scorecard.verified_placement_pct}%
              </div>
              {scorecard.verified_placement_ci_95 ? (
                <span className="text-[11px] text-slate-400 font-mono">
                  95% CI: [{(scorecard.verified_placement_ci_95.lower * 100).toFixed(1)}% - {(scorecard.verified_placement_ci_95.upper * 100).toFixed(1)}%]
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Sample size &lt; 30</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Curriculum Completion</span>
              <div className="text-xl font-bold text-white">
                {scorecard.learning_completion_pct}%
              </div>
              <p className="text-[11px] text-slate-400">Module mastery across assigned learning plans</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Project Portfolio Completion</span>
              <div className="text-xl font-bold text-white">
                {scorecard.project_completion_pct}%
              </div>
              <p className="text-[11px] text-slate-400">Candidates with verified GitHub / live demo artifacts</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Interview Conversion Rate</span>
              <div className="text-xl font-bold text-white">
                {scorecard.interview_conversion_pct}%
              </div>
              <p className="text-[11px] text-slate-400">Candidates converting applications to interview rounds</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Career Outcome Funnel */}
      {activeTab === 'funnel' && funnel && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white text-sm">Longitudinal Conversion Funnel</h3>
                <p className="text-xs text-slate-400">
                  Tracking cohort progression across all 10 skilling-to-employment milestones
                </p>
              </div>
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-lg">
                Major Chokepoint: <strong>{funnel.largest_dropoff_stage}</strong> ({funnel.largest_dropoff_pct}% drop-off)
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {funnel.stages.map((stg, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {idx + 1}. {stg.stage_name}
                    </span>
                    <div className="space-x-3 text-slate-400">
                      <span>{stg.count} candidates</span>
                      <span className="text-slate-300 font-mono">
                        {stg.stage_conversion_rate}% of prev
                      </span>
                      <span className="text-indigo-400 font-mono font-semibold">
                        ({stg.overall_conversion_rate}% overall)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stg.is_major_dropoff
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.max(4, stg.overall_conversion_rate)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Skill Bottlenecks & Curriculum */}
      {activeTab === 'bottlenecks' && skillsData && (
        <div className="space-y-6">
          {/* Bottlenecks Table */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-semibold text-white text-sm">
              Ranked Competency Bottlenecks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Rank</th>
                    <th className="pb-2">Competency</th>
                    <th className="pb-2">Sector</th>
                    <th className="pb-2">Affected Learners</th>
                    <th className="pb-2">Avg Mastery</th>
                    <th className="pb-2">Avg Gap</th>
                    <th className="pb-2">Reassess Fail Rate</th>
                    <th className="pb-2">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {skillsData.bottlenecks.map((b) => (
                    <tr key={b.competency_id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-300">#{b.rank}</td>
                      <td className="py-2.5 font-semibold text-white">{b.competency_name}</td>
                      <td className="py-2.5 text-slate-400">{b.category}</td>
                      <td className="py-2.5 text-slate-300">
                        {b.affected_learner_count} ({b.affected_learner_pct}%)
                      </td>
                      <td className="py-2.5 text-slate-300">{(b.average_mastery * 100).toFixed(0)}%</td>
                      <td className="py-2.5 text-slate-300">{(b.average_gap * 100).toFixed(0)}%</td>
                      <td className="py-2.5 text-slate-300">{(b.reassessment_failure_rate * 100).toFixed(0)}%</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300'
                              : b.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {b.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Curriculum Optimization Recommendations */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-semibold text-white text-sm">
              Evidence-Backed Curriculum Action Items
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {skillsData.curriculum_recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">
                      {rec.competency_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rec.priority === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {rec.priority} PRIORITY
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {rec.recommended_action}
                  </p>
                  <div className="text-[11px] text-slate-400">
                    Issue Diagnosis: <span className="font-mono">{rec.issue}</span> ({rec.affected_learners} learners affected)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Intervention Effectiveness */}
      {activeTab === 'interventions' && interventionsData && (
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">
              Observed Effectiveness by Intervention Category
            </h3>
            <span className="text-xs text-slate-400">
              Overall Completion: {(interventionsData.overall_completion_rate * 100).toFixed(1)}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Intervention Type</th>
                  <th className="pb-2">Total Assigned</th>
                  <th className="pb-2">Completed</th>
                  <th className="pb-2">Completion Rate</th>
                  <th className="pb-2">Observed Δ Mastery</th>
                  <th className="pb-2">Observed Δ Gap Reduction</th>
                  <th className="pb-2">Evidence Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {interventionsData.interventions.map((iv) => (
                  <tr key={iv.intervention_type} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-semibold text-white">
                      {iv.intervention_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 text-slate-300">{iv.learners_count}</td>
                    <td className="py-2.5 text-slate-300">{iv.completed_count}</td>
                    <td className="py-2.5 text-slate-300">
                      {(iv.completion_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-emerald-400 font-semibold">
                      {iv.avg_mastery_delta !== null ? `+${(iv.avg_mastery_delta * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 text-indigo-400 font-semibold">
                      {iv.avg_gap_reduction !== null ? `-${(iv.avg_gap_reduction * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          iv.status === 'ROBUST'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : iv.status === 'PRELIMINARY'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {iv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Cohort Comparison & Small Cohort Suppression */}
      {activeTab === 'cohort' && cohortData && (
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Cohort Analytics & Privacy Protection
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated metrics with automatic suppression for small cohorts (&lt; 5 candidates)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedDimension}
                onChange={(e) => handleCohortFilter(e.target.value, dimensionValue)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5"
              >
                <option value="INSTITUTION">Institution</option>
                <option value="STATE">State</option>
                <option value="PROGRAM">All Program</option>
              </select>
              <input
                type="text"
                placeholder="Filter value..."
                value={dimensionValue}
                onChange={(e) => setDimensionValue(e.target.value)}
                onBlur={() => handleCohortFilter(selectedDimension, dimensionValue)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 w-36"
              />
            </div>
          </div>

          {cohortData.is_suppressed ? (
            <div className="p-8 bg-amber-950/20 border border-amber-800/40 rounded-xl text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="font-semibold text-amber-300 text-sm">Cohort Metrics Suppressed</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {cohortData.suppression_reason}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400">Learner Count</span>
                <div className="text-xl font-bold text-white mt-0.5">{cohortData.learner_count}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400">Current Mastery</span>
                <div className="text-xl font-bold text-indigo-400 mt-0.5">
                  {(cohortData.current_mastery * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400">Average Gain</span>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">
                  +{cohortData.average_mastery_gain.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400">Placement Rate</span>
                <div className="text-xl font-bold text-purple-400 mt-0.5">
                  {(cohortData.verified_placement_rate * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Data Quality Audit */}
      {activeTab === 'quality' && dataQuality && (
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Data Integrity & Verification Audit</h3>
            <span className="text-xs text-slate-400 font-mono">
              Version: {dataQuality.calculation_version}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Profile Completeness</span>
              <div className="text-2xl font-bold text-white">
                {dataQuality.profile_completeness_pct}%
              </div>
              <p className="text-[11px] text-slate-400">Candidates with complete role and location attributes</p>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Verification Coverage</span>
              <div className="text-2xl font-bold text-emerald-400">
                {dataQuality.outcome_verification_coverage_pct}%
              </div>
              <p className="text-[11px] text-slate-400">Outcomes audited via portal or EPFO registry</p>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Temporal Integrity</span>
              <div className="text-2xl font-bold text-indigo-400">
                {dataQuality.temporal_completeness_pct}%
              </div>
              <p className="text-[11px] text-slate-400">Records with validated UTC event timestamps</p>
            </div>
          </div>
        </div>
      )}

      {/* Observational & Causal Disclaimer Notice */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-400 flex items-start space-x-3">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-slate-300 font-medium">Methodological Disclaimer:</strong>{' '}
          {scorecard.causal_disclaimer}
        </p>
      </div>
    </div>
  );
}
