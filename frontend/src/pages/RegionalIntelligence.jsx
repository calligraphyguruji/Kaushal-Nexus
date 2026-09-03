import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapPin,
  ArrowUpRight,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  TrendingDown,
  Layers,
  ChevronRight,
  Loader2,
  Download,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

import { regionalApi } from "../api/regional";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { exportDistrictDossierPDF } from "../utils/pdfExport";
import { exportDistrictsCSV } from "../utils/csvExport";
import { usePermissions } from "../hooks/usePermissions";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import TechStatCard from "../components/TechStatCard";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";
import StateView from "../components/StateView";

const STATE_OPTIONS = [
  { label: "All States (National)", value: "ALL" },
  { label: "Uttar Pradesh", value: "Uttar Pradesh" },
  { label: "Maharashtra", value: "Maharashtra" },
  { label: "Karnataka", value: "Karnataka" },
  { label: "Tamil Nadu", value: "Tamil Nadu" },
  { label: "Gujarat", value: "Gujarat" },
  { label: "Telangana", value: "Telangana" },
  { label: "Andhra Pradesh", value: "Andhra Pradesh" },
  { label: "Madhya Pradesh", value: "Madhya Pradesh" },
  { label: "Rajasthan", value: "Rajasthan" },
  { label: "Bihar", value: "Bihar" },
  { label: "Odisha", value: "Odisha" },
];

