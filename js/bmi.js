/* ─────────────────────────────────────────────
   BMI Calculation Engine
   Metric + Imperial, categories, healthy range
   ───────────────────────────────────────────── */
window.BMI = window.BMI || {};

BMI.Calc = (() => {
  /* WHO Standard BMI categories */
  const CATEGORIES = [
    { max: 16.0,  label: 'Severely Underweight', class: 'underweight', icon: '⚠️',  color: '#3b82f6', badge: 'rgba(59,130,246,0.15)' },
    { max: 18.5,  label: 'Underweight',           class: 'underweight', icon: '📉',  color: '#60a5fa', badge: 'rgba(96,165,250,0.15)' },
    { max: 25.0,  label: 'Normal Weight',          class: 'normal',      icon: '✅',  color: '#22c55e', badge: 'rgba(34,197,94,0.15)' },
    { max: 30.0,  label: 'Overweight',             class: 'overweight',  icon: '⚠️',  color: '#f59e0b', badge: 'rgba(245,158,11,0.15)' },
    { max: 35.0,  label: 'Obese (Class I)',        class: 'obese',       icon: '🔴',  color: '#ef4444', badge: 'rgba(239,68,68,0.15)' },
    { max: 40.0,  label: 'Obese (Class II)',       class: 'obese',       icon: '🔴',  color: '#dc2626', badge: 'rgba(220,38,38,0.15)' },
    { max: Infinity, label: 'Morbidly Obese',      class: 'obese',       icon: '🔴',  color: '#b91c1c', badge: 'rgba(185,28,28,0.15)' },
  ];

  /* ── Metric calculation ── */
  function calcMetric(weightKg, heightCm) {
    const h = heightCm / 100;
    return weightKg / (h * h);
  }

  /* ── Imperial calculation ── */
  function calcImperial(weightLbs, heightInches) {
    return (weightLbs / (heightInches * heightInches)) * 703;
  }

  /* ── Category from BMI ── */
  function getCategory(bmi) {
    return CATEGORIES.find(c => bmi < c.max) || CATEGORIES[CATEGORIES.length - 1];
  }

  /* ── Healthy weight range for given height ── */
  function healthyRange(heightCm) {
    const h = heightCm / 100;
    const lo = Math.round(18.5 * h * h * 10) / 10;
    const hi = Math.round(24.9 * h * h * 10) / 10;
    return { lo, hi };
  }

  /* ── Amount to gain/lose to reach normal ── */
  function toNormal(bmi, weightKg, heightCm) {
    const cat = getCategory(bmi);
    const h = heightCm / 100;
    if (cat.class === 'normal') return null;

    if (bmi < 18.5) {
      const target = Math.ceil((18.5 * h * h - weightKg) * 10) / 10;
      return `Gain ${target} kg to reach Normal`;
    } else {
      const target = Math.ceil((weightKg - 24.9 * h * h) * 10) / 10;
      return `Lose ${target} kg to reach Normal`;
    }
  }

  /* ── Convert imperial height to cm ── */
  function ftInToCm(ft, inches) { return (parseInt(ft) * 12 + parseInt(inches)) * 2.54; }

  /* ── Convert lbs to kg ── */
  function lbsToKg(lbs) { return lbs * 0.453592; }

  return { calcMetric, calcImperial, getCategory, healthyRange, toNormal, ftInToCm, lbsToKg, CATEGORIES };
})();
