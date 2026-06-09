/* ─────────────────────────────────────────────
   BioMetric Pro Main App
   Orchestrates all BMI modules
   ───────────────────────────────────────────── */
window.BMI = window.BMI || {};

BMI.App = (() => {
  let currentProfileId = null;
  let currentUnit      = 'metric';   // 'metric' | 'imperial'
  let currentGender    = 'male';

  /* ─────────────────────────────────────────── */
  /*  INIT                                        */
  /* ─────────────────────────────────────────── */
  function init() {
    setupEventListeners();

    /* Restore or create default profile */
    currentProfileId = BMI.Storage.getCurrentProfileId();
    const profiles   = BMI.Storage.getProfiles();

    if (!profiles.length) {
      currentProfileId = BMI.Storage.createProfile('My Profile');
      BMI.Storage.setCurrentProfileId(currentProfileId);
    } else if (!currentProfileId || !BMI.Storage.getProfile(currentProfileId)) {
      currentProfileId = profiles[0].id;
      BMI.Storage.setCurrentProfileId(currentProfileId);
    }

    refreshUI();
  }

  /* ─────────────────────────────────────────── */
  /*  Event listeners                             */
  /* ─────────────────────────────────────────── */
  function setupEventListeners() {
    /* Unit toggle */
    document.getElementById('btn-metric').addEventListener('click',   () => switchUnit('metric'));
    document.getElementById('btn-imperial').addEventListener('click', () => switchUnit('imperial'));

    /* Gender */
    document.getElementById('gender-male').addEventListener('click',   () => switchGender('male'));
    document.getElementById('gender-female').addEventListener('click', () => switchGender('female'));

    /* Calculate */
    document.getElementById('calculate-btn').addEventListener('click', calculate);

    /* Profile dropdown toggle */
    document.getElementById('profile-dropdown-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('profile-dropdown').classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.getElementById('profile-dropdown').classList.remove('open');
    });

    /* Add profile modal */
    document.getElementById('add-profile-btn').addEventListener('click', () => {
      document.getElementById('profile-dropdown').classList.remove('open');
      document.getElementById('profile-modal').classList.add('active');
    });
    document.getElementById('close-profile-modal').addEventListener('click', closeProfileModal);
    document.getElementById('cancel-profile-btn').addEventListener('click', closeProfileModal);
    document.getElementById('create-profile-btn').addEventListener('click', createProfile);
    document.getElementById('profile-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeProfileModal();
    });

    /* Export */
    document.getElementById('export-btn').addEventListener('click', () => {
      const p = BMI.Storage.getProfile(currentProfileId);
      BMI.UI.exportCSV(currentProfileId, p ? p.name : 'profile');
    });

    /* Enter key on inputs */
    ['weight-input','height-input','height-ft','height-in','age-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') calculate(); });
    });

    /* Clear validation on input change */
    ['weight-input','height-input','height-ft','height-in','age-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => BMI.UI.showValidation(''));
    });
  }

  /* ─────────────────────────────────────────── */
  /*  Unit toggle                                 */
  /* ─────────────────────────────────────────── */
  function switchUnit(unit) {
    currentUnit = unit;
    document.getElementById('btn-metric').classList.toggle('active',   unit === 'metric');
    document.getElementById('btn-imperial').classList.toggle('active', unit === 'imperial');

    document.getElementById('height-metric-group').classList.toggle('hidden',   unit !== 'metric');
    document.getElementById('height-imperial-group').classList.toggle('hidden', unit !== 'imperial');
    document.getElementById('weight-unit').textContent  = unit === 'metric' ? 'kg' : 'lbs';
    document.getElementById('height-unit').textContent  = 'cm';
    BMI.UI.showValidation('');
  }

  /* ─────────────────────────────────────────── */
  /*  Gender toggle                               */
  /* ─────────────────────────────────────────── */
  function switchGender(gender) {
    currentGender = gender;
    document.getElementById('gender-male').classList.toggle('active',   gender === 'male');
    document.getElementById('gender-female').classList.toggle('active', gender === 'female');
  }

  /* ─────────────────────────────────────────── */
  /*  BMI Calculation                             */
  /* ─────────────────────────────────────────── */
  function calculate() {
    if (!currentProfileId) {
      BMI.UI.showValidation('Please select or create a profile first.');
      return;
    }

    /* Read inputs */
    const weightRaw = parseFloat(document.getElementById('weight-input').value);
    let   heightCm, heightDisplay, weightKg, weightDisplay;

    if (currentUnit === 'metric') {
      heightCm      = parseFloat(document.getElementById('height-input').value);
      weightKg      = weightRaw;
      heightDisplay = `${heightCm} cm`;
      weightDisplay = `${weightKg} kg`;
    } else {
      const ft  = parseFloat(document.getElementById('height-ft').value) || 0;
      const ins = parseFloat(document.getElementById('height-in').value) || 0;
      heightCm      = BMI.Calc.ftInToCm(ft, ins);
      weightKg      = BMI.Calc.lbsToKg(weightRaw);
      heightDisplay = `${ft}ft ${ins}in`;
      weightDisplay = `${weightRaw} lbs`;
    }

    /* Validation */
    if (isNaN(weightRaw) || weightRaw <= 0 || weightRaw > 500) {
      BMI.UI.showValidation('Please enter a valid weight (1 – 500).');
      return;
    }
    if (isNaN(heightCm) || heightCm <= 0 || heightCm > 300) {
      BMI.UI.showValidation('Please enter a valid height.');
      return;
    }

    BMI.UI.showValidation('');

    /* Calculate */
    const bmi      = BMI.Calc.calcMetric(weightKg, heightCm);
    const category = BMI.Calc.getCategory(bmi);

    /* Update gauge + result card */
    BMI.UI.updateGauge(bmi, category);
    BMI.UI.showCategoryBadge(category);
    BMI.UI.showHealthyRange(bmi, weightKg, heightCm);

    /* Save to history */
    const ageInput = document.getElementById('age-input');
    const age = ageInput ? parseInt(ageInput.value) || null : null;

    const entry = { bmi, weightKg, heightCm, weightDisplay, heightDisplay, age, gender: currentGender };
    BMI.Storage.addEntry(currentProfileId, entry);

    /* Refresh stats + chart + history */
    BMI.UI.updateStats(bmi, currentProfileId);
    BMI.Charts.render(BMI.Storage.getHistory(currentProfileId));
    BMI.UI.renderHistory(currentProfileId);
    BMI.UI.showToast(`BMI calculated: ${bmi.toFixed(1)} — ${category.label}`);

    /* Animate result card into view */
    document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ─────────────────────────────────────────── */
  /*  Profile management                          */
  /* ─────────────────────────────────────────── */
  function createProfile() {
    const nameInput = document.getElementById('profile-name-input');
    const name = nameInput.value.trim();
    if (!name) { BMI.UI.showToast('Enter a profile name.'); return; }

    const id = BMI.Storage.createProfile(name);
    nameInput.value = '';
    closeProfileModal();
    switchProfile(id);
    BMI.UI.showToast(`Profile "${name}" created!`);
  }

  function switchProfile(id) {
    currentProfileId = id;
    BMI.Storage.setCurrentProfileId(id);
    document.getElementById('profile-dropdown').classList.remove('open');
    refreshUI();
  }

  function deleteProfile(id) {
    const profiles = BMI.Storage.getProfiles();
    if (profiles.length <= 1) { BMI.UI.showToast('Cannot delete the last profile.'); return; }
    const p = BMI.Storage.getProfile(id);
    if (confirm(`Delete profile "${p ? p.name : id}"? All history will be lost.`)) {
      BMI.Storage.deleteProfile(id);
      currentProfileId = BMI.Storage.getCurrentProfileId();
      refreshUI();
      BMI.UI.showToast('Profile deleted.');
    }
  }

  function deleteEntry(entryId) {
    BMI.Storage.deleteEntry(currentProfileId, entryId);
    const hist = BMI.Storage.getHistory(currentProfileId);
    BMI.UI.updateStats(null, currentProfileId);
    BMI.Charts.render(hist);
    BMI.UI.renderHistory(currentProfileId);
    BMI.UI.showToast('Entry deleted.');
  }

  function closeProfileModal() {
    document.getElementById('profile-modal').classList.remove('active');
    document.getElementById('profile-name-input').value = '';
  }

  /* ─────────────────────────────────────────── */
  /*  Full UI refresh                             */
  /* ─────────────────────────────────────────── */
  function refreshUI() {
    const profile = BMI.Storage.getProfile(currentProfileId);
    BMI.UI.setCurrentProfileName(profile ? profile.name : 'Select Profile');
    BMI.UI.renderProfileList(currentProfileId);
    BMI.UI.updateStats(null, currentProfileId);
    BMI.Charts.render(BMI.Storage.getHistory(currentProfileId));
    BMI.UI.renderHistory(currentProfileId);
  }

  return { init, switchProfile, deleteProfile, deleteEntry };
})();

/* Bootstrap */
document.addEventListener('DOMContentLoaded', () => BMI.App.init());
