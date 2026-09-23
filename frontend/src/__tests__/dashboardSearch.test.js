import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { regionalApi } from '../api/regional.js';
import { programPerformance, schemeBreakdown } from '../data/dashboardData.js';

describe('Overview & Impact Dashboard Search & Filtering Suite', () => {
  describe('1. regionalApi.getDistricts Offline Fallback Query Filtering', () => {
    it('should filter districts by search keyword in district name', async () => {
      const results = await regionalApi.getDistricts({ search: 'Varanasi' });
      assert.ok(Array.isArray(results), 'Expected results to be an array');
      assert.ok(results.length >= 1, 'Expected at least one matching district');
      assert.ok(
        results.every((d) => d.name.toLowerCase().includes('varanasi') || d.region.toLowerCase().includes('varanasi')),
        'All returned districts must match query'
      );
    });

    it('should filter districts case-insensitively', async () => {
      const results = await regionalApi.getDistricts({ district: 'kAnPuR' });
      assert.ok(results.length >= 1, 'Expected match for mixed-case query');
      assert.ok(results.some((d) => d.name.toLowerCase().includes('kanpur')));
    });

    it('should filter districts by regional tier', async () => {
      const tier1Results = await regionalApi.getDistricts({ tier: 'Tier 1' });
      assert.ok(tier1Results.length > 0, 'Expected Tier 1 districts');
      assert.ok(tier1Results.every((d) => d.tier.includes('Tier 1')), 'All returned districts must be Tier 1');
    });

    it('should return empty array for non-matching search query', async () => {
      const results = await regionalApi.getDistricts({ search: 'NonExistentDistrictXYZ' });
      assert.strictEqual(results.length, 0, 'Expected zero matching districts');
    });
  });

  describe('2. Sector & Scheme Discovery for Global & In-Page Search', () => {
    it('should find matching programs and sectors for technology queries', () => {
      const query = 'tech';
      const matched = programPerformance.filter(
        (p) => p.name.toLowerCase().includes(query) || p.sector.toLowerCase().includes(query)
      );
      assert.ok(matched.length >= 1, 'Expected at least one technology program/sector match');
      assert.ok(
        matched.some((p) => p.sector.toLowerCase().includes('tech') || p.name.toLowerCase().includes('tech'))
      );
    });

    it('should find national schemes matching scheme queries like PMKVY', () => {
      const query = 'pmkvy';
      const matched = schemeBreakdown.filter((s) => s.scheme.toLowerCase().includes(query));
      assert.strictEqual(matched.length, 1);
      assert.strictEqual(matched[0].scheme, 'PMKVY 4.0');
    });

    it('should categorize demand tiers accurately based on placement rate benchmarks', () => {
      const sectorsWithTiers = programPerformance.map((p) => {
        const rate = p.employment;
        const tier = rate >= 50 ? 'High Placement' : rate >= 30 ? 'Expanding Demand' : 'Intervention Targeted';
        return { name: p.name, rate, tier };
      });

      const highPlacement = sectorsWithTiers.filter((s) => s.tier === 'High Placement');
      assert.ok(highPlacement.length > 0, 'Expected high placement programs');
      assert.ok(highPlacement.every((s) => s.rate >= 50));
    });
  });
});
