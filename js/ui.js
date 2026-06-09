/* ─────────────────────────────────────────────
   BioMetric Pro UI Module
   Gauge animation, form handling, history table
   ───────────────────────────────────────────── */
window.BMI = window.BMI || {};

BMI.UI = (() => {
  /* ── Gauge animation using SVG arc ── */
  function updateGauge(bmi, category) {
    const needleEl  = document.getElementById('gauge-needle');
    const dotEl     = document.getElementById('gauge-dot');
    const arcEl     = document.getElementById('gauge-arc');
    const bmiText   = document.getElementById('gauge-bmi-text');
    const catText   = document.getElementById('gauge-category-text');
    if (!arcEl) return;

    /* BMI range mapped to angle: 10 → -90°, 40 → +90° (180° total sweep) */
    const clamp  = Math.max(10, Math.min(40, bmi));
    const ratio  = (clamp - 10) / 30;
    const angle  = -90 + ratio * 180;   // degrees from vertical

    /* Arc path — semicircle from left to right */
    const r    = 90;   // radius matching SVG
    const cx   = 110;  // centre x
    const cy   = 118;  // centre y (below visual)
    const start = { x: cx - r, y: cy };          // leftmost point
    const endRad = (angle - 90) * Math.PI / 180; // convert to radians from top
    const ex  = cx + r * Math.sin((ratio) * Math.PI);
    const ey  = cy - r * Math.cos((ratio) * Math.PI) * -1;  // simplified

    /* Draw arc via stroke-dasharray trick on a full circle */
    const circum = 2 * Math.PI * r;
    const halfCircum = circum / 2;   // only the top half used
    const dashLen = ratio * halfCircum;

    arcEl.setAttribute('stroke-dasharray', `${dashLen} ${circum}`);
    arcEl.setAttribute('stroke-dashoffset', '0');

    /* Reconstruct arc path each render */
    function polarToCart(cx, cy, r, angleDeg) {
      const rad = (angleDeg - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    const startPt = polarToCart(cx, cy, r, 180);  // left
    const endPt   = polarToCart(cx, cy, r, 180 + ratio * 180);
    const largeArc= ratio > 0.5 ? 1 : 0;
    arcEl.setAttribute('d', `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`);
    arcEl.setAttribute('stroke', category.color);

    /* Needle */
    if (needleEl && dotEl) {
      const needleDeg = 180 + ratio * 180; // 180→360 mapped
      needleEl.setAttribute('transform', `rotate(${needleDeg - 270}, ${cx}, ${cy})`);
      needleEl.setAttribute('opacity', '1');
      dotEl.setAttribute('opacity', '1');
    }

    /* Text */
    bmiText.textContent = bmi.toFixed(1);
    bmiText.setAttribute('fill', category.color);
    catText.textContent = category.label;
  }

  /* ── Category badge ── */
  function showCategoryBadge(category) {
    const badge = document.getElementById('category-badge');
    if (!badge) return;
    badge.style.display = 'flex';
    badge.style.background = category.badge;
    badge.style.border = `1px solid ${category.color}40`;
    badge.style.color  = category.color;
    document.getElementById('category-icon').textContent  = category.icon;
    document.getElementById('category-label').textContent = category.label;
  }

  /* ── Healthy range ── */
  function showHealthyRange(bmi, weightKg, heightCm) {
    const rangeEl = document.getElementById('healthy-range');
    if (!rangeEl) return;
    rangeEl.style.display = 'flex';

    const range = BMI.Calc.healthyRange(heightCm);
    document.getElementById('healthy-range-val').textContent = `${range.lo} – ${range.hi} kg`;

    const toNormal = BMI.Calc.toNormal(bmi, weightKg, heightCm);
    document.getElementById('to-normal-val').textContent = toNormal || '✅ Already in Normal range!';
  }

  /* ── Stats panel ── */
  function updateStats(bmi, profileId) {
    const stats = BMI.Storage.getStats(profileId);
    const fmt   = v => v !== null ? v.toFixed(1) : '—';

    document.getElementById('stat-bmi-val').textContent = bmi ? bmi.toFixed(1) : '—';
    document.getElementById('stat-min').textContent     = fmt(stats.min);
    document.getElementById('stat-max').textContent     = fmt(stats.max);
    document.getElementById('stat-avg').textContent     = fmt(stats.avg);

    /* Color current BMI by category */
    if (bmi) {
      const cat = BMI.Calc.getCategory(bmi);
      document.getElementById('stat-bmi-val').style.color = cat.color;
    }
  }

  /* ── History table ── */
  function renderHistory(profileId) {
    const tbody = document.getElementById('history-body');
    if (!tbody) return;

    const hist = BMI.Storage.getHistory(profileId);
    if (!hist.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No history yet. Calculate your first BMI!</td></tr>';
      return;
    }

    const sorted = [...hist].sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = sorted.map(e => {
      const cat = BMI.Calc.getCategory(e.bmi);
      const date = new Date(e.timestamp).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      return `
        <tr>
          <td>${date}</td>
          <td>${e.weightDisplay}</td>
          <td>${e.heightDisplay}</td>
          <td style="font-weight:700;color:${cat.color}">${e.bmi.toFixed(1)}</td>
          <td><span class="bmi-badge ${cat.class}">${cat.label}</span></td>
          <td><button class="del-entry" onclick="BMI.App.deleteEntry('${e.id}')" title="Delete">
            <i class="fas fa-trash-alt"></i></button></td>
        </tr>
      `;
    }).join('');
  }

  /* ── Profile dropdown ── */
  function renderProfileList(currentId) {
    const container = document.getElementById('profile-list');
    if (!container) return;

    const profiles = BMI.Storage.getProfiles();
    if (!profiles.length) {
      container.innerHTML = '<p style="padding:10px 14px;color:rgba(255,255,255,0.3);font-size:0.82rem;">No profiles yet</p>';
      return;
    }

    container.innerHTML = profiles.map(p => `
      <div class="profile-list-item ${p.id === currentId ? 'active' : ''}"
           onclick="BMI.App.switchProfile('${p.id}')">
        <span>${p.name}</span>
        <button class="del-profile" onclick="event.stopPropagation(); BMI.App.deleteProfile('${p.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  function setCurrentProfileName(name) {
    const el = document.getElementById('current-profile-name');
    if (el) el.textContent = name || 'Select Profile';
  }

  /* ── Validation ── */
  function showValidation(msg) {
    const el = document.getElementById('validation-msg');
    if (el) el.textContent = msg;
  }

  /* ── Toast ── */
  function showToast(msg) {
    const toast = document.getElementById('bmi-toast');
    const label = document.getElementById('bmi-toast-msg');
    if (!toast || !label) return;
    label.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  /* ── Export CSV ── */
  function exportCSV(profileId, profileName) {
    const hist = BMI.Storage.getHistory(profileId);
    if (!hist.length) { showToast('No history to export.'); return; }

    const rows = [['Date','Weight','Height','BMI','Category']];
    hist.sort((a,b)=>a.timestamp-b.timestamp).forEach(e => {
      const cat  = BMI.Calc.getCategory(e.bmi);
      const date = new Date(e.timestamp).toLocaleDateString('en-GB');
      rows.push([date, e.weightDisplay, e.heightDisplay, e.bmi.toFixed(1), cat.label]);
    });

    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `bmi-history-${profileName.replace(/\s+/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
  }

  return {
    updateGauge, showCategoryBadge, showHealthyRange,
    updateStats, renderHistory, renderProfileList,
    setCurrentProfileName, showValidation, showToast, exportCSV,
  };
})();
