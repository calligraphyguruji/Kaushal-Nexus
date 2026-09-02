import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

import { regionalApi } from "../api/regional";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { exportDistrictDossierPDF } from "../utils/pdfExport";
import { exportDistrictsCSV } from "../utils/csvExport";
import { usePermissions } from "../hooks/usePermissions";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
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
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER & REGIONAL FILTERS
      ====================================================== */}
      <PageHeader
        badge="Geospatial Intelligence Engine"
        badgeVariant="indigo"
        title="Regional Skilling & Employment Intelligence"
        description="District-level monitoring of employment conversion, skill gap severity, employer concentration, and targeted regional intervention packages."
        breadcrumbs={["National Platform", "Regional Intelligence"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchRegionalData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Refresh live regional metrics from PostgreSQL"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
              <span>{isRefreshing ? "Syncing..." : "Sync Regional DB"}</span>
            </button>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="h-9 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
              className="group inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
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
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-semibold">Regional Connection Error</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchRegionalData()}
              className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700 active:scale-95"
            >
              Retry
            </button>
          </div>
        )
      )}

      {/* =====================================================
          1. REGIONAL KPI CARDS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-36 animate-pulse flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/80 dark:bg-slate-900"
            >
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Monitored Districts"
              value={districts.length.toString()}
              change={selectedState === "ALL" ? "Across 11 States" : selectedState}
              trend="up"
              period="geospatial coverage"
              subtitle={`${totalEnrolled.toLocaleString()} candidates registered`}
              highlight="PostgreSQL PostGIS Index"
              tone="info"
            />

            <StatCard
              title="Avg Placement Rate"
              value={`${avgPlacementRate}%`}
              change={`${totalPlaced.toLocaleString()} Placed`}
              trend="up"
              period="conversion rate"
              subtitle={`${totalCertified.toLocaleString()} NCVET certified`}
              highlight="Aadhaar-EPFO Linked"
              tone="success"
            />

            <StatCard
              title="Avg 6M Retention"
              value={`${avgRetentionRate}%`}
              change="180-Day Milestone"
              trend="up"
              period="EPFO verified"
              subtitle="Continuous contribution audit"
              highlight="Longitudinal Compliance"
              tone="warning"
            />

            <StatCard
              title="Avg Regional Divergence"
              value={`${avgDivergenceScore}%`}
              change="Demand vs Supply"
              trend="down"
              period="shortage delta"
              subtitle="Structural workforce spread"
              highlight="Intervention Priority"
              tone="info"
            />
          </>
        )}
      </section>

      {/* =====================================================
          2. DISTRICT PERFORMANCE TIERS & GEOSPATIAL MATRIX
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* District Performance Matrix Table (8 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <SectionHeader
              title="District-Wise Employment & Retention Matrix"
              subtitle="Longitudinal tracking across Tier 1, Tier 2, and Tier 3 district clusters"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Filter district or region..."
                      value={searchDistrict}
                      onChange={(e) => setSearchDistrict(e.target.value)}
                      className="h-8 w-44 rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 focus:border-blue-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:focus:bg-slate-800"
                    />
                  </div>

                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50/80 px-2 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200"
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
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500">
                    <th className="pb-3">District / Cluster</th>
                    <th className="pb-3 text-right">Enrolled</th>
                    <th className="pb-3 text-right">Placement Rate</th>
                    <th className="pb-3 text-right">6M Retention</th>
                    <th className="pb-3">Dominant Skill Deficit</th>
                    <th className="pb-3 text-right">Priority Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={6} className="py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        </td>
                      </tr>
                    ))
                  ) : filteredDistricts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        No district records found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDistricts.map((dist) => (
                      <tr
                        key={dist.district_id}
                        onClick={() => setSelectedDistrictModal(dist)}
                        className="cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        title="Click to view district analytical dossier"
                      >
                        <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400 dark:text-slate-500" />
                            <div>
                              <div>{dist.name}</div>
                              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                {dist.region} · {dist.state} ({dist.tier})
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                          {dist.total_enrolled.toLocaleString()}
                        </td>

                        <td className="py-3 text-right">
                          <span
                            className={`font-bold tabular-nums ${
                              dist.placement_rate >= 70
                                ? "text-emerald-700 dark:text-emerald-400"
                                : dist.placement_rate >= 40
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {dist.placement_rate}%
                          </span>
                        </td>

                        <td className="py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {dist.retention_rate}%
                        </td>

                        <td className="py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Showing {filteredDistricts.length} active districts in view</span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Click district row for full dossier
            </span>
          </div>
        </div>

        {/* Regional Skill Demand vs Supply Divergence (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <SectionHeader
              title="Regional Demand Divergence"
              subtitle="Comparison of local employer demand vs trained candidate supply (PostgreSQL)"
            />

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 py-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))
              ) : districts.slice(0, 5).map((item) => (
                <div key={item.district_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                    <span className="font-bold tabular-nums text-rose-700 dark:text-rose-400">
                      {item.divergence_score}% Deficit
                    </span>
                  </div>

                  {/* Dual Bar: Demand vs Supply */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Employer Demand</span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {item.employer_demand_index}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all dark:bg-blue-600"
                        style={{ width: `${Math.min(100, item.employer_demand_index)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Trained Supply</span>
                      <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                        {item.workforce_supply_index}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-400 transition-all dark:bg-slate-600"
                        style={{ width: `${Math.min(100, item.workforce_supply_index)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-blue-200/80 bg-blue-50/70 p-2.5 text-center text-xs font-medium text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            Automated divergence tracking across {districts.length} active districts.
          </div>
        </div>
      </section>

      {/* =====================================================
          3. PRIORITY DISTRICT INTERVENTION DOSSIERS
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
                className="flex h-52 animate-pulse flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-16 w-full rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))
          ) : priorityClusters.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No critical priority clusters identified for the selected state/tier.
            </div>
          ) : (
            priorityClusters.slice(0, 3).map((item) => (
              <div
                key={item.district_id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={15} className="text-rose-600 dark:text-rose-400" />
                      <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {item.district_name}
                      </h3>
                    </div>
                    <StatusBadge variant="danger" size="sm" dot>
                      Rank #{item.rank}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/60 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/30">
                    <p className="text-[11px] font-semibold text-rose-900 dark:text-rose-300">
                      Vulnerability Score: {item.composite_priority_score}/100
                    </p>
                    <div className="mt-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Demand Deficit:</span>
                      <span className="font-bold tabular-nums text-rose-700 dark:text-rose-400">
                        {item.divergence_score}% ({item.learners_at_risk} candidates affected)
                      </span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    <strong>Primary Bottleneck:</strong>{" "}
                    {item.key_bottlenecks?.[0] || "Supply lag in core industrial specializations."}
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <strong>Recommendation:</strong>{" "}
                    {item.recommended_interventions?.[0] ||
                      "Deploy 40-hour bridge curriculum package with PMKK center upgrade."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    {item.state} ({item.region})
                  </span>
                  <ArrowUpRight size={13} className="text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =====================================================
          4. REGIONAL AI POLICY ENGINE
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-slate-500 dark:text-slate-400">Beneficiaries Enrolled</span>
                <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {selectedDistrictModal.total_enrolled.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-slate-500 dark:text-slate-400">Employment Conversion</span>
                <p className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-400">
                  {selectedDistrictModal.placement_rate}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-slate-500 dark:text-slate-400">6-Month Retention</span>
                <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {selectedDistrictModal.retention_rate}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-slate-500 dark:text-slate-400">Active PMKK Centers</span>
                <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {selectedDistrictModal.active_training_centers_count} Centers
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              <strong>Dominant Deficits:</strong>{" "}
              {selectedDistrictModal.dominant_skill_gaps?.join(", ") ||
                "No critical deficit detected."}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              Employer Demand:{" "}
              <strong className="text-slate-900 dark:text-white">
                {selectedDistrictModal.employer_demand_index}%
              </strong>{" "}
              · Workforce Supply:{" "}
              <strong className="text-slate-900 dark:text-white">
                {selectedDistrictModal.workforce_supply_index}%
              </strong>{" "}
              · Divergence Spread:{" "}
              <strong className="text-rose-700 dark:text-rose-400">
                {selectedDistrictModal.divergence_score}%
              </strong>
            </div>
          </div>
        )}
      </ActionModal>
    </div>
  );
}