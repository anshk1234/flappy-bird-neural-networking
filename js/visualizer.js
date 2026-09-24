/**
 * Neural Network Visualizer matching the screenshot's high-fidelity layout:
 * - 3 Stacked architecture panels (4-4-1, 4-8-1, 4-16-1)
 * - Real-time input values (bird y, pipe x, gap top, gap bottom)
 * - Hidden nodes with bias rings
 * - Output node with dynamic 'flap' / 'wait' states and activation value
 * - Connections colored: green (positive), red (negative), yellow (just mutated)
 * - Bottom legend text
 */
class NetworkVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.panels = [];
  }

  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.width = width;
    this.height = height;
  }

  /**
   * Draw the entire visualization panel
   * @param {Array} speciesData - Array of 3 species data objects:
   *   { bird, aliveCount, totalCount, birdIndex, totalWeights, mutatedCount, config }
   */
  draw(speciesData) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark sleek background matching screenshot
    ctx.fillStyle = '#14151b';
    ctx.fillRect(0, 0, w, h);

    if (!speciesData || speciesData.length === 0) return;

    const legendHeight = 28;
    const availableHeight = h - legendHeight;
    const panelHeight = availableHeight / speciesData.length;

    this.panels = [];

    // Render each species panel
    speciesData.forEach((data, index) => {
      const panelY = index * panelHeight;
      this.panels.push({
        index,
        x: 0,
        y: panelY,
        width: w,
        height: panelHeight,
        data
      });

      this.drawPanel(data, 0, panelY, w, panelHeight);

      // Panel divider line
      if (index < speciesData.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, panelY + panelHeight);
        ctx.lineTo(w - 12, panelY + panelHeight);
        ctx.stroke();
      }
    });

    // Draw bottom legend
    this.drawLegend(w, h - legendHeight, legendHeight);
  }

  /**
   * Draw one species network panel
   */
  drawPanel(data, px, py, pw, ph) {
    const ctx = this.ctx;
    const { bird, aliveCount, birdIndex, config } = data;
    if (!bird || !bird.brain) return;

    const brain = bird.brain;
    const totalWeights = brain.totalWeights;
    const mutatedCount = brain.mutatedCount;

    // 1. Header Row
    const headerY = py + 22;

    // Small bird avatar
    this.drawMiniBirdAvatar(ctx, px + 22, headerY - 5, config.mainColor, config.bellyColor);

    // Title: "4-4-1 network, showing 1 of 20 birds that are alive"
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f3f4f6';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleText = `${config.name} network, showing ${birdIndex + 1} of ${aliveCount} birds that are alive`;
    ctx.fillText(titleText, px + 38, headerY - 5);

    // Mutation info: "3 of 25 weights changed by mutation"
    ctx.font = '400 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'right';
    const mutationText = `${mutatedCount} of ${totalWeights} weights changed by mutation`;
    ctx.fillText(mutationText, pw - 20, headerY - 5);

    // 2. Network Graph Layout Coordinates
    const graphTop = py + 42;
    const graphBottom = py + ph - 10;
    const graphHeight = graphBottom - graphTop;

    // Layer X positions
    const inputX = px + 120;
    const hiddenX = px + pw * 0.52;
    const outputX = px + pw - 90;

    // Node coordinate generators
    const inputNodesCount = 4;
    const inputLabels = ['bird y', 'pipe x', 'gap top', 'gap bottom'];
    const inputValues = bird.currentInputs || [0, 0, 0, 0];

    const inputCoords = [];
    for (let i = 0; i < inputNodesCount; i++) {
      const ny = graphTop + (graphHeight / (inputNodesCount + 1)) * (i + 1);
      inputCoords.push({ x: inputX, y: ny, val: inputValues[i], label: inputLabels[i] });
    }

    const hiddenNodesCount = brain.hiddenNodes;
    const hiddenActivations = brain.lastHidden || new Array(hiddenNodesCount).fill(0.5);
    const hiddenCoords = [];
    for (let i = 0; i < hiddenNodesCount; i++) {
      const ny = graphTop + (graphHeight / (hiddenNodesCount + 1)) * (i + 1);
      hiddenCoords.push({
        x: hiddenX,
        y: ny,
        val: hiddenActivations[i],
        bias: brain.biasH[i],
        mutatedBias: brain.mutatedBiasH[i]
      });
    }

    const outputCoords = [
      {
        x: outputX,
        y: graphTop + graphHeight * 0.5,
        val: bird.lastOutputVal || 0.5,
        action: bird.lastAction || 'wait',
        bias: brain.biasO[0],
        mutatedBias: brain.mutatedBiasO[0]
      }
    ];

    // 3. Draw Synapse Connections
    // Render standard connections first, mutated yellow connections second for clarity

    // Connections: Input -> Hidden
    for (let i = 0; i < hiddenNodesCount; i++) {
      for (let j = 0; j < inputNodesCount; j++) {
        const weight = brain.weightsIH[i][j];
        const isMutated = brain.mutatedIH[i][j];
        if (!isMutated) {
          this.drawConnection(ctx, inputCoords[j], hiddenCoords[i], weight, false);
        }
      }
    }
    // Mutated Input -> Hidden on top
    for (let i = 0; i < hiddenNodesCount; i++) {
      for (let j = 0; j < inputNodesCount; j++) {
        const weight = brain.weightsIH[i][j];
        const isMutated = brain.mutatedIH[i][j];
        if (isMutated) {
          this.drawConnection(ctx, inputCoords[j], hiddenCoords[i], weight, true);
        }
      }
    }

    // Connections: Hidden -> Output
    for (let i = 0; i < hiddenNodesCount; i++) {
      const weight = brain.weightsHO[0][i];
      const isMutated = brain.mutatedHO[0][i];
      if (!isMutated) {
        this.drawConnection(ctx, hiddenCoords[i], outputCoords[0], weight, false);
      }
    }
    // Mutated Hidden -> Output on top
    for (let i = 0; i < hiddenNodesCount; i++) {
      const weight = brain.weightsHO[0][i];
      const isMutated = brain.mutatedHO[0][i];
      if (isMutated) {
        this.drawConnection(ctx, hiddenCoords[i], outputCoords[0], weight, true);
      }
    }

    // 4. Draw Input Nodes & Labels
    inputCoords.forEach(node => {
      // Input Label + Value (e.g., "bird y 0.84")
      ctx.font = '500 12px monospace, system-ui';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const text = `${node.label} ${node.val.toFixed(2)}`;
      ctx.fillText(text, node.x - 12, node.y);

      // Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 5. Draw Hidden Nodes & Bias Rings
    const hiddenRadius = hiddenNodesCount > 8 ? 4.8 : 7;
    hiddenCoords.forEach(node => {
      // Node fill: warm amber/brown mapped to activation
      const act = Math.max(0, Math.min(1, node.val));
      const r = Math.round(180 + act * 70);
      const g = Math.round(120 + act * 50);
      const b = Math.round(40 + act * 20);

      ctx.beginPath();
      ctx.arc(node.x, node.y, hiddenRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();

      // Bias Ring ("ring = bias")
      const biasVal = node.bias || 0;
      const ringRadius = hiddenRadius + 3.2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);

      if (node.mutatedBias) {
        ctx.strokeStyle = '#f1c40f'; // Just mutated bias ring
        ctx.lineWidth = 2.2;
      } else if (biasVal >= 0) {
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)'; // Positive bias ring
        ctx.lineWidth = Math.min(2.5, Math.max(1, Math.abs(biasVal) * 1.5));
      } else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Negative bias ring
        ctx.lineWidth = Math.min(2.5, Math.max(1, Math.abs(biasVal) * 1.5));
      }
      ctx.stroke();
    });

    // 6. Draw Output Node & State Label
    const outNode = outputCoords[0];
    const isFlap = outNode.action === 'flap';
    const outVal = outNode.val;
    const outputRadius = 8.5;

    ctx.beginPath();
    ctx.arc(outNode.x, outNode.y, outputRadius, 0, Math.PI * 2);
    ctx.fillStyle = isFlap ? '#48bb78' : '#718096';
    ctx.fill();

    // Bias ring for output node
    ctx.beginPath();
    ctx.arc(outNode.x, outNode.y, outputRadius + 3.5, 0, Math.PI * 2);
    if (outNode.mutatedBias) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.4;
    } else {
      ctx.strokeStyle = outNode.bias >= 0 ? 'rgba(72, 187, 120, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = Math.min(2.5, Math.max(1, Math.abs(outNode.bias) * 1.5));
    }
    ctx.stroke();

    // Output Label (e.g., "flap 0.50" or "wait 0.49")
    ctx.font = '600 13px monospace, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isFlap ? '#48bb78' : '#a0aec0';
    const outText = `${outNode.action} ${outVal.toFixed(2)}`;
    ctx.fillText(outText, outNode.x + 16, outNode.y);
  }

  /**
   * Draw connection synapse line with thickness and color rules
   */
  drawConnection(ctx, from, to, weight, isMutated) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    const absWeight = Math.abs(weight);
    const lineWidth = Math.min(4.8, Math.max(0.75, absWeight * 2.1));
    ctx.lineWidth = lineWidth;

    if (isMutated) {
      // Just mutated = yellow
      ctx.strokeStyle = '#f1c40f';
    } else if (weight >= 0) {
      // Positive weight = green
      const alpha = Math.min(0.9, Math.max(0.2, absWeight * 0.6));
      ctx.strokeStyle = `rgba(72, 187, 120, ${alpha})`;
    } else {
      // Negative weight = red
      const alpha = Math.min(0.9, Math.max(0.2, absWeight * 0.6));
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    }

    ctx.stroke();
  }

  /**
   * Draw small bird avatar icon for panel headers
   */
  drawMiniBirdAvatar(ctx, x, y, mainColor, bellyColor) {
    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(2.5, -1.5, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.2, -1.5, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(4, 0.5);
    ctx.lineTo(8.5, 2);
    ctx.lineTo(4, 3.5);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw bottom legend text matching screenshot
   */
  drawLegend(w, y, h) {
    const ctx = this.ctx;
    ctx.font = '400 11.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('green = positive weight, red = negative, thicker = bigger, yellow = just mutated, ring = bias', w / 2, y + h / 2);
  }

  /**
   * Find which panel was clicked
   */
  getPanelAt(x, y) {
    for (let p of this.panels) {
      if (x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
        return p;
      }
    }
    return null;
  }
}
