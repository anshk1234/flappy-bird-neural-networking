/**
 * Bird Agent class controlled by a Neural Network (or Human Player)
 * Renders cartoon birds with species coloring and selection highlight rings
 */
class Bird {
  constructor(speciesIndex = 0, brain = null, isHuman = false) {
    this.speciesIndex = speciesIndex;
    this.isHuman = isHuman;

    // Species configurations matching the screenshot:
    // Species 0: 4-4-1 (Olive / Gold bird)
    // Species 1: 4-8-1 (Red bird)
    // Species 2: 4-16-1 (Dark Brown / Amber bird)
    const speciesConfigs = [
      { name: '4-4-1', inputs: 4, hidden: 4, outputs: 1, mainColor: '#7d8a35', bellyColor: '#b0bd58', accentColor: '#535e1d' },
      { name: '4-8-1', inputs: 4, hidden: 8, outputs: 1, mainColor: '#cb3a2d', bellyColor: '#ea6558', accentColor: '#8a1f15' },
      { name: '4-16-1', inputs: 4, hidden: 16, outputs: 1, mainColor: '#87532d', bellyColor: '#bb855a', accentColor: '#583215' }
    ];

    this.config = speciesConfigs[speciesIndex] || speciesConfigs[0];
    this.speciesName = this.config.name;

    // Brain (Neural Network)
    if (this.isHuman) {
      this.brain = null;
    } else if (brain instanceof NeuralNetwork) {
      this.brain = brain;
    } else {
      this.brain = new NeuralNetwork(this.config.inputs, this.config.hidden, this.config.outputs);
    }

    // Physics
    this.x = 75;
    this.y = 200 + Math.random() * 80;
    this.velocity = 0;
    this.gravity = 0.38;
    this.lift = -7.2;
    this.radius = 16;

    // State
    this.alive = true;
    this.fitness = 0;
    this.score = 0;
    this.timeAlive = 0;

    // Cached decision for visualization
    this.lastAction = 'wait';
    this.lastOutputVal = 0.5;
    this.currentInputs = [0.5, 0.5, 0.4, 0.7];
  }

  jump() {
    this.velocity = this.lift;
  }

  think(pipes, canvasWidth, canvasHeight) {
    if (!this.alive || this.isHuman || !this.brain) return;

    // Find the closest upcoming pipe
    let closestPipe = null;
    let closestDist = Infinity;

    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      // Pipe is relevant if its right edge is still ahead of bird
      const dist = (p.x + p.width) - this.x;
      if (dist > -10 && dist < closestDist) {
        closestDist = dist;
        closestPipe = p;
      }
    }
    this.closestPipe = closestPipe;

    // Default values if no pipe ahead yet
    let pipeX = 1.0;
    let gapTop = 0.35;
    let gapBottom = 0.65;

    if (closestPipe) {
      pipeX = Math.max(0, Math.min(1, (closestPipe.x + closestPipe.width - this.x) / canvasWidth));
      gapTop = Math.max(0, Math.min(1, closestPipe.top / canvasHeight));
      gapBottom = Math.max(0, Math.min(1, closestPipe.bottom / canvasHeight));
    }

    const birdY = Math.max(0, Math.min(1, this.y / canvasHeight));

    // Store inputs
    this.currentInputs = [birdY, pipeX, gapTop, gapBottom];

    // Neural Network feedforward
    const outputs = this.brain.predict(this.currentInputs);
    const outputVal = outputs[0];
    this.lastOutputVal = outputVal;

    // Flap if output >= 0.5
    if (outputVal >= 0.5) {
      this.lastAction = 'flap';
      this.jump();
    } else {
      this.lastAction = 'wait';
    }

