/* ─────────────────────────────────────────────
   BioMetric Pro Charts Module
   Chart.js trend graph with BMI zone backgrounds
   ───────────────────────────────────────────── */
window.BMI = window.BMI || {};

BMI.Charts = (() => {
  let trendChart = null;

  /* Custom plugin: draw colored BMI zone backgrounds */
  const zonePlugin = {
    id: 'bmiZones',
    beforeDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;

      const zones = [
        { min: 0,    max: 18.5, color: 'rgba(59,130,246,0.07)' },  // Underweight — blue
        { min: 18.5, max: 25,   color: 'rgba(34,197,94,0.09)' },   // Normal — green
        { min: 25,   max: 30,   color: 'rgba(245,158,11,0.08)' },  // Overweight — amber
        { min: 30,   max: 50,   color: 'rgba(239,68,68,0.08)' },   // Obese — red
      ];

      ctx.save();
      zones.forEach(z => {
        const top    = scales.y.getPixelForValue(Math.min(z.max, scales.y.max));
        const bottom = scales.y.getPixelForValue(Math.max(z.min, scales.y.min));
        if (bottom <= top) return;
        ctx.fillStyle = z.color;
        ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
      });
      ctx.restore();
    },
  };

  /* ── Build / update the trend chart ── */
  function render(history) {
    const canvas      = document.getElementById('bmi-chart');
    const placeholder = document.getElementById('chart-placeholder');
    if (!canvas) return;

    if (!history || history.length < 1) {
      canvas.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
      if (trendChart) { trendChart.destroy(); trendChart = null; }
      return;
    }

    canvas.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    /* Sort by timestamp ascending */
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

    const labels = sorted.map(e =>
      new Date(e.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    );
    const bmis = sorted.map(e => parseFloat(e.bmi.toFixed(1)));

    /* Point colors per BMI category */
    const pointColors = bmis.map(b => {
      if (b < 18.5) return '#60a5fa';
      if (b < 25)   return '#4ade80';
      if (b < 30)   return '#fbbf24';
      return '#f87171';
    });

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'BMI',
          data: bmis,
          borderColor: '#c084fc',
          backgroundColor: 'rgba(192,132,252,0.08)',
          borderWidth: 3,
          pointRadius: 7,
          pointHoverRadius: 10,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,28,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#f0f4ff',
            bodyColor: 'rgba(240,244,255,0.7)',
            padding: 12,
            callbacks: {
              label: ctx => ` BMI: ${ctx.parsed.y}`,
              afterLabel: ctx => {
                const b = ctx.parsed.y;
                if (b < 18.5) return '  Category: Underweight';
                if (b < 25)   return '  Category: Normal Weight';
                if (b < 30)   return '  Category: Overweight';
                return '  Category: Obese';
              },
            },
          },
        },
        scales: {
          y: {
            min: Math.max(10, Math.min(...bmis) - 3),
            max: Math.min(50, Math.max(...bmis) + 3),
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: 'rgba(240,244,255,0.45)', font: { size: 11 } },
            title: {
              display: true, text: 'BMI Value',
              color: 'rgba(240,244,255,0.4)', font: { size: 11 },
            },
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'rgba(240,244,255,0.45)', font: { size: 11 } },
          },
        },
      },
      plugins: [zonePlugin],
    };

    if (trendChart) {
      trendChart.data.labels = labels;
      trendChart.data.datasets[0].data = bmis;
      trendChart.data.datasets[0].pointBackgroundColor = pointColors;
      trendChart.options.scales.y.min = Math.max(10, Math.min(...bmis) - 3);
      trendChart.options.scales.y.max = Math.min(50, Math.max(...bmis) + 3);
      trendChart.update('active');
    } else {
      trendChart = new Chart(canvas, config);
    }
  }

  function destroy() {
    if (trendChart) { trendChart.destroy(); trendChart = null; }
  }

  return { render, destroy };
})();
