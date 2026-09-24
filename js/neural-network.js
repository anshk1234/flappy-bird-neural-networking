/**
 * Self-contained Feedforward Neural Network for Neuroevolution
 * Supports arbitrary single-hidden-layer architectures [inputs, hidden, outputs]
 * Tracks mutated weights & biases for real-time visualization
 */
class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;

    // Weights: Input -> Hidden (hiddenNodes x inputNodes)
    this.weightsIH = [];
    this.biasH = [];
    this.mutatedIH = [];
    this.mutatedBiasH = [];

    // Weights: Hidden -> Output (outputNodes x hiddenNodes)
    this.weightsHO = [];
    this.biasO = [];
    this.mutatedHO = [];
    this.mutatedBiasO = [];

    // Total parameter count (weights + biases)
    this.totalWeights = (inputNodes * hiddenNodes) + hiddenNodes + (hiddenNodes * outputNodes) + outputNodes;
    this.mutatedCount = 0;

    // Cached states for visualization
    this.lastInputs = new Array(inputNodes).fill(0);
    this.lastHidden = new Array(hiddenNodes).fill(0);
    this.lastOutput = new Array(outputNodes).fill(0);

    this.initWeights();
  }

  /**
   * Initialize weights with Xavier / Glorot uniform distribution
   */
  initWeights() {
    const scaleIH = Math.sqrt(2.0 / (this.inputNodes + this.hiddenNodes));
    for (let i = 0; i < this.hiddenNodes; i++) {
      this.weightsIH[i] = [];
      this.mutatedIH[i] = [];
      for (let j = 0; j < this.inputNodes; j++) {
        this.weightsIH[i][j] = (Math.random() * 2 - 1) * scaleIH;
        this.mutatedIH[i][j] = false;
      }
      this.biasH[i] = (Math.random() * 2 - 1) * 0.1;
      this.mutatedBiasH[i] = false;
    }

    const scaleHO = Math.sqrt(2.0 / (this.hiddenNodes + this.outputNodes));
    for (let i = 0; i < this.outputNodes; i++) {
      this.weightsHO[i] = [];
      this.mutatedHO[i] = [];
      for (let j = 0; j < this.hiddenNodes; j++) {
        this.weightsHO[i][j] = (Math.random() * 2 - 1) * scaleHO;
        this.mutatedHO[i][j] = false;
      }
      this.biasO[i] = (Math.random() * 2 - 1) * 0.1;
      this.mutatedBiasO[i] = false;
    }
  }

  /**
   * Standard Sigmoid Activation Function
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
  }

  /**
   * Feedforward inference
   * @param {number[]} inputArray - Array of normalized input values
   * @returns {number[]} Output activation values
   */
  predict(inputArray) {
    this.lastInputs = [...inputArray];

    // Compute hidden layer activations
    const hiddenActivations = [];
    for (let i = 0; i < this.hiddenNodes; i++) {
      let sum = this.biasH[i];
      for (let j = 0; j < this.inputNodes; j++) {
        sum += this.weightsIH[i][j] * inputArray[j];
      }
      hiddenActivations[i] = this.sigmoid(sum);
    }
    this.lastHidden = hiddenActivations;

    // Compute output layer activations
    const outputActivations = [];
    for (let i = 0; i < this.outputNodes; i++) {
      let sum = this.biasO[i];
      for (let j = 0; j < this.hiddenNodes; j++) {
        sum += this.weightsHO[i][j] * hiddenActivations[j];
      }
      outputActivations[i] = this.sigmoid(sum);
    }
    this.lastOutput = outputActivations;

    return outputActivations;
  }

  /**
   * Deep copy of the neural network
   */
  clone() {
    const cloneNet = new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes);

    for (let i = 0; i < this.hiddenNodes; i++) {
      for (let j = 0; j < this.inputNodes; j++) {
        cloneNet.weightsIH[i][j] = this.weightsIH[i][j];
        cloneNet.mutatedIH[i][j] = this.mutatedIH[i][j];
      }
      cloneNet.biasH[i] = this.biasH[i];
      cloneNet.mutatedBiasH[i] = this.mutatedBiasH[i];
    }

    for (let i = 0; i < this.outputNodes; i++) {
      for (let j = 0; j < this.hiddenNodes; j++) {
        cloneNet.weightsHO[i][j] = this.weightsHO[i][j];
        cloneNet.mutatedHO[i][j] = this.mutatedHO[i][j];
      }
      cloneNet.biasO[i] = this.biasO[i];
      cloneNet.mutatedBiasO[i] = this.mutatedBiasO[i];
    }

    cloneNet.mutatedCount = this.mutatedCount;
    return cloneNet;
  }

  /**
   * Box-Muller transform for Gaussian random numbers
   */
  gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Mutate weights and biases for the next generation
   * @param {number} rate - Probability of mutating a given weight/bias (0 to 1)
   * @param {number} step - Magnitude of perturbation
   */
  mutate(rate = 0.12, step = 0.45) {
    this.mutatedCount = 0;

    // Mutate Input -> Hidden weights
    for (let i = 0; i < this.hiddenNodes; i++) {
      for (let j = 0; j < this.inputNodes; j++) {
        if (Math.random() < rate) {
          const delta = this.gaussianRandom() * step;
          this.weightsIH[i][j] += delta;
          this.mutatedIH[i][j] = true;
          this.mutatedCount++;
        } else {
          this.mutatedIH[i][j] = false;
        }
      }

      // Mutate Hidden biases
      if (Math.random() < rate) {
        const delta = this.gaussianRandom() * step;
        this.biasH[i] += delta;
        this.mutatedBiasH[i] = true;
        this.mutatedCount++;
      } else {
        this.mutatedBiasH[i] = false;
      }
    }

    // Mutate Hidden -> Output weights
    for (let i = 0; i < this.outputNodes; i++) {
      for (let j = 0; j < this.hiddenNodes; j++) {
        if (Math.random() < rate) {
          const delta = this.gaussianRandom() * step;
          this.weightsHO[i][j] += delta;
          this.mutatedHO[i][j] = true;
          this.mutatedCount++;
        } else {
          this.mutatedHO[i][j] = false;
        }
      }

      // Mutate Output biases
      if (Math.random() < rate) {
        const delta = this.gaussianRandom() * step;
        this.biasO[i] += delta;
        this.mutatedBiasO[i] = true;
        this.mutatedCount++;
      } else {
        this.mutatedBiasO[i] = false;
      }
    }

    // Ensure at least 1 mutation occurs so evolution progresses
    if (this.mutatedCount === 0) {
      const targetI = Math.floor(Math.random() * this.hiddenNodes);
      const targetJ = Math.floor(Math.random() * this.inputNodes);
      this.weightsIH[targetI][targetJ] += this.gaussianRandom() * step;
      this.mutatedIH[targetI][targetJ] = true;
      this.mutatedCount = 1;
    }
  }

  /**
   * Serialize network to plain object for export
   */
  toJSON() {
    return {
      inputNodes: this.inputNodes,
      hiddenNodes: this.hiddenNodes,
      outputNodes: this.outputNodes,
      weightsIH: this.weightsIH,
      biasH: this.biasH,
      weightsHO: this.weightsHO,
      biasO: this.biasO,
      mutatedCount: this.mutatedCount
    };
  }

  /**
   * Deserialize network from plain object
   */
  static fromJSON(data) {
    const net = new NeuralNetwork(data.inputNodes, data.hiddenNodes, data.outputNodes);
    net.weightsIH = data.weightsIH;
    net.biasH = data.biasH;
    net.weightsHO = data.weightsHO;
    net.biasO = data.biasO;
    net.mutatedCount = data.mutatedCount || 0;
    return net;
  }
}
