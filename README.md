# Flappy Bird Neural Network (Neuroevolution AI)

An interactive, self-contained **Neuroevolution simulation** where artificial neural networks learn to master Flappy Bird in real-time right in your browser. Runs 100% locally with zero external dependencies.

Inspired by neuroevolution visualizations, this project features multi-species competition and live neural network architecture inspection.

---

## 📸 Overview

The simulation runs a split-screen interface:
- **Left Panel (Flappy Bird Simulation)**:
  - Three distinct bird populations evolving concurrently.
  - Realistic cloud sky and architectural concrete pillar obstacles.
  - Selected birds highlighted with a white indicator ring corresponding to their visualized network.
  - Live HUD tracking **Points**, **Max Points**, and current **Generation**.
- **Right Panel (Real-Time Neural Network Visualizer)**:
  - Stacked inspection panels for three competing architectures:
    - **4-4-1 Network** (25 parameters) — Olive birds
    - **4-8-1 Network** (49 parameters) — Red birds
    - **4-16-1 Network** (97 parameters) — Brown birds
  - Real-time input telemetry: `bird y`, `pipe x`, `gap top`, `gap bottom`.
  - Dynamic hidden nodes with outer **bias rings**.
  - Output decisions: `flap` (green, activation $\ge 0.50$) or `wait` (gray, activation $< 0.50$).
  - Dynamic connection coloring:
    - 🟢 **Green** = Positive weight
    - 🔴 **Red** = Negative weight
    - 🟡 **Yellow** = Just mutated in current generation
    - **Thickness** = Weight magnitude

---

## 🚀 How to Run Locally

You can run this project locally using Python or by opening `index.html` directly in any web browser.

### Option 1: Python Local Server (Recommended)
Run the bundled `server.py`:
```bash
python server.py
```
This starts the local server at:
- `http://localhost:8000/v1-neural-network/`
- `http://localhost:8000/`

And automatically opens your default browser.

### Option 2: Python Built-in HTTP Server
```bash
python -m http.server 8000
```
Then navigate to: `http://localhost:8000`

### Option 3: Direct Browser Launch
Double-click `index.html` in your file explorer to open it in Chrome, Edge, Firefox, or Safari. All assets, scripts, and audio synthesizers are 100% local.

---

## 🧠 Neural Network & Genetic Algorithm Details

### Inputs (4 Normalized Features: 0.0 to 1.0)
1. **`bird y`**: Bird vertical position relative to screen height.
2. **`pipe x`**: Horizontal distance to the next upcoming pipe edge.
3. **`gap top`**: Vertical position of the top pipe obstacle edge.
4. **`gap bottom`**: Vertical position of the bottom pipe obstacle edge.

### Hidden Layer
- 4, 8, or 16 neurons with Sigmoid activation.
- Node rings represent bias strength and polarity.

### Output (1 Neuron)
- Sigmoid activation value between 0.0 and 1.0.
- Value $\ge 0.50 \implies$ `flap` (bird jumps).
- Value $< 0.50 \implies$ `wait` (bird glides).

### Evolution Process
1. **Fitness Evaluation**: Birds earn fitness by staying alive and staying centered in the upcoming pipe gap.
2. **Elitism**: The champion of each species is preserved without degradation.
3. **Selection**: Parents are chosen via tournament selection based on fitness.
4. **Mutation**: Weights and biases are randomly perturbed with Gaussian noise. Mutated connections are highlighted in bright **yellow** during the new generation.

---

## 🎮 Interactive Controls & Shortcuts

| Action | Control / Shortcut |
| :--- | :--- |
| **Play / Pause** | `P` key or **Pause** button |
| **Next Generation** | `N` key or **Next Gen** button |
| **Reset Simulation** | **Reset** button |
| **Simulation Speed** | `1`, `2`, `3`, `4` keys or **1x**, **2x**, **5x**, **10x** buttons |
| **Vision Rays (Radar)** | `V` key or **Vision Rays** button |
| **Toggle Layout (Bottom / 3-Col)** | `L` key or **Layout** button |
| **Play As Bird (Human)** | **Play As Bird** button (`Space` to flap) |
| **Select / Inspect Bird** | Click on any bird on the game canvas, or click any network panel |
| **Sound FX** | **Sound** button (Retro 8-bit Web Audio synthesizer) |
| **Export / Import Model** | **Weights** button to view/save JSON weights |
