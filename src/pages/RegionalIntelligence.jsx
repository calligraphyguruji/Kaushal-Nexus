import { useState } from "react";
import {
  MapPin,
  ArrowUpRight,
  Search,
} from "lucide-react";

import {
  regionalStats,
  districtPerformance,
  skillDemand,
  priorityDistricts,
} from "../data/regionalData";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";

export default function RegionalIntelligence() {
  const [selectedRegion, setSelectedRegion] = useState("Uttar Pradesh (All 42 Districts)");
  const [selectedTier, setSelectedTier] = useState("All Tiers");
  const [searchDistrict, setSearchDistrict] = useState("");
  const [selectedDistrictModal, setSelectedDistrictModal] = useState(null);

  const filteredDistricts = districtPerformance.filter((d) => {
    const matchesSearch =
      d.district.toLowerCase().includes(searchDistrict.toLowerCase()) ||
      d.region.toLowerCase().includes(searchDistrict.toLowerCase()) ||
      d.topSector.toLowerCase().includes(searchDistrict.toLowerCase());
    const matchesTier =
      selectedTier === "All Tiers" || d.tier.includes(selectedTier);
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <PageHeader
        badge="Geospatial Intelligence Engine"
        badgeVariant="indigo"
        title="Regional Skilling & Employment Intelligence"
        description="District-level monitoring of employment conversion, skill gap severity, employer concentration, and targeted regional intervention packages."
        breadcrumbs={["National Platform", "Regional Intelligence"]}
        actions={
          <div className="flex items-center gap-2.5">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="h-9 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-400 focus:outline-none"
            >
              <option value="Uttar Pradesh (All 42 Districts)">Uttar Pradesh (42 Districts)</option>
              <option value="National Aggregate">National Summary</option>
            </select>
          </div>
        }
      />

      {/* =====================================================
          1. REGIONAL KPI CARDS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {regionalStats.map((stat, idx) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            period={stat.period}
            subtitle={stat.subtitle}
            highlight={stat.highlight}
            tone={idx === 2 ? "warning" : idx === 1 ? "success" : "info"}
          />
        ))}
      </section>

      {/* =====================================================
          2. DISTRICT PERFORMANCE TIERS & GEOSPATIAL MATRIX
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* District Performance Matrix Table (8 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="District-Wise Employment & Retention Matrix"
              subtitle="Longitudinal tracking across Tier 1, Tier 2, and Tier 3 district clusters"
              actions={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Filter district..."
                      value={searchDistrict}
                      onChange={(e) => setSearchDistrict(e.target.value)}
                      className="h-8 w-40 rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 focus:border-blue-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50/80 px-2 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="All Tiers">All Tiers</option>
                    <option value="Tier 1">Tier 1 (&gt; 75%)</option>
                    <option value="Tier 2">Tier 2 (65–75%)</option>
                    <option value="Tier 3">Tier 3 (&lt; 65%)</option>
                  </select>
                </div>
              }
            />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">District / Cluster</th>
                    <th className="pb-3 text-right">Beneficiaries</th>
                    <th className="pb-3 text-right">Placement Rate</th>
                    <th className="pb-3 text-right">6M Retention</th>
                    <th className="pb-3">Dominant Skill Deficit</th>
                    <th className="pb-3 text-right">Status Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDistricts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        No district records found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDistricts.map((dist) => (
                      <tr
                        key={dist.district}
                        onClick={() => setSelectedDistrictModal(dist)}
                        className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            <div>
                              <div>{dist.district}</div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {dist.region} · {dist.topSector}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-right font-medium text-slate-700 tabular-nums">
                          {dist.learners.toLocaleString()}
                        </td>

                        <td className="py-3 text-right">
                          <span
                            className={`font-bold tabular-nums ${
                              dist.employment >= 74
                                ? "text-emerald-700"
                                : dist.employment >= 65
                                ? "text-blue-700"
                                : "text-rose-700"
                            }`}
                          >
                            {dist.employment}%
                          </span>
                        </td>

                        <td className="py-3 text-right font-semibold text-slate-800 tabular-nums">
                          {dist.retention6M}%
                        </td>

                        <td className="py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {dist.dominantGap}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <StatusBadge
                            variant={
                              dist.priority === "Low"
                                ? "success"
                                : dist.priority === "Medium"
                                ? "info"
                                : "danger"
                            }
                            size="sm"
                          >
                            {dist.priority === "High" ? "Priority Area" : dist.priority === "Medium" ? "Emerging" : "Optimal"}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing {filteredDistricts.length} active districts</span>
            <span className="font-semibold text-blue-700">Click district row for full dossier</span>
          </div>
        </div>

        {/* Regional Skill Demand vs Supply Divergence (4 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Regional Demand Divergence"
              subtitle="Comparison of local employer demand vs trained candidate supply"
            />

            <div className="mt-4 divide-y divide-slate-100">
              {skillDemand.map((item) => (
                <div key={item.skill} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.skill}</span>
                    <span className="font-bold text-rose-700 tabular-nums">{item.delta}% Deficit</span>
                  </div>

                  {/* Dual Bar: Demand vs Supply */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Employer Demand</span>
                      <span className="font-bold text-slate-900 tabular-nums">{item.demand}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${item.demand}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                      <span>Trained Supply</span>
                      <span className="font-semibold text-slate-600 tabular-nums">{item.supply}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${item.supply}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50/70 border border-blue-200/80 p-2.5 text-xs text-blue-950 font-medium text-center">
            Cloud & Analytics demand exceeds local trained supply by 2.4x.
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
              3 Targeted Clusters
            </StatusBadge>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          {priorityDistricts.map((item) => (
            <div
              key={item.district}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-rose-600" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {item.district}
                    </h3>
                  </div>
                  <StatusBadge variant="danger" size="sm" dot>
                    High Priority
                  </StatusBadge>
                </div>

                <div className="mt-3 rounded-lg bg-rose-50/60 border border-rose-100 p-2.5">
                  <p className="text-[11px] font-semibold text-rose-900">{item.issue}</p>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className="text-slate-600">{item.metricLabel}:</span>
                    <span className="font-bold text-rose-700 tabular-nums">
                      {item.metricValue} (Target: {item.targetValue})
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
                  <strong>Root Cause:</strong> {item.rootCause}
                </p>

                <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                  <strong>Recommendation:</strong> {item.recommendation}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-700">
                  {item.actionStatus}
                </span>
                <ArrowUpRight size={13} className="text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          4. REGIONAL AI POLICY ENGINE
      ====================================================== */}
      <IntelligenceCard
        category="Regional Resource Allocation"
        title="Deploy Eastern UP Skilling Corridor Package"
        description="Data models show that re-allocating ₹2.4 Cr in infrastructure grants to Varanasi and Gorakhpur advanced analytics labs will lift regional employment conversion from 61.2% to 74.5% within 180 days."
        confidence="97.8% Spatial Simulation Confidence"
        sampleSize="7 Districts · 12,400 Beneficiaries"
        actionText="Review Corridor Proposal"
        onAction={() => alert("Regional Skilling Corridor Proposal opened for review.")}
      />

      {/* =====================================================
          DISTRICT DETAIL ACTION MODAL
      ====================================================== */}
      <ActionModal
        isOpen={!!selectedDistrictModal}
        onClose={() => setSelectedDistrictModal(null)}
        title={selectedDistrictModal ? `District Dossier: ${selectedDistrictModal.district}` : "District Detail"}
        subtitle={selectedDistrictModal ? `${selectedDistrictModal.region} · ${selectedDistrictModal.tier}` : ""}
        confirmText="Download District Report"
        onConfirm={() => {
          alert(`District analytical dossier for ${selectedDistrictModal?.district} downloaded.`);
        }}
      >
        {selectedDistrictModal && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Beneficiaries Tracked</span>
                <p className="text-sm font-bold text-slate-900 tabular-nums">{selectedDistrictModal.learners.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Employment Conversion</span>
                <p className="text-sm font-bold text-blue-700 tabular-nums">{selectedDistrictModal.employment}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">6-Month Retention</span>
                <p className="text-sm font-bold text-emerald-700 tabular-nums">{selectedDistrictModal.retention6M}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Active Hiring Partners</span>
                <p className="text-sm font-bold text-slate-900 tabular-nums">{selectedDistrictModal.employersActive}</p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-xs border border-blue-200 text-blue-900">
              <strong>Dominant Deficit:</strong> {selectedDistrictModal.dominantGap} in {selectedDistrictModal.topSector}.
            </div>
          </div>
        )}
      </ActionModal>
    </div>
  );
}