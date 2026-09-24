/**
 * Pipe / Obstacle Tower class matching the screenshot's architectural pillar aesthetic
 */
class Pipe {
  constructor(canvasWidth, canvasHeight, currentScore = 0) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.width = 68;
    this.x = canvasWidth;

    // Pipe gap dynamics
    this.gap = 135; // Comfortable gap for neuroevolution to learn
    const minHeight = 60;
    const maxHeight = canvasHeight - this.gap - minHeight;

    // Random top height within safe bounds
    this.top = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    this.bottom = this.top + this.gap;

    this.speed = 2.6;
    this.passed = false;
    this.capHeight = 22;
    this.capOverhang = 8;
  }

  update(speedMultiplier = 1) {
    this.x -= this.speed * speedMultiplier;
  }

  isOffscreen() {
    return this.x + this.width + this.capOverhang < 0;
  }

  /**
   * Check collision against bird circle
   */
  hits(bird) {
    // Collision margin for smooth play
    const margin = 2;
    const birdLeft = bird.x - bird.radius + margin;
    const birdRight = bird.x + bird.radius - margin;
    const birdTop = bird.y - bird.radius + margin;
    const birdBottom = bird.y + bird.radius - margin;

    // Check horizontal overlap with pipe pillar
    if (birdRight > this.x && birdLeft < this.x + this.width) {
      // Check vertical collision with top or bottom pipe
      if (birdTop < this.top || birdBottom > this.bottom) {
        return true;
      }
    }

    // Check collision with caps (which overhang slightly)
    const capLeft = this.x - this.capOverhang / 2;
    const capRight = this.x + this.width + this.capOverhang / 2;
    if (birdRight > capLeft && birdLeft < capRight) {
      if (birdTop < this.top && birdBottom > this.top - this.capHeight) {
        return true;
      }
      if (birdBottom > this.bottom && birdTop < this.bottom + this.capHeight) {
        return true;
      }
    }

    return false;
  }

  /**
   * Draw architectural concrete tower / pillar matching the screenshot
   */
  draw(ctx) {
    ctx.save();

    // Tower styling: concrete stone look
    const bodyColor = '#8e969d';
    const bodyLight = '#a6b0b8';
    const bodyShadow = '#697279';
    const capColor = '#242a30';
    const capLight = '#3b434c';
    const windowColor = '#181b20';

    // 1. Draw Top Tower Body
    if (this.top > 0) {
      const topGrad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
      topGrad.addColorStop(0, bodyLight);
      topGrad.addColorStop(0.3, bodyColor);
      topGrad.addColorStop(0.85, bodyColor);
      topGrad.addColorStop(1, bodyShadow);

      ctx.fillStyle = topGrad;
      ctx.fillRect(this.x, 0, this.width, this.top - this.capHeight);

      // Border lines
      ctx.strokeStyle = '#2d3339';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, -2, this.width, this.top - this.capHeight + 2);

      // Window slits down the top pillar
      const winW = 10;
      const winH = 22;
      const winX = this.x + (this.width - winW) / 2;
      ctx.fillStyle = windowColor;
      for (let y = 15; y < this.top - this.capHeight - 20; y += 38) {
        ctx.fillRect(winX, y, winW, winH);
        // Window sill
        ctx.fillStyle = '#404953';
        ctx.fillRect(winX - 1, y + winH, winW + 2, 2);
        ctx.fillStyle = windowColor;
      }

      // Top Tower End Cap (Flared trapezoid cap pointing downwards towards gap)
      const capTopY = this.top - this.capHeight;
      const capBottomY = this.top;
      const capX1 = this.x - this.capOverhang / 2;
      const capX2 = this.x + this.width + this.capOverhang / 2;

      ctx.beginPath();
      ctx.moveTo(this.x, capTopY);
      ctx.lineTo(capX1, capBottomY);
      ctx.lineTo(capX2, capBottomY);
      ctx.lineTo(this.x + this.width, capTopY);
      ctx.closePath();

      const capGrad = ctx.createLinearGradient(capX1, 0, capX2, 0);
      capGrad.addColorStop(0, capLight);
      capGrad.addColorStop(0.5, capColor);
      capGrad.addColorStop(1, '#15181c');
      ctx.fillStyle = capGrad;
      ctx.fill();
      ctx.strokeStyle = '#121417';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 2. Draw Bottom Tower
    const bottomHeight = this.canvasHeight - this.bottom;
    if (bottomHeight > 0) {
      // Bottom Tower Cap (Flared trapezoid cap pointing upwards at gap edge)
      const capTopY = this.bottom;
      const capBottomY = this.bottom + this.capHeight;
      const capX1 = this.x - this.capOverhang / 2;
      const capX2 = this.x + this.width + this.capOverhang / 2;

      ctx.beginPath();
      ctx.moveTo(capX1, capTopY);
      ctx.lineTo(this.x, capBottomY);
      ctx.lineTo(this.x + this.width, capBottomY);
      ctx.lineTo(capX2, capTopY);
      ctx.closePath();

      const capGrad2 = ctx.createLinearGradient(capX1, 0, capX2, 0);
      capGrad2.addColorStop(0, capLight);
      capGrad2.addColorStop(0.5, capColor);
      capGrad2.addColorStop(1, '#15181c');
      ctx.fillStyle = capGrad2;
      ctx.fill();
      ctx.strokeStyle = '#121417';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottom Tower Body
      const bodyGrad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
      bodyGrad.addColorStop(0, bodyLight);
      bodyGrad.addColorStop(0.3, bodyColor);
      bodyGrad.addColorStop(0.85, bodyColor);
      bodyGrad.addColorStop(1, bodyShadow);

      ctx.fillStyle = bodyGrad;
      ctx.fillRect(this.x, capBottomY, this.width, this.canvasHeight - capBottomY);

      // Border lines
      ctx.strokeStyle = '#2d3339';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, capBottomY, this.width, this.canvasHeight - capBottomY + 2);

      // Window slits down the bottom pillar
      const winW = 10;
      const winH = 22;
      const winX = this.x + (this.width - winW) / 2;
      ctx.fillStyle = windowColor;
      for (let y = capBottomY + 15; y < this.canvasHeight - 15; y += 38) {
        ctx.fillRect(winX, y, winW, winH);
        // Window sill
        ctx.fillStyle = '#404953';
        ctx.fillRect(winX - 1, y + winH, winW + 2, 2);
        ctx.fillStyle = windowColor;
      }
    }

    ctx.restore();
  }
}