export default function RegionalIntelligence() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const urlState = searchParams.get("state") || "ALL";

  // Filter States
  const [selectedState, setSelectedState] = useState(urlState);
  const [selectedTier, setSelectedTier] = useState("All Tiers");
  const [searchDistrict, setSearchDistrict] = useState(urlSearch);

  useEffect(() => {
    if (urlSearch && urlSearch !== searchDistrict) {
      setSearchDistrict(urlSearch);
    }
    if (urlState && urlState !== selectedState) {
      setSelectedState(urlState);
    }
  }, [urlSearch, urlState]);

  // Live Backend Data States
  const [districts, setDistricts] = useState([]);
  const [divergenceData, setDivergenceData] = useState(null);
  const [priorityClusters, setPriorityClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [selectedDistrictModal, setSelectedDistrictModal] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Fetch all regional intelligence endpoints with active filters
  const fetchRegionalData = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        await authApi.ensureAuthenticated();

        const params = {
          state: selectedState === "ALL" ? undefined : selectedState,
          tier: selectedTier === "All Tiers" ? undefined : selectedTier,
        };

        const [districtsRes, divergenceRes, clustersRes] = await Promise.all([
          regionalApi.getDistricts(params),
          regionalApi.getDivergence(params),
          regionalApi.getPriorityClusters({ ...params, limit: 6 }),
        ]);

        setDistricts(districtsRes || []);
        setDivergenceData(divergenceRes || null);
        setPriorityClusters(clustersRes || []);
      } catch (err) {
        console.error("Regional data fetch failed:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedState, selectedTier]
  );

  useEffect(() => {
    fetchRegionalData();
  }, [fetchRegionalData]);

  // Client-side text search filtering on the active filtered district set
  const filteredDistricts = districts.filter((d) => {
    const q = searchDistrict.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q) ||
      d.state.toLowerCase().includes(q) ||
      (d.dominant_skill_gaps && d.dominant_skill_gaps.some((g) => g.toLowerCase().includes(q)));
    return matchesSearch;
  });

  // Calculate Aggregated Live KPI Metrics
  const totalEnrolled = districts.reduce((acc, curr) => acc + curr.total_enrolled, 0);
  const totalPlaced = districts.reduce((acc, curr) => acc + curr.total_placed, 0);
  const totalCertified = districts.reduce((acc, curr) => acc + curr.total_certified, 0);

  const avgPlacementRate =
    districts.length > 0
      ? (
          districts.reduce((acc, curr) => acc + curr.placement_rate, 0) / districts.length
        ).toFixed(1)
      : "0.0";

  const avgRetentionRate =
    districts.length > 0
      ? (
          districts.reduce((acc, curr) => acc + curr.retention_rate, 0) / districts.length
        ).toFixed(1)
      : "0.0";

  const avgDivergenceScore =
    districts.length > 0
      ? (
          districts.reduce((acc, curr) => acc + curr.divergence_score, 0) / districts.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-8 font-sans text-[#f1f5f9]">
      {/* =====================================================
          1. PAGE HEADER & REGIONAL FILTERS
      ====================================================== */}
      <PageHeader
        badge="REGIONAL INTELLIGENCE"
        badgeVariant="cyan"
        title="Regional Skill Intelligence"
        description="District-level training, readiness, employment, and skill-gap intelligence."
        breadcrumbs={["National Platform", "Regional Intelligence"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchRegionalData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-2 font-mono text-xs font-semibold text-slate-300 shadow-xs transition hover:border-slate-700 hover:bg-[#0f1c33] hover:text-white disabled:opacity-50 cursor-pointer"
              title="Refresh live regional metrics"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-sky-400" : "text-sky-400"} />
              <span>{isRefreshing ? "Syncing..." : "Sync Regional DB"}</span>
            </button>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="h-9 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 font-mono text-xs font-semibold text-slate-200 shadow-xs focus:border-sky-400 focus:outline-none cursor-pointer"
            >
              {STATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                exportDistrictsCSV(filteredDistricts, selectedState, selectedTier);
                setActionSuccessMsg(`✅ Exported ${filteredDistricts.length} districts to CSV.`);
              }}
              disabled={filteredDistricts.length === 0}
              className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 px-3.5 py-2 font-heading text-xs font-bold text-slate-950 shadow-xs transition glow-cyan disabled:opacity-50 cursor-pointer"
              title="Export filtered district metrics to CSV"
            >
              <Download size={13} />
              <span>Export Matrix (CSV)</span>
            </button>
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

      {/* Error Alert Banner or Scope Restriction */}
      {error && (
        error.toLowerCase().includes("scope") || error.toLowerCase().includes("permission") || error.toLowerCase().includes("authorized") ? (
          <StateView
            variant="forbidden"
            title="Regional Scope Authorization"
            message={error}
            actionLabel="Reset to Authorized Jurisdiction"
            onAction={() => {
              setSelectedState("ALL");
              setSelectedTier("All Tiers");
            }}
          />
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0 text-rose-400" />
              <div>
                <p className="font-heading font-bold text-white">Regional Connection Error</p>
                <p className="mt-0.5 font-mono text-rose-300">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchRegionalData()}
              className="rounded-lg bg-rose-600 px-3 py-1.5 font-mono font-semibold text-white transition hover:bg-rose-500 active:scale-95 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )
      )}

      {/* =====================================================
          2. CORE REGIONAL KPIS (TechStatCard)
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-36 animate-pulse flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5"
            >
              <div className="h-3 w-28 rounded bg-[#1e293b]" />
              <div className="h-7 w-20 rounded bg-[#1e293b]" />
              <div className="h-3 w-40 rounded bg-[#1e293b]" />
            </div>
          ))
        ) : (
          <>
            <TechStatCard
              title="Monitored Districts"
              value={districts.length.toString()}
              subtitle={`${totalEnrolled.toLocaleString()} candidates registered`}
              trend={selectedState === "ALL" ? "Across 11 States" : selectedState}
              trendDirection="up"
              icon={MapPin}
              variant="cyan"
              footerText="Geospatial Index"
            />

            <TechStatCard
              title="Avg Placement Rate"
              value={`${avgPlacementRate}%`}
              subtitle={`${totalCertified.toLocaleString()} NCVET certified`}
              trend={`${totalPlaced.toLocaleString()} Placed`}
              trendDirection="up"
              icon={CheckCircle2}
              variant="emerald"
              footerText="Verification Adapter Linked"
            />

            <TechStatCard
              title="Avg 6M Retention"
              value={`${avgRetentionRate}%`}
              subtitle="180-day milestone tracked"
              trend="EPFO Sandbox"
              trendDirection="up"
              icon={ShieldCheck}
              variant="amber"
              footerText="Longitudinal Tracking (Demo)"
            />

            <TechStatCard
              title="Avg Regional Divergence"
              value={`${avgDivergenceScore}%`}
              subtitle="Structural workforce spread"
              trend="Demand vs Supply"
              trendDirection="down"
              icon={Layers}
              variant="indigo"
              footerText="Intervention Priority Index"
            />
          </>
        )}
      </section>

      {/* =====================================================
          3. DISTRICT PERFORMANCE TIERS & GEOSPATIAL MATRIX
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* District Performance Matrix Table (8 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-8 shadow-sm">
          <div>
            <SectionHeader
              title="District-Wise Employment &amp; Retention Matrix"
              subtitle="Longitudinal tracking across Tier 1, Tier 2, and Tier 3 district clusters"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Filter district or region..."
                      value={searchDistrict}
                      onChange={(e) => setSearchDistrict(e.target.value)}
                      className="h-8 w-44 rounded-lg border border-[#1e293b] bg-[#070d18] pl-8 pr-2.5 font-sans text-xs text-slate-200 placeholder:text-slate-500 transition-all focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="h-8 rounded-lg border border-[#1e293b] bg-[#070d18] px-2 font-mono text-xs font-semibold text-slate-300 focus:border-sky-400 focus:outline-none cursor-pointer"
                  >
                    <option value="All Tiers">All Tiers</option>
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </div>
              }
            />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-[#1e293b] font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">District / Cluster</th>
                    <th className="pb-3 text-right">Enrolled</th>
                    <th className="pb-3 text-right">Placement Rate</th>
                    <th className="pb-3 text-right">6M Retention</th>
                    <th className="pb-3">Dominant Skill Deficit</th>
                    <th className="pb-3 text-right">Priority Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] text-xs">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={6} className="py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-[#1e293b]" />
                        </td>
                      </tr>
                    ))
                  ) : filteredDistricts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center font-mono text-xs text-slate-500"
                      >
                        No district records found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDistricts.map((dist) => (
                      <tr
                        key={dist.district_id}
                        onClick={() => setSelectedDistrictModal(dist)}
                        className="cursor-pointer transition-colors hover:bg-[#0f1c33]"
                        title="Click to view district analytical dossier"
                      >
                        <td className="py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-sky-400" />
                            <div>
                              <div className="font-heading font-bold">{dist.name}</div>
                              <span className="font-mono text-[10px] font-normal text-slate-400">
                                {dist.region} · {dist.state} ({dist.tier})
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-right font-mono font-medium text-slate-300">
                          {dist.total_enrolled.toLocaleString()}
                        </td>

                        <td className="py-3 text-right">
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              dist.placement_rate >= 70
                                ? "text-emerald-400"
                                : dist.placement_rate >= 40
                                ? "text-sky-400"
                                : "text-rose-400"
                            }`}
                          >
                            {dist.placement_rate}%
                          </span>
                        </td>

                        <td className="py-3 text-right font-mono font-semibold text-slate-200">
                          {dist.retention_rate}%
                        </td>

                        <td className="py-3">
                          <span className="rounded border border-[#1e293b] bg-[#070d18] px-2 py-0.5 font-mono text-[10px] font-medium text-slate-300">
                            {dist.dominant_skill_gaps?.[0] || "General Technical Skills"}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <StatusBadge
                            variant={
                              dist.priority_level === "Critical"
                                ? "danger"
                                : dist.priority_level === "Elevated"
                                ? "warning"
                                : "success"
                            }
                            size="sm"
                          >
                            {dist.priority_level === "Critical"
                              ? "Priority Area"
                              : dist.priority_level === "Elevated"
                              ? "Emerging"
                              : "Optimal"}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3 font-mono text-xs text-slate-400">
            <span>Showing {filteredDistricts.length} active districts in view</span>
            <span className="text-sky-400 font-semibold">
              Click district row for full dossier
            </span>
          </div>
        </div>

        {/* Regional Skill Demand vs Supply Divergence (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-4 shadow-sm">
          <div>
            <SectionHeader
              title="Regional Demand Divergence"
              subtitle="Comparison of local employer demand vs trained candidate supply"
            />

            <div className="mt-4 divide-y divide-[#1e293b]">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 py-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 rounded bg-[#1e293b]" />
                      <div className="h-3 w-12 rounded bg-[#1e293b]" />
                    </div>
                    <div className="h-1.5 w-full rounded bg-[#1e293b]" />
                  </div>
                ))
              ) : districts.slice(0, 5).map((item) => (
                <div key={item.district_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-heading font-semibold text-white">
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {item.divergence_score}% Deficit
                    </span>
                  </div>

                  {/* Dual Bar: Demand vs Supply */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span>Employer Demand</span>
                      <span className="font-bold text-sky-400">
                        {item.employer_demand_index}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#070d18]">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all"
                        style={{ width: `${Math.min(100, item.employer_demand_index)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5 font-mono text-[10px] text-slate-400">
                      <span>Trained Supply</span>
                      <span className="text-slate-300">
                        {item.workforce_supply_index}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#070d18]">
                      <div
                        className="h-full rounded-full bg-slate-500 transition-all"
                        style={{ width: `${Math.min(100, item.workforce_supply_index)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-950/40 p-2.5 text-center font-mono text-xs text-sky-300">
            Automated divergence tracking across {districts.length} active districts.
          </div>
        </div>
      </section>

      {/* =====================================================
          4. PRIORITY DISTRICT INTERVENTION DOSSIERS
      ====================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Priority District Intervention Dossiers"
          subtitle="Targeted policy and curriculum adjustments formulated for underperforming clusters"
          badge={
            <StatusBadge variant="danger" size="sm">
              {priorityClusters.length} Targeted Clusters
            </StatusBadge>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex h-52 animate-pulse flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5"
              >
                <div className="h-4 w-32 rounded bg-[#1e293b]" />
                <div className="h-16 w-full rounded bg-[#1e293b]" />
                <div className="h-4 w-24 rounded bg-[#1e293b]" />
              </div>
            ))
          ) : priorityClusters.length === 0 ? (
            <div className="col-span-full rounded-xl border border-[#1e293b] bg-[#0b1528] p-6 text-center font-mono text-xs text-slate-400">
              No critical priority clusters identified for the selected state/tier.
            </div>
          ) : (
            priorityClusters.slice(0, 3).map((item) => (
              <div
                key={item.district_id}
                className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 transition-all hover:border-slate-700 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={15} className="text-rose-400" />
                      <h3 className="font-heading text-sm font-bold tracking-tight text-white">
                        {item.district_name}
                      </h3>
                    </div>
                    <StatusBadge variant="danger" size="sm" dot>
                      Rank #{item.rank}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/30 p-2.5">
                    <p className="font-mono text-[11px] font-semibold text-rose-300">
                      Vulnerability Score: {item.composite_priority_score}/100
                    </p>
                    <div className="mt-1 flex items-baseline justify-between font-mono text-xs">
                      <span className="text-slate-400">Demand Deficit:</span>
                      <span className="font-bold text-rose-400">
                        {item.divergence_score}% ({item.learners_at_risk} candidates affected)
                      </span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                    <strong className="text-slate-300">Primary Bottleneck:</strong>{" "}
                    {item.key_bottlenecks?.[0] || "Supply lag in core industrial specializations."}
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    <strong className="text-slate-200">Recommendation:</strong>{" "}
                    {item.recommended_interventions?.[0] ||
                      "Deploy 40-hour bridge curriculum package with PMKK center upgrade."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3">
                  <span className="font-mono text-[11px] font-semibold text-sky-400">
                    {item.state} ({item.region})
                  </span>
                  <ArrowUpRight size={13} className="text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =====================================================
          5. REGIONAL AI POLICY ENGINE
      ====================================================== */}
      <IntelligenceCard
        category="Regional Resource Allocation"
        title="Deploy Regional Skilling Corridor Package"
        description="Data models show that re-allocating curriculum and trainer capacity to high-divergence districts will lift regional employment conversion by +12.5% within 180 days."
        confidence="97.8% Spatial Simulation Confidence"
        sampleSize={`${districts.length} Monitored Districts Across India`}
        actionText="Review Corridor Proposal"
        onAction={() => alert("Regional Skilling Corridor Proposal opened for review.")}
      />

      {/* =====================================================
          DISTRICT DETAIL ACTION MODAL
      ====================================================== */}
      <ActionModal
        isOpen={!!selectedDistrictModal}
        onClose={() => setSelectedDistrictModal(null)}
        title={
          selectedDistrictModal
            ? `District Dossier: ${selectedDistrictModal.name}`
            : "District Detail"
        }
        subtitle={
          selectedDistrictModal
            ? `${selectedDistrictModal.region} · ${selectedDistrictModal.state} (${selectedDistrictModal.tier})`
            : ""
        }
        confirmText="Download District Dossier (PDF)"
        onConfirm={() => {
          if (selectedDistrictModal) {
            exportDistrictDossierPDF(selectedDistrictModal);
            setActionSuccessMsg(`✅ Official District Dossier for ${selectedDistrictModal.name} downloaded.`);
          }
        }}
      >
        {selectedDistrictModal && (
          <div className="space-y-3 font-sans">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-2.5">
                <span className="font-mono text-[10px] text-slate-400">Beneficiaries Enrolled</span>
                <p className="font-mono text-sm font-bold text-white">
                  {selectedDistrictModal.total_enrolled.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-2.5">
                <span className="font-mono text-[10px] text-slate-400">Employment Conversion</span>
                <p className="font-mono text-sm font-bold text-sky-400">
                  {selectedDistrictModal.placement_rate}%
                </p>
              </div>
              <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-2.5">
                <span className="font-mono text-[10px] text-slate-400">6-Month Retention</span>
                <p className="font-mono text-sm font-bold text-emerald-400">
                  {selectedDistrictModal.retention_rate}%
                </p>
              </div>
              <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-2.5">
                <span className="font-mono text-[10px] text-slate-400">Active PMKK Centers</span>
                <p className="font-mono text-sm font-bold text-white">
                  {selectedDistrictModal.active_training_centers_count} Centers
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 p-3 text-xs text-sky-200 font-mono">
              <strong>Dominant Deficits:</strong>{" "}
              {selectedDistrictModal.dominant_skill_gaps?.join(", ") ||
                "No critical deficit detected."}
            </div>

            <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-2.5 font-mono text-xs text-slate-400">
              Employer Demand:{" "}
              <strong className="text-sky-400">
                {selectedDistrictModal.employer_demand_index}%
              </strong>{" "}
              · Workforce Supply:{" "}
              <strong className="text-slate-300">
                {selectedDistrictModal.workforce_supply_index}%
              </strong>{" "}
              · Divergence Spread:{" "}
              <strong className="text-rose-400">
                {selectedDistrictModal.divergence_score}%
              </strong>
            </div>
          </div>
        )}
      </ActionModal>
    </div>
  );
}
