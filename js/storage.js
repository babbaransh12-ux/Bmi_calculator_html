/* ─────────────────────────────────────────────
   BioMetric Pro Storage Module
   Multi-user profile management via localStorage
   ───────────────────────────────────────────── */
window.BMI = window.BMI || {};

BMI.Storage = (() => {
  const PREFIX = 'biometricpro_';

  function set(key, val)  { try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch(e) {} }
  function get(key, def)  { try { const r = localStorage.getItem(PREFIX + key); return r !== null ? JSON.parse(r) : def; } catch(e) { return def; } }
  function remove(key)    { localStorage.removeItem(PREFIX + key); }

  /* ── Profile management ── */
  function getProfiles()  { return get('profiles', []); }
  function saveProfiles(p){ set('profiles', p); }

  function getCurrentProfileId() { return get('current_profile', null); }
  function setCurrentProfileId(id){ set('current_profile', id); }

  function createProfile(name) {
    const profiles = getProfiles();
    const id = Date.now().toString(36);
    profiles.push({ id, name, created: Date.now() });
    saveProfiles(profiles);
    return id;
  }

  function deleteProfile(id) {
    const profiles = getProfiles().filter(p => p.id !== id);
    saveProfiles(profiles);
    remove(`history_${id}`);
    if (getCurrentProfileId() === id) {
      setCurrentProfileId(profiles.length ? profiles[0].id : null);
    }
  }

  function getProfile(id) { return getProfiles().find(p => p.id === id) || null; }

  /* ── BMI history per profile ── */
  function getHistory(profileId) { return get(`history_${profileId}`, []); }

  function addEntry(profileId, entry) {
    const hist = getHistory(profileId);
    hist.push({ ...entry, id: Date.now().toString(36), timestamp: Date.now() });
    set(`history_${profileId}`, hist);
    return hist;
  }

  function deleteEntry(profileId, entryId) {
    const hist = getHistory(profileId).filter(e => e.id !== entryId);
    set(`history_${profileId}`, hist);
    return hist;
  }

  /* ── Stats helpers ── */
  function getStats(profileId) {
    const hist = getHistory(profileId);
    if (!hist.length) return { min: null, max: null, avg: null, count: 0 };

    const bmis = hist.map(e => e.bmi);
    return {
      min:   Math.min(...bmis),
      max:   Math.max(...bmis),
      avg:   bmis.reduce((a, b) => a + b, 0) / bmis.length,
      count: hist.length,
    };
  }

  return {
    getProfiles, saveProfiles, createProfile, deleteProfile, getProfile,
    getCurrentProfileId, setCurrentProfileId,
    getHistory, addEntry, deleteEntry, getStats,
  };
})();
