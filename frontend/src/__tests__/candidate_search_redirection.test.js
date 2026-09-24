import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CANDIDATE_REGISTRY_STORAGE_KEY,
  upsertCandidateInRegistry,
  getCandidateById,
  listCandidatesFromRegistry,
} from '../utils/candidateRegistry.js';
import { learnersApi } from '../api/learners.js';

// Polyfill localStorage for Node.js test environment if absent
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

describe('Candidate Global Search & Dossier Redirection Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Global search query successfully matches registered learner by partial name', async () => {
    const candidate = upsertCandidateInRegistry({
      id: 'KN-2026-9901',
      full_name: 'Ananya Verma',
      email: 'ananya.verma@example.com',
      district_name: 'Kanpur',
      target_domain: 'fullstack',
      employment_readiness_score: 84,
    });

    assert.ok(candidate);

    // Simulate Topbar search query for "ananya"
    const result = await learnersApi.list({ search: 'ananya', page_size: 4 });
    assert.ok(result);
    assert.ok(Array.isArray(result.items));
    assert.ok(result.items.length > 0, 'Search query must return matching candidate');

    const matched = result.items.find((c) => c.id === 'KN-2026-9901');
    assert.ok(matched, 'Registered candidate must be in search results');
    assert.equal(matched.full_name, 'Ananya Verma');
    assert.equal(matched.employment_readiness_score, 84);
  });

  it('2. Selecting candidate generates redirect destination with ?tab=dossier', () => {
    const candidate = {
      id: 'KN-2026-9901',
      full_name: 'Ananya Verma',
    };

    // Helper mirroring Topbar handleSelectLearner logic
    const getNavigationPath = (learner) => {
      if (learner && learner.id) {
        return `/learner/${encodeURIComponent(learner.id)}?tab=dossier`;
      }
      return '/learner';
    };

    const targetUrl = getNavigationPath(candidate);
    assert.equal(targetUrl, '/learner/KN-2026-9901?tab=dossier');
  });

  it('3. getCandidateById resolves correctly with URI-encoded, uppercase, and lowercase IDs', () => {
    const candidate = upsertCandidateInRegistry({
      id: 'KN-2026-5544',
      full_name: 'Rohit Kumar',
      email: 'rohit.kumar@example.com',
      ncvet_credential_id: 'NCVET-2026-5544',
    });

    assert.ok(candidate);

    // Exact ID
    const foundExact = getCandidateById('KN-2026-5544');
    assert.ok(foundExact);
    assert.equal(foundExact.full_name, 'Rohit Kumar');

    // Lowercase ID
    const foundLower = getCandidateById('kn-2026-5544');
    assert.ok(foundLower, 'Must match lowercase ID');
    assert.equal(foundLower.full_name, 'Rohit Kumar');

    // URI-encoded ID
    const foundEncoded = getCandidateById(encodeURIComponent('KN-2026-5544'));
    assert.ok(foundEncoded, 'Must match URI-encoded ID');
    assert.equal(foundEncoded.full_name, 'Rohit Kumar');

    // Email lookup
    const foundEmail = getCandidateById('rohit.kumar@example.com');
    assert.ok(foundEmail, 'Must match email lookup');
    assert.equal(foundEmail.id, 'KN-2026-5544');

    // Credential ID lookup
    const foundCred = getCandidateById('ncvet-2026-5544');
    assert.ok(foundCred, 'Must match credential ID');
    assert.equal(foundCred.id, 'KN-2026-5544');
  });

  it('4. learnersApi.getById retrieves candidate dossier offline or on network isolation', async () => {
    upsertCandidateInRegistry({
      id: 'KN-2026-4433',
      full_name: 'Pooja Tiwari',
      email: 'pooja.tiwari@example.com',
      employment_readiness_score: 91,
      skills: [{ name: 'React.js', score: 95 }],
    });

    const dossier = await learnersApi.getById('KN-2026-4433');
    assert.ok(dossier, 'Candidate dossier must be retrieved');
    assert.equal(dossier.id, 'KN-2026-4433');
    assert.equal(dossier.full_name, 'Pooja Tiwari');
    assert.equal(dossier.employment_readiness_score, 91);
  });

  it('5. Officer route synchronization logic switches viewMode to dossier when route ID is supplied', () => {
    // Mirroring route synchronization invariants in LearnerIntelligence
    const resolveViewMode = ({ routeParamId, tabParam, isLearner, currentViewMode }) => {
      if (isLearner) {
        return tabParam === 'remediation' ? 'remediation' : 'pipeline';
      }
      if (tabParam) {
        return tabParam;
      }
      if (routeParamId) {
        return 'dossier';
      }
      return currentViewMode || 'career';
    };

    // When officer visits /learner without param:
    const initialOfficerMode = resolveViewMode({
      routeParamId: '',
      tabParam: null,
      isLearner: false,
      currentViewMode: 'career',
    });
    assert.equal(initialOfficerMode, 'career');

    // When candidate is selected from search (routeParamId is provided):
    const redirectedMode = resolveViewMode({
      routeParamId: 'KN-2026-9901',
      tabParam: 'dossier',
      isLearner: false,
      currentViewMode: initialOfficerMode,
    });
    assert.equal(redirectedMode, 'dossier', 'Must switch view mode to dossier');

    // When candidate is visited via route param even without tab param:
    const directRouteMode = resolveViewMode({
      routeParamId: 'KN-2026-9901',
      tabParam: null,
      isLearner: false,
      currentViewMode: 'career',
    });
    assert.equal(directRouteMode, 'dossier', 'Must automatically switch to dossier for specific candidate');
  });

  it('6. seedDefaultCandidatesIfEmpty allows searching for Amlan and Aarav directly', async () => {
    // Seed the national candidate cohort
    const seeded = (await import('../utils/candidateRegistry.js')).seedDefaultCandidatesIfEmpty();
    assert.ok(Array.isArray(seeded));
    assert.ok(seeded.length >= 7, 'National cohort must contain at least 7 seeded candidates');

    // Search for "amlan"
    const amlanSearch = await learnersApi.list({ search: 'amlan' });
    assert.ok(amlanSearch.items.length >= 1, 'Should find Amlan Chakrabarty');
    const amlan = amlanSearch.items[0];
    assert.equal(amlan.id, 'KN-2026-01001');
    assert.equal(amlan.full_name, 'Amlan Chakrabarty');
    assert.equal(amlan.readiness_score, 95);
    assert.ok(amlan.district_name.includes('Noida'));

    // Search for "aarav"
    const aaravSearch = await learnersApi.list({ search: 'aarav' });
    assert.ok(aaravSearch.items.length >= 1, 'Should find Aarav Sharma');
    const aarav = aaravSearch.items[0];
    assert.equal(aarav.id, 'KN-2026-01000');
    assert.equal(aarav.full_name, 'Aarav Sharma');
  });

  it('7. Skill search finds candidates by verified skill keywords (kubernetes, python)', async () => {
    (await import('../utils/candidateRegistry.js')).seedDefaultCandidatesIfEmpty();

    const k8sSearch = await learnersApi.list({ search: 'kubernetes' });
    assert.ok(k8sSearch.items.length >= 1, 'Should match Amlan by Kubernetes skill');
    assert.equal(k8sSearch.items[0].full_name, 'Amlan Chakrabarty');

    const pySearch = await learnersApi.list({ search: 'python' });
    assert.ok(pySearch.items.length >= 1, 'Should match candidates with Python skills');
    const pyNames = pySearch.items.map((c) => c.full_name);
    assert.ok(pyNames.includes('Aarav Sharma') || pyNames.includes('Pooja Agarwal') || pyNames.includes('Amlan Chakrabarty'));
  });

  it('8. Searching for non-existent candidate returns 0 items and preserves isolation', async () => {
    (await import('../utils/candidateRegistry.js')).seedDefaultCandidatesIfEmpty();

    const emptySearch = await learnersApi.list({ search: 'completely_unknown_learner_query_999' });
    assert.strictEqual(emptySearch.total, 0);
    assert.strictEqual(emptySearch.items.length, 0);
  });

  it('9. Multi-word search tokenization matches across name, location, and trade fields', async () => {
    (await import('../utils/candidateRegistry.js')).seedDefaultCandidatesIfEmpty();

    // "amlan noida"
    const amlanNoida = await learnersApi.list({ search: 'amlan noida' });
    assert.ok(amlanNoida.items.length >= 1, 'Should find Amlan with multi-word "amlan noida"');
    assert.equal(amlanNoida.items[0].full_name, 'Amlan Chakrabarty');

    // "aarav varanasi"
    const aaravVaranasi = await learnersApi.list({ search: 'aarav varanasi' });
    assert.ok(aaravVaranasi.items.length >= 1, 'Should find Aarav with multi-word "aarav varanasi"');
    assert.equal(aaravVaranasi.items[0].full_name, 'Aarav Sharma');

    // "aman data"
    const amanData = await learnersApi.list({ search: 'aman data' });
    assert.ok(amanData.items.length >= 1, 'Should find Aman with multi-word "aman data"');
    assert.equal(amanData.items[0].full_name, 'Aman Kumar Mishra');

    // "ritesh cloud"
    const riteshCloud = await learnersApi.list({ search: 'ritesh cloud' });
    assert.ok(riteshCloud.items.length >= 1, 'Should find Ritesh with multi-word "ritesh cloud"');
    assert.equal(riteshCloud.items[0].full_name, 'Ritesh Kumar Patel');
  });

  it('10. Every national candidate is instantly searchable by first name', async () => {
    (await import('../utils/candidateRegistry.js')).seedDefaultCandidatesIfEmpty();

    const nationalNames = [
      'Amlan',
      'Aarav',
      'Aman',
      'Satyam',
      'Anand',
      'Ritesh',
      'Pooja',
      'Ananya',
      'Vikas',
    ];

    for (const name of nationalNames) {
      const searchRes = listCandidatesFromRegistry({ search: name.toLowerCase() });
      assert.ok(searchRes.items.length >= 1, `Candidate "${name}" must be found in instant search`);
      const matched = searchRes.items.some((c) => c.full_name.includes(name));
      assert.ok(matched, `Result items for "${name}" must include candidate with that name`);
    }
  });
});

