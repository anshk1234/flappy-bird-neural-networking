/**
 * Analytics and Historical Performance Tracking Engine
 * Records fitness, scores, and species benchmarks across generations
 * Renders high-DPI interactive canvas graphs with zero external dependencies
 */
class AnalyticsTracker {
  constructor() {
    this.history = [];
    this.speciesStats = [
      { id: 0, name: '4-4-1', color: '#7d8a35', wins: 0, bestScore: 0, totalScore: 0 },
      { id: 1, name: '4-8-1', color: '#cb3a2d', wins: 0, bestScore: 0, totalScore: 0 },
      { id: 2, name: '4-16-1', color: '#87532d', wins: 0, bestScore: 0, totalScore: 0 }
    ];

    this.loadFromStorage();
  }

  saveToStorage() {
    try {
      const payload = {
        history: this.history,
        speciesStats: this.speciesStats
      };
      localStorage.setItem('flappy_ai_analytics_history', JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not save analytics to localStorage:', e);
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('flappy_ai_analytics_history');
      if (raw) {
        const payload = JSON.parse(raw);
        if (payload.history && Array.isArray(payload.history)) {
          this.history = payload.history;
        }
        if (payload.speciesStats && Array.isArray(payload.speciesStats)) {
          this.speciesStats = payload.speciesStats;
        }
      }
    } catch (e) {
      console.warn('Could not restore analytics from localStorage:', e);
    }
  }

  clear() {
    this.history = [];
    this.speciesStats.forEach(s => {
      s.wins = 0;
      s.bestScore = 0;
      s.totalScore = 0;
    });
    try {
      localStorage.removeItem('flappy_ai_analytics_history');
    } catch (e) {}
  }

  /**
   * Record completed generation statistics
   */
  recordGeneration(generation, roundMaxScore, populations) {
    let totalScoreSum = 0;
    let totalBirds = 0;
    let highestScoreThisGen = 0;
    let winningSpeciesIdx = 0;
    const speciesScores = [0, 0, 0];

    populations.forEach((pop, sIdx) => {
      let speciesMax = 0;
      pop.forEach(b => {
        totalScoreSum += b.score;
        totalBirds++;
        if (b.score > speciesMax) speciesMax = b.score;
      });

      speciesScores[sIdx] = speciesMax;
      if (speciesMax > highestScoreThisGen) {
        highestScoreThisGen = speciesMax;
        winningSpeciesIdx = sIdx;
      }

      // Update cumulative stats
      if (this.speciesStats[sIdx]) {
        this.speciesStats[sIdx].totalScore += speciesMax;
        if (speciesMax > this.speciesStats[sIdx].bestScore) {
          this.speciesStats[sIdx].bestScore = speciesMax;
        }
      }
    });

    if (this.speciesStats[winningSpeciesIdx]) {
      this.speciesStats[winningSpeciesIdx].wins++;
    }

    const avgScore = totalBirds > 0 ? parseFloat((totalScoreSum / totalBirds).toFixed(2)) : 0;
    const finalMax = Math.max(roundMaxScore, highestScoreThisGen);

    const record = {
      generation,
      maxScore: finalMax,
      avgScore,
      speciesScores,
      winningSpeciesIdx,
      timestamp: Date.now()
    };

    this.history.push(record);

    // Keep history bounded to last 200 generations for performance
    if (this.history.length > 200) {
      this.history.shift();
    }

    this.saveToStorage();
  }

  getSummary() {
    const totalGens = this.history.length;
    let allTimeHigh = 0;
    this.history.forEach(r => {
      if (r.maxScore > allTimeHigh) allTimeHigh = r.maxScore;
    });

    let bestSpecies = this.speciesStats[0];
    this.speciesStats.forEach(s => {
      if (s.wins > bestSpecies.wins || (s.wins === bestSpecies.wins && s.bestScore > bestSpecies.bestScore)) {
        bestSpecies = s;
      }
    });

    const winRate = totalGens > 0 ? Math.round((bestSpecies.wins / totalGens) * 100) : 0;

    let growthRate = 0;
    if (this.history.length >= 2) {
      const firstScore = Math.max(1, this.history[0].maxScore);
      const lastScore = this.history[this.history.length - 1].maxScore;
      growthRate = Math.round(((lastScore - firstScore) / firstScore) * 100);
    }

    return {
      totalGens,
      allTimeHigh,
      bestSpeciesName: bestSpecies.name,
      bestSpeciesColor: bestSpecies.color,
      bestSpeciesWins: bestSpecies.wins,
      winRate,
      growthRate
    };
  }

  /**
   * Render Learning Progression Chart (Max & Avg score per gen)
   */
  renderLearningChart(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Dark sleek background
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, w, h);

    if (this.history.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No generation history recorded yet. Let the AI play a few rounds!', w / 2, h / 2);
      return;
    }

    const padding = { top: 25, right: 25, bottom: 35, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Determine scale limits
    let maxVal = 5;
    this.history.forEach(r => {
      if (r.maxScore > maxVal) maxVal = r.maxScore;
    });
    maxVal = Math.ceil(maxVal * 1.15); // headroom

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((maxVal / ySteps) * i);
      const y = padding.top + chartH - (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.fillText(val, padding.left - 8, y);
    }

    // X Axis ticks
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xSteps = Math.min(this.history.length, 6);
    for (let i = 0; i < xSteps; i++) {
      const idx = Math.floor((this.history.length - 1) * (i / Math.max(1, xSteps - 1)));
      const record = this.history[idx];
      const x = padding.left + (chartW / Math.max(1, this.history.length - 1)) * idx;
      ctx.fillText(`G${record.generation}`, x, padding.top + chartH + 8);
    }

    // Coordinates mapping
    const getX = (idx) => padding.left + (chartW / Math.max(1, this.history.length - 1)) * idx;
    const getY = (val) => padding.top + chartH - (val / maxVal) * chartH;

    // 1. Draw Max Score Area Gradient & Line
    const maxGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    maxGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    maxGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    this.history.forEach((r, idx) => {
      const x = getX(idx);
      const y = getY(r.maxScore);
      if (idx === 0) {
        ctx.moveTo(x, padding.top + chartH);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(getX(this.history.length - 1), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = maxGrad;
    ctx.fill();

    // Max score line
    ctx.beginPath();
    this.history.forEach((r, idx) => {
      const x = getX(idx);
      const y = getY(r.maxScore);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Points on max line
    this.history.forEach((r, idx) => {
      const x = getX(idx);
      const y = getY(r.maxScore);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 2. Draw Avg Score Line (Cyan dashed)
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    this.history.forEach((r, idx) => {
      const x = getX(idx);
      const y = getY(r.avgScore);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // Chart Title & Legend
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.fillText('— Max Score', padding.left + 10, padding.top - 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('--- Average Score', padding.left + 110, padding.top - 10);
  }

  /**
   * Render Multi-Species Competition Chart
   */
  renderSpeciesChart(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, w, h);

    if (this.history.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No species comparison data yet.', w / 2, h / 2);
      return;
    }

    const padding = { top: 25, right: 25, bottom: 35, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    let maxVal = 5;
    this.history.forEach(r => {
      if (r.speciesScores) {
        r.speciesScores.forEach(val => {
          if (val > maxVal) maxVal = val;
        });
      }
    });
    maxVal = Math.ceil(maxVal * 1.15);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((maxVal / ySteps) * i);
      const y = padding.top + chartH - (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.fillText(val, padding.left - 8, y);
    }

    const getX = (idx) => padding.left + (chartW / Math.max(1, this.history.length - 1)) * idx;
    const getY = (val) => padding.top + chartH - (val / maxVal) * chartH;

    // Draw line for each species
    this.speciesStats.forEach((spec, sIdx) => {
      ctx.beginPath();
      this.history.forEach((r, idx) => {
        const score = (r.speciesScores && r.speciesScores[sIdx] !== undefined) ? r.speciesScores[sIdx] : 0;
        const x = getX(idx);
        const y = getY(score);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Mini dots
      this.history.forEach((r, idx) => {
        const score = (r.speciesScores && r.speciesScores[sIdx] !== undefined) ? r.speciesScores[sIdx] : 0;
        const x = getX(idx);
        const y = getY(score);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = spec.color;
        ctx.fill();
      });
    });

    // Legend
    let legendX = padding.left + 10;
    this.speciesStats.forEach(spec => {
      ctx.fillStyle = spec.color;
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`— ${spec.name}`, legendX, padding.top - 10);
      legendX += 85;
    });
  }
}

window.AnalyticsTracker = AnalyticsTracker;