    // Fitness reward: staying alive + bonus for staying near the gap center
    if (closestPipe) {
      const gapCenter = (closestPipe.top + closestPipe.bottom) / 2;
      const distToCenter = Math.abs(this.y - gapCenter);
      const normalizedDist = Math.min(1, distToCenter / (canvasHeight / 2));
      this.fitness += (1 - normalizedDist * 0.4);
    } else {
      this.fitness += 1;
    }
  }

  update(canvasHeight, speedMultiplier = 1) {
    if (!this.alive) return;

    this.velocity += this.gravity * speedMultiplier;
    this.y += this.velocity * speedMultiplier;
    this.timeAlive += speedMultiplier;

    // Floor collision
    if (this.y + this.radius >= canvasHeight) {
      this.y = canvasHeight - this.radius;
      this.alive = false;
      this.velocity = 0;
    }

    // Ceiling collision (soft bounce or kill)
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.velocity = 0;
    }
  }

  /**
   * Draw bird matching the screenshot's cartoon style
   */
  draw(ctx, isSelected = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Subtle tilt based on velocity
    const tilt = Math.max(-0.6, Math.min(0.8, this.velocity * 0.05));
    ctx.rotate(tilt);

    // 1. Draw Selection Ring if highlighted
    if (isSelected) {
      ctx.save();
      ctx.rotate(-tilt); // Keep selection ring round and un-tilted

      // Outer soft glow
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Sharp white ring exactly like the screenshot
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.restore();
    }

    // Colors
    const isHum = this.isHuman;
    const bodyColor = isHum ? '#3498db' : this.config.mainColor;
    const bellyColor = isHum ? '#85c1e9' : this.config.bellyColor;
    const accentColor = isHum ? '#21618c' : this.config.accentColor;

    // 2. Feather tuft on top of head
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(-4, -this.radius + 2);
    ctx.quadraticCurveTo(-14, -this.radius - 12, -7, -this.radius - 6);
    ctx.quadraticCurveTo(-8, -this.radius - 14, 0, -this.radius - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Main round body
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Belly patch
    ctx.beginPath();
    ctx.ellipse(2, 4, this.radius * 0.75, this.radius * 0.55, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = bellyColor;
    ctx.fill();

    // 5. Angry Cartoon Eyes
    // Left eye (closer to center)
    ctx.beginPath();
    ctx.ellipse(3, -3, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(11, -3, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // Eye Pupils
    ctx.beginPath();
    ctx.arc(6, -2.5, 2.2, 0, Math.PI * 2);
    ctx.arc(13, -2.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Tiny eye gleams
    ctx.beginPath();
    ctx.arc(5, -4, 0.8, 0, Math.PI * 2);
    ctx.arc(12, -4, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 6. Angled Angry Eyebrows
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, -10);
    ctx.lineTo(8, -6);
    ctx.lineTo(16, -9);
    ctx.stroke();

    // 7. Beak (bright orange with black divider line)
    ctx.beginPath();
    ctx.moveTo(9, 2);
    ctx.lineTo(21, 6);
    ctx.lineTo(9, 10);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Beak mouth slit
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.lineTo(19, 6);
    ctx.stroke();

    // 8. Wing
    ctx.beginPath();
    const wingY = this.velocity < 0 ? -1 : 3;
    ctx.ellipse(-7, wingY, 7, 5, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw sensory AI vision radar lines towards upcoming obstacle edges
   */
  drawVisionRays(ctx) {
    if (!this.alive || !this.closestPipe) return;
    const p = this.closestPipe;
    if (p.x + p.width < this.x - 10) return;

    ctx.save();

    const targetX = p.x;
    const topY = p.top;
    const bottomY = p.bottom;
    const centerY = (topY + bottomY) / 2;

    // 1. Ray to Top Pipe Gap Edge (Cyan)
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(targetX, topY);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Contact point at top edge
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(targetX, topY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // 2. Ray to Bottom Pipe Gap Edge (Rose / Magenta)
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(targetX, bottomY);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Contact point at bottom edge
    ctx.beginPath();
    ctx.arc(targetX, bottomY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();

    // 3. Central Line to Gap Center (Emerald Green laser)
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(targetX, centerY);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Target reticle at gap center
    ctx.beginPath();
    ctx.arc(targetX, centerY, 6.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();

    ctx.restore();
  }
}
