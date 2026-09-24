/**
 * Main Flappy Bird Neuroevolution Game Engine
 * Manages 3 species populations, physics, scoring, generation evolution, and rendering
 */
class FlappyGame {
  constructor(gameCanvas, visualizerCanvas) {
    this.gameCanvas = gameCanvas;
    this.ctx = gameCanvas.getContext('2d');

    this.visualizerCanvas = visualizerCanvas;
    this.visualizer = new NetworkVisualizer(visualizerCanvas);

    // Game state
    this.points = 0;
    this.maxPoints = 5;
    this.generation = 1;
    this.frameCounter = 0;
    this.speedMultiplier = 1;
    this.isPaused = false;
    this.humanMode = false;
    this.humanBird = null;
    this.showVisionRays = true;
    this.analytics = new AnalyticsTracker();

    // Obstacles
    this.pipes = [];
    this.pipeSpawnInterval = 115;

    // Species configurations (matching screenshot exactly)
    this.speciesConfigs = [
      { id: 0, name: '4-4-1', inputs: 4, hidden: 4, outputs: 1, count: 20, mainColor: '#7d8a35', bellyColor: '#b0bd58' },
      { id: 1, name: '4-8-1', inputs: 4, hidden: 8, outputs: 1, count: 20, mainColor: '#cb3a2d', bellyColor: '#ea6558' },
      { id: 2, name: '4-16-1', inputs: 4, hidden: 16, outputs: 1, count: 50, mainColor: '#87532d', bellyColor: '#bb855a' }
    ];

    // Populations per species
    this.populations = [];
    this.selectedBirdIndices = [0, 0, 0]; // which bird to display for each species

    // Parallax cloud system
    this.clouds = [];
    this.initClouds();

    // Setup initial generation
    this.initPopulations();

    // Event listeners
    this.setupInteractions();
  }

  initClouds() {
    this.clouds = [
      { x: 30, y: 50, scale: 1.1, speed: 0.25 },
      { x: 220, y: 110, scale: 0.85, speed: 0.2 },
      { x: 420, y: 40, scale: 1.3, speed: 0.3 },
      { x: 120, y: 260, scale: 0.95, speed: 0.22 },
      { x: 330, y: 380, scale: 1.15, speed: 0.28 },
      { x: 50, y: 480, scale: 1.0, speed: 0.2 }
    ];
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    // Left canvas (Game)
    const gameRect = this.gameCanvas.parentElement.getBoundingClientRect();
    const gw = Math.floor(gameRect.width);
    const gh = Math.floor(gameRect.height);

    this.gameCanvas.width = gw * dpr;
    this.gameCanvas.height = gh * dpr;
    this.gameCanvas.style.width = gw + 'px';
    this.gameCanvas.style.height = gh + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.width = gw;
    this.height = gh;

    // Right canvas (Visualizer)
    const vizRect = this.visualizerCanvas.parentElement.getBoundingClientRect();
    const vw = Math.floor(vizRect.width);
    const vh = Math.floor(vizRect.height);
    this.visualizer.resize(vw, vh);
  }

  initPopulations(tryLoadStorage = true) {
    if (tryLoadStorage && this.loadFromStorage()) {
      return;
    }

    if (tryLoadStorage && window.PRETRAINED_MODELS && this.loadPretrained(window.PRETRAINED_MODELS)) {
      return;
    }

    this.populations = [];
    this.speciesConfigs.forEach((cfg, sIdx) => {
      const speciesBirds = [];
      for (let i = 0; i < cfg.count; i++) {
        speciesBirds.push(new Bird(sIdx));
      }
      this.populations.push(speciesBirds);
      this.selectedBirdIndices[sIdx] = 0;
    });

    if (this.humanMode) {
      this.humanBird = new Bird(0, null, true);
    }
  }

  loadPretrained(payload) {
    try {
      if (!payload || !payload.speciesChampions || !Array.isArray(payload.speciesChampions)) return false;

      this.generation = payload.generation || 45;
      this.maxPoints = payload.maxPoints || 52;
      this.populations = [];

      this.speciesConfigs.forEach((cfg, sIdx) => {
        const champData = payload.speciesChampions[sIdx];
        const speciesBirds = [];

        if (champData) {
          const championBrain = NeuralNetwork.fromJSON(champData);
          speciesBirds.push(new Bird(sIdx, championBrain.clone()));

          for (let i = 1; i < cfg.count; i++) {
            const childBrain = championBrain.clone();
            childBrain.mutate(0.12, 0.45);
            speciesBirds.push(new Bird(sIdx, childBrain));
          }
        } else {
          for (let i = 0; i < cfg.count; i++) {
            speciesBirds.push(new Bird(sIdx));
          }
        }

        this.populations.push(speciesBirds);
        this.selectedBirdIndices[sIdx] = 0;
      });

      if (this.humanMode) {
        this.humanBird = new Bird(0, null, true);
      }
      return true;
    } catch (e) {
      console.warn('Could not load pretrained models:', e);
      return false;
    }
  }

  saveToStorage() {
    try {
      const speciesChampions = this.populations.map(pop => {
        // Save the highest fitness bird in this species
        const sorted = [...pop].sort((a, b) => b.fitness - a.fitness);
        return sorted[0] && sorted[0].brain ? sorted[0].brain.toJSON() : null;
      });

      const payload = {
        savedAt: new Date().toISOString(),
        generation: this.generation,
        maxPoints: this.maxPoints,
        speciesChampions
      };

      localStorage.setItem('flappy_ai_evolution_model', JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not auto-save to localStorage:', e);
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('flappy_ai_evolution_model');
      if (!raw) return false;

      const payload = JSON.parse(raw);
      if (!payload.speciesChampions || !Array.isArray(payload.speciesChampions)) return false;

      this.generation = payload.generation || 1;
      this.maxPoints = payload.maxPoints || 5;
      this.populations = [];

      this.speciesConfigs.forEach((cfg, sIdx) => {
        const champData = payload.speciesChampions[sIdx];
        const speciesBirds = [];

        if (champData) {
          const championBrain = NeuralNetwork.fromJSON(champData);
          // Preserve champion
          speciesBirds.push(new Bird(sIdx, championBrain.clone()));

          // Fill rest of population with offspring trained from this champion
          for (let i = 1; i < cfg.count; i++) {
            const childBrain = championBrain.clone();
            childBrain.mutate(0.12, 0.45);
            speciesBirds.push(new Bird(sIdx, childBrain));
          }
        } else {
          for (let i = 0; i < cfg.count; i++) {
            speciesBirds.push(new Bird(sIdx));
          }
        }

        this.populations.push(speciesBirds);
        this.selectedBirdIndices[sIdx] = 0;
      });

      if (this.humanMode) {
        this.humanBird = new Bird(0, null, true);
      }
      return true;
    } catch (e) {
      console.warn('Could not restore from localStorage:', e);
      return false;
    }
  }

  clearStorage() {
    try {
      localStorage.removeItem('flappy_ai_evolution_model');
    } catch (e) {}
  }

  resetAll() {
    this.clearStorage();
    if (this.analytics) {
      this.analytics.clear();
      if (this.onAnalyticsUpdate) {
        this.onAnalyticsUpdate();
      }
    }
    this.points = 0;
    this.maxPoints = 0;
    this.generation = 1;
    this.pipes = [];
    this.frameCounter = 0;
    this.initPopulations(false);
    if (window.soundController) window.soundController.playNewGen();
  }

  triggerNextGeneration() {
    // Kill all alive birds to trigger evolution immediately
    this.populations.forEach(pop => {
      pop.forEach(b => { b.alive = false; });
    });
    if (this.humanBird) this.humanBird.alive = false;
    this.checkEvolution();
  }

  toggleHumanMode() {
    this.humanMode = !this.humanMode;
    if (this.humanMode) {
      this.humanBird = new Bird(0, null, true);
    } else {
      this.humanBird = null;
    }
    return this.humanMode;
  }

  toggleVisionRays() {
    this.showVisionRays = !this.showVisionRays;
    return this.showVisionRays;
  }

  humanFlap() {
    if (this.humanMode && this.humanBird && this.humanBird.alive) {
      this.humanBird.jump();
      if (window.soundController) window.soundController.playFlap();
    }
  }

  setupInteractions() {
    // Click on game canvas to flap (human) or select clicked bird
    this.gameCanvas.addEventListener('mousedown', (e) => {
      const rect = this.gameCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (this.humanMode) {
        this.humanFlap();
        return;
      }

      // Check if user clicked near any bird
      let foundBird = false;
      this.populations.forEach((pop, sIdx) => {
        pop.forEach((bird, bIdx) => {
          if (bird.alive) {
            const dist = Math.hypot(bird.x - clickX, bird.y - clickY);
            if (dist < 28) {
              this.selectedBirdIndices[sIdx] = bIdx;
              foundBird = true;
            }
          }
        });
      });
    });

    // Click on visualizer to cycle selected bird for that species
    this.visualizerCanvas.addEventListener('mousedown', (e) => {
      const rect = this.visualizerCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const panel = this.visualizer.getPanelAt(clickX, clickY);
      if (panel) {
        const sIdx = panel.index;
        const pop = this.populations[sIdx];
        const aliveIndices = [];
        pop.forEach((b, idx) => { if (b.alive) aliveIndices.push(idx); });

        if (aliveIndices.length > 0) {
          const current = this.selectedBirdIndices[sIdx];
          const currPos = aliveIndices.indexOf(current);
          const nextPos = (currPos + 1) % aliveIndices.length;
          this.selectedBirdIndices[sIdx] = aliveIndices[nextPos];
        }
      }
    });

    // Keyboard Spacebar for Human Jump or Pause
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (this.humanMode) {
          e.preventDefault();
          this.humanFlap();
        }
      }
    });
  }

  /**
   * Main game update step
   */
  step() {
    if (this.isPaused) return;

    this.frameCounter++;

    // 1. Spawn pipes
    if (this.frameCounter % this.pipeSpawnInterval === 0) {
      this.pipes.push(new Pipe(this.width, this.height, this.points));
    }

    // 2. Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.update(this.speedMultiplier);

      // Score points when bird passes pipe center
      if (!p.passed && p.x + p.width < 75) {
        p.passed = true;
        this.points++;
        if (this.points > this.maxPoints) {
          this.maxPoints = this.points;
        }
        if (window.soundController) window.soundController.playScore();
      }

      // Remove off-screen pipes
      if (p.isOffscreen()) {
        this.pipes.splice(i, 1);
      }
    }

    // 3. Update Clouds (ambient background parallax)
    this.clouds.forEach(c => {
      c.x -= c.speed * this.speedMultiplier;
      if (c.x < -180) c.x = this.width + 120;
    });

    // 4. Update Birds in each species
    this.populations.forEach((pop) => {
      pop.forEach(bird => {
        if (bird.alive) {
          bird.think(this.pipes, this.width, this.height);
          bird.update(this.height, this.speedMultiplier);

          // Check collisions with pipes
          for (let p of this.pipes) {
            if (p.hits(bird)) {
              bird.alive = false;
              break;
            }
          }
        }
      });
    });

    // 5. Update Human Bird if active
    if (this.humanMode && this.humanBird && this.humanBird.alive) {
      this.humanBird.update(this.height, this.speedMultiplier);
      for (let p of this.pipes) {
        if (p.hits(this.humanBird)) {
          this.humanBird.alive = false;
          if (window.soundController) window.soundController.playCrash();
          break;
        }
      }
    }

    // 6. Check if all birds are dead -> trigger next generation
    this.checkEvolution();
  }

  /**
   * Check if any bird is alive; if none, evolve populations
   */
  checkEvolution() {
    let totalAlive = 0;
    this.populations.forEach(pop => {
      totalAlive += pop.filter(b => b.alive).length;
    });

    if (this.humanMode && this.humanBird && this.humanBird.alive) {
      totalAlive++;
    }

    if (totalAlive === 0) {
      this.evolve();
    }
  }

  /**
   * Genetic Algorithm: Selection, Elitism, and Mutation
   */
  evolve() {
    if (this.points > this.maxPoints) {
      this.maxPoints = this.points;
    }

    // Record analytics before resetting points for this round
    if (this.analytics) {
      this.analytics.recordGeneration(this.generation, this.points, this.populations);
      if (this.onAnalyticsUpdate) {
        this.onAnalyticsUpdate();
      }
    }

    this.generation++;
    this.points = 0;
    this.pipes = [];
    this.frameCounter = 0;

    if (window.soundController) window.soundController.playNewGen();

    this.populations.forEach((pop, sIdx) => {
      const cfg = this.speciesConfigs[sIdx];

      // Sort birds by fitness descending
      pop.sort((a, b) => b.fitness - a.fitness);

      const newPop = [];

      // Elitism: Preserve champion bird
      const champion = pop[0];
      const eliteBrain = champion.brain.clone();
      // Keep champion with 0 mutations or very slight mutation
      const eliteBird = new Bird(sIdx, eliteBrain);
      eliteBird.brain.mutatedCount = 0; // Champion stays pure
      newPop.push(eliteBird);

      // Fill rest of the population with mutated offspring
      const topPool = pop.slice(0, Math.max(3, Math.floor(pop.length * 0.25)));

      while (newPop.length < cfg.count) {
        // Tournament selection
        const parent = this.selectParent(topPool);
        const childBrain = parent.brain.clone();

        // Mutate weights
        childBrain.mutate(0.12, 0.45);

        const child = new Bird(sIdx, childBrain);
        newPop.push(child);
      }

      this.populations[sIdx] = newPop;
      this.selectedBirdIndices[sIdx] = 0;
    });

    // Reset human bird
    if (this.humanMode) {
      this.humanBird = new Bird(0, null, true);
    }

    // Auto-save best models so training is not lost on close/refresh
    this.saveToStorage();
  }

  selectParent(pool) {
    const idx1 = Math.floor(Math.random() * pool.length);
    const idx2 = Math.floor(Math.random() * pool.length);
    return pool[idx1].fitness >= pool[idx2].fitness ? pool[idx1] : pool[idx2];
  }

  /**
   * Draw realistic cloudy sky matching screenshot
   */
  drawSky() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Rich sky gradient from deep blue at top to soft light sky blue
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#4280b8');
    skyGrad.addColorStop(0.5, '#6da1cb');
    skyGrad.addColorStop(1, '#a6cbe7');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw fluffy cumulus clouds
    this.clouds.forEach(c => {
      this.drawCloud(ctx, c.x, c.y, c.scale);
    });
  }

  drawCloud(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Soft cloud puffs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.arc(32, -10, 42, 0, Math.PI * 2);
    ctx.arc(68, -2, 34, 0, Math.PI * 2);
    ctx.arc(94, 8, 28, 0, Math.PI * 2);
    ctx.arc(42, 16, 32, 0, Math.PI * 2);
    ctx.fill();

    // Darker underbelly for realistic depth
    ctx.fillStyle = 'rgba(215, 226, 238, 0.35)';
    ctx.beginPath();
    ctx.arc(36, 18, 30, 0, Math.PI * 2);
    ctx.arc(70, 16, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw HUD text matching screenshot exactly:
   * Points: 1
   * Max Points: 5
   * Generation: 2
   */
  drawHUD() {
    const ctx = this.ctx;
    ctx.save();

    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const startX = 22;
    const startY = 18;
    const lineSpacing = 32;

    ctx.fillText(`Points: ${this.points}`, startX, startY);
    ctx.fillText(`Max Points: ${this.maxPoints}`, startX, startY + lineSpacing);
    ctx.fillText(`Generation: ${this.generation}`, startX, startY + lineSpacing * 2);

    ctx.restore();
  }

  /**
   * Main render loop
   */
  render() {
    const ctx = this.ctx;

    // 1. Draw Sky & Clouds
    this.drawSky();

    // 2. Draw Obstacle Pipes
    this.pipes.forEach(pipe => {
      pipe.draw(ctx);
    });

    // 3. Collect active bird data for each species
    const visualizerSpeciesData = [];

    this.populations.forEach((pop, sIdx) => {
      const cfg = this.speciesConfigs[sIdx];
      const aliveBirds = pop.filter(b => b.alive);
      const aliveCount = aliveBirds.length;

      // Ensure a valid alive bird is selected for visualization
      let selectedIdx = this.selectedBirdIndices[sIdx];
      let selectedBird = pop[selectedIdx];

      if (!selectedBird || !selectedBird.alive) {
        if (aliveCount > 0) {
          // Default to highest fitness alive bird
          aliveBirds.sort((a, b) => b.fitness - a.fitness);
          selectedBird = aliveBirds[0];
          selectedIdx = pop.indexOf(selectedBird);
          this.selectedBirdIndices[sIdx] = selectedIdx;
        } else {
          selectedBird = pop[0]; // fallback if all dead
        }
      }

      visualizerSpeciesData.push({
        bird: selectedBird,
        aliveCount,
        totalCount: cfg.count,
        birdIndex: selectedIdx,
        config: cfg
      });

      // Draw all birds in this species
      pop.forEach((bird, idx) => {
        if (bird.alive) {
          const isSelected = idx === this.selectedBirdIndices[sIdx];
          if (isSelected && this.showVisionRays) {
            bird.drawVisionRays(ctx);
          }
          bird.draw(ctx, isSelected);
        }
      });
    });

    // 4. Draw Human Bird if playing
    if (this.humanMode && this.humanBird && this.humanBird.alive) {
      this.humanBird.draw(ctx, true);
    }

    // 5. Draw HUD
    this.drawHUD();

    // 6. Draw Neural Network Visualizer Panel on right canvas
    this.visualizer.draw(visualizerSpeciesData);
  }

  /**
   * Animation Frame Loop
   */
  loop() {
    this.step();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  start() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(() => this.loop());
  }
}

window.FlappyGame = FlappyGame;
