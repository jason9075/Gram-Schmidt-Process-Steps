const EPSILON = 1e-8;
const COLORS = [
  '#7cc7d9',
  '#a2d886',
  '#ffb866',
  '#f47c96',
  '#caa7ff',
  '#8db2ff',
  '#5fd0b3',
  '#ffd56b',
  '#ff8f6b',
  '#ff6f91',
];

const dimensionSelect = document.getElementById('dimension-select');
const sampleSelect = document.getElementById('sample-select');
const playModeSelect = document.getElementById('play-mode');
const applySampleButton = document.getElementById('apply-sample');
const recomputeButton = document.getElementById('recompute');
const clearMatrixButton = document.getElementById('clear-matrix');
const prevStepButton = document.getElementById('prev-step');
const nextStepButton = document.getElementById('next-step');
const playToggleButton = document.getElementById('play-toggle');
const resetStepsButton = document.getElementById('reset-steps');
const openMathButton = document.getElementById('open-math');
const closeMathButton = document.getElementById('close-math');
const languageToggle = document.getElementById('language-toggle');
const mathModal = document.getElementById('math-modal');
const mathContent = document.getElementById('math-content');

const inputMatrixRoot = document.getElementById('input-matrix');
const outputMatrixRoot = document.getElementById('output-matrix');
const normalizedMatrixRoot = document.getElementById('normalized-matrix');
const formulaBox = document.getElementById('formula-box');
const warningBox = document.getElementById('warning-box');
const logBox = document.getElementById('log-box');
const progressTrack = document.getElementById('progress-track');
const timelineLabel = document.getElementById('timeline-label');
const timelineMode = document.getElementById('timeline-mode');
const detailHint = document.getElementById('detail-hint');
const metaStep = document.getElementById('meta-step');
const metaVector = document.getElementById('meta-vector');
const metaStatus = document.getElementById('meta-status');
const metaRank = document.getElementById('meta-rank');
const summaryTitle = document.getElementById('summary-title');
const summaryVector = document.getElementById('summary-vector');
const summaryNorm = document.getElementById('summary-norm');
const summaryFactor = document.getElementById('summary-factor');
const summaryPhase = document.getElementById('summary-phase');
const summaryRank = document.getElementById('summary-rank');

const sampleFactories = {
  default: (n) => {
    const matrix = [];
    for (let row = 0; row < n; row += 1) {
      const values = [];
      for (let col = 0; col < n; col += 1) {
        if (row === col) {
          values.push(2);
        } else if (col < row) {
          values.push(((row + col) % 3) - 1);
        } else {
          values.push(0);
        }
      }
      matrix.push(values);
    }
    return matrix;
  },
  identity: (n) => {
    const matrix = [];
    for (let row = 0; row < n; row += 1) {
      const values = Array.from({ length: n }, (_, col) => (row === col ? 1 : 0));
      matrix.push(values);
    }
    return matrix;
  },
  dependent: (n) => {
    const matrix = sampleFactories.default(n);
    if (n >= 3) {
      matrix[2] = matrix[0].map((value, index) => value + matrix[1][index]);
    }
    return matrix;
  },
  random: (n) => Array.from({ length: n }, () => (
    Array.from({ length: n }, () => Math.floor(Math.random() * 9) - 4)
  )),
};

const state = {
  dimension: 3,
  matrix: [],
  orthogonalRows: [],
  normalizedRows: [],
  steps: [],
  currentStepIndex: 0,
  playing: false,
  autoTimer: null,
  modalLanguage: 'en',
  dependentCount: 0,
};

const modalCopy = {
  en: `
    <p>The Gram-Schmidt process converts a linearly independent set $\\{v_1, v_2, \\dots, v_n\\}$ into an orthogonal set $\\{u_1, u_2, \\dots, u_n\\}$ by subtracting projections, then normalizes each nonzero row to obtain an orthonormal set $\\{e_1, e_2, \\dots, e_n\\}$.</p>
    <p>The recurrence is:</p>
    <p>$$
      u_k = v_k - \\sum_{j=1}^{k-1} \\operatorname{proj}_{u_j}(v_k),
      \\qquad
      \\operatorname{proj}_{u_j}(v_k) = \\frac{\\langle v_k, u_j \\rangle}{\\langle u_j, u_j \\rangle} u_j
    $$</p>
    <p>Normalization then applies</p>
    <p>$$
      e_k = \\frac{u_k}{\\lVert u_k \\rVert}
    $$</p>
    <p>Each stage in this lab shows the active projection coefficient, the residual vector, the norm, and whether the remaining energy is close to zero.</p>
    <pre><code class="language-js">function gramSchmidtRow(vk, basis) {
  let residual = [...vk];
  for (const uj of basis) {
    const coeff = dot(vk, uj) / dot(uj, uj);
    residual = subtract(residual, scale(uj, coeff));
  }
  const norm = Math.sqrt(dot(residual, residual));
  const ek = norm > 0 ? scale(residual, 1 / norm) : residual;
  return { uk: residual, ek };
}</code></pre>
    <p>If $\\lVert u_k \\rVert \\approx 0$, then $v_k$ lies in the span of previous vectors, so the rank is deficient and the new orthogonal direction disappears.</p>
    <p><strong>Knowledge link:</strong> <a href="https://www.youtube.com/watch?v=PzqVLldlHTE" target="_blank" rel="noreferrer">Gram-Schmidt process walkthrough on YouTube</a></p>
  `,
  zhTW: `
    <p>Gram-Schmidt 程序會把一組線性獨立向量 $\\{v_1, v_2, \\dots, v_n\\}$，透過逐步扣除投影，轉成互相正交的向量組 $\\{u_1, u_2, \\dots, u_n\\}$，接著再把每個非零向量正規化成標準正交向量 $\\{e_1, e_2, \\dots, e_n\\}$。</p>
    <p>其遞迴公式為：</p>
    <p>$$
      u_k = v_k - \\sum_{j=1}^{k-1} \\operatorname{proj}_{u_j}(v_k),
      \\qquad
      \\operatorname{proj}_{u_j}(v_k) = \\frac{\\langle v_k, u_j \\rangle}{\\langle u_j, u_j \\rangle} u_j
    $$</p>
    <p>正規化步驟則是：</p>
    <p>$$
      e_k = \\frac{u_k}{\\lVert u_k \\rVert}
    $$</p>
    <p>這個工具會逐步展示每一個投影係數、剩餘向量 residual、向量範數，以及殘量是否已經趨近零，方便觀察 rank 不足時為什麼會出現零向量。</p>
    <pre><code class="language-js">function gramSchmidtRow(vk, basis) {
  let residual = [...vk];
  for (const uj of basis) {
    const coeff = dot(vk, uj) / dot(uj, uj);
    residual = subtract(residual, scale(uj, coeff));
  }
  const norm = Math.sqrt(dot(residual, residual));
  const ek = norm > 0 ? scale(residual, 1 / norm) : residual;
  return { uk: residual, ek };
}</code></pre>
    <p>如果 $\\lVert u_k \\rVert \\approx 0$，表示 $v_k$ 已落在前面向量張成的子空間中，因此 rank 不足，新的正交方向會消失。</p>
    <p><strong>延伸解說：</strong> <a href="https://www.youtube.com/watch?v=PzqVLldlHTE" target="_blank" rel="noreferrer">YouTube 影片講解 Gram-Schmidt process</a></p>
  `,
};

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

function scale(vector, scalar) {
  return vector.map((value) => value * scalar);
}

function magnitude(vector) {
  return Math.sqrt(dot(vector, vector));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const rounded = Math.abs(value) < EPSILON ? 0 : value;
  return Number(rounded.toFixed(3)).toString();
}

function vectorLabel(prefix, index) {
  return `${prefix}${index + 1}`;
}

function vectorLatex(prefix, index) {
  return `${prefix}_{${index + 1}}`;
}

function getColor(index) {
  return COLORS[index % COLORS.length];
}

function matrixToRows(matrix) {
  return matrix.map((row) => [...row]);
}

function renderMath(scope = document.body) {
  if (window.renderMathInElement) {
    window.renderMathInElement(scope, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
    });
  }
}

function renderModalContent() {
  mathContent.innerHTML = modalCopy[state.modalLanguage];
  renderMath(mathContent);
  if (window.Prism) {
    window.Prism.highlightAllUnder(mathContent);
  }
}

function syncDimensionSelect() {
  dimensionSelect.innerHTML = '';
  for (let n = 2; n <= 10; n += 1) {
    const option = document.createElement('option');
    option.value = String(n);
    option.textContent = `${n} × ${n}`;
    if (n === state.dimension) {
      option.selected = true;
    }
    dimensionSelect.appendChild(option);
  }
}

function loadSample(type) {
  state.matrix = matrixToRows(sampleFactories[type](state.dimension));
  rebuildComputation(true);
}

function clearMatrix() {
  state.matrix = Array.from({ length: state.dimension }, () => Array(state.dimension).fill(0));
  rebuildComputation(true);
}

function collectInputMatrix() {
  const rows = [];
  const rowNodes = inputMatrixRoot.querySelectorAll('[data-row]');
  rowNodes.forEach((rowNode) => {
    const cols = [...rowNode.querySelectorAll('input[data-col]')].map((input) => Number(input.value));
    rows.push(cols.map((value) => (Number.isFinite(value) ? value : 0)));
  });
  return rows;
}

function createInputMatrix() {
  inputMatrixRoot.innerHTML = '';
  const compact = state.dimension > 6;
  state.matrix.forEach((row, rowIndex) => {
    const rowNode = document.createElement('div');
    rowNode.className = 'matrix-row';
    rowNode.dataset.row = String(rowIndex);
    rowNode.style.gridTemplateColumns = `64px repeat(${state.dimension}, minmax(0, 1fr))`;

    const badge = document.createElement('div');
    badge.className = 'row-badge';
    badge.textContent = vectorLabel('v', rowIndex);
    badge.style.background = getColor(rowIndex);
    rowNode.appendChild(badge);

    row.forEach((value, colIndex) => {
      const cell = document.createElement('input');
      cell.className = 'matrix-cell';
      cell.type = 'number';
      cell.step = 'any';
      cell.value = String(value);
      cell.dataset.col = String(colIndex);
      cell.style.padding = compact ? '8px 10px' : '11px 12px';
      cell.addEventListener('change', () => {
        state.matrix = collectInputMatrix();
        rebuildComputation(false);
      });
      rowNode.appendChild(cell);
    });

    inputMatrixRoot.appendChild(rowNode);
  });
}

function createOutputMatrix() {
  renderMatrixGrid(outputMatrixRoot, state.orthogonalRows, 'u', (rowIndex, currentType, unlockedCount) => (
    rowIndex < (
      currentType === 'finalize' || currentType === 'normalize' || currentType === 'initialize'
        ? unlockedCount + 1
        : unlockedCount
    )
  ));
}

function createNormalizedMatrix() {
  renderMatrixGrid(normalizedMatrixRoot, state.normalizedRows, 'e', (rowIndex, currentType, unlockedCount) => (
    rowIndex < (currentType === 'normalize' ? unlockedCount + 1 : unlockedCount)
  ));
}

function renderMatrixGrid(root, rows, prefix, availabilityFn) {
  root.innerHTML = '';
  const unlockedCount = Math.max(0, state.steps[state.currentStepIndex]?.vectorIndex ?? 0);
  const currentType = state.steps[state.currentStepIndex]?.type;

  state.matrix.forEach((_, rowIndex) => {
    const rowNode = document.createElement('div');
    rowNode.className = 'matrix-row';
    rowNode.style.gridTemplateColumns = `64px repeat(${state.dimension}, minmax(0, 1fr))`;

    const badge = document.createElement('div');
    badge.className = 'row-badge';
    badge.textContent = vectorLabel(prefix, rowIndex);
    badge.style.background = getColor(rowIndex);
    rowNode.appendChild(badge);

    const rowValues = rows[rowIndex] ?? Array(state.dimension).fill(null);
    rowValues.forEach((value) => {
      const cell = document.createElement('div');
      cell.className = 'matrix-output';
      const available = availabilityFn(rowIndex, currentType, unlockedCount);
      cell.textContent = available && value !== null ? formatNumber(value) : '...';
      if (!available) {
        cell.classList.add('pending');
      }
      rowNode.appendChild(cell);
    });

    root.appendChild(rowNode);
  });
}

function computeSteps(matrix) {
  const steps = [];
  const orthogonalRows = [];
  const normalizedRows = [];
  let dependentCount = 0;

  matrix.forEach((vk, vectorIndex) => {
    let residual = [...vk];
    const projections = [];

    if (vectorIndex === 0) {
      steps.push({
        type: 'initialize',
        vectorIndex,
        projectionIndex: -1,
        residual: [...vk],
        norm: magnitude(vk),
        normalized: null,
        formula: `$$u_1 = v_1$$`,
        logs: [
          `${vectorLabel('v', vectorIndex)} starts the basis directly.`,
          `Residual = [${vk.map(formatNumber).join(', ')}]`,
        ],
        dependent: false,
      });
    }

    orthogonalRows.forEach((uj, projectionIndex) => {
      const numerator = dot(vk, uj);
      const denominator = dot(uj, uj);
      const coefficient = Math.abs(denominator) < EPSILON ? 0 : numerator / denominator;
      const projected = scale(uj, coefficient);
      residual = subtract(residual, projected);
      projections.push(projected);

      const verbose = matrix.length <= 6;
      const logs = [
        `Coefficient for proj_${vectorLatex('u', projectionIndex)}(${vectorLatex('v', vectorIndex)}) is ${formatNumber(coefficient)}.`,
        verbose
          ? `dot(${vectorLabel('v', vectorIndex)}, ${vectorLabel('u', projectionIndex)}) = ${formatNumber(numerator)}, ||${vectorLabel('u', projectionIndex)}||² = ${formatNumber(denominator)}.`
          : `Inner-product detail hidden in compact mode for dimension ${matrix.length}.`,
        `Projected component = [${projected.map(formatNumber).join(', ')}]`,
        `Residual after subtraction = [${residual.map(formatNumber).join(', ')}]`,
      ];

      steps.push({
        type: 'projection',
        vectorIndex,
        projectionIndex,
        residual: [...residual],
        projection: [...projected],
        coefficient,
        norm: magnitude(residual),
        normalized: null,
        formula: `$$u_${vectorIndex + 1}^{(${projectionIndex + 1})} = v_${vectorIndex + 1} - \\sum_{j=1}^{${projectionIndex + 1}} \\operatorname{proj}_{u_j}(v_${vectorIndex + 1})$$`,
        logs,
        dependent: false,
      });
    });

    const norm = magnitude(residual);
    const dependent = norm < EPSILON;
    if (dependent) {
      dependentCount += 1;
    }

    const orthogonal = dependent ? Array(vk.length).fill(0) : residual.map((value) => Number(value.toFixed(12)));
    const normalized = dependent ? Array(vk.length).fill(0) : scale(orthogonal, 1 / norm).map((value) => Number(value.toFixed(12)));

    orthogonalRows.push(orthogonal);
    normalizedRows.push(normalized);

    steps.push({
      type: 'finalize',
      vectorIndex,
      projectionIndex: projections.length - 1,
      residual: [...orthogonal],
      norm,
      normalized: [...normalized],
      formula: dependent
        ? `$$u_${vectorIndex + 1} \\approx 0 \\Rightarrow v_${vectorIndex + 1} \\in \\operatorname{span}(u_1, \\dots, u_${vectorIndex})$$`
        : `$$u_${vectorIndex + 1} = v_${vectorIndex + 1} - \\sum_{j=1}^{${vectorIndex}} \\operatorname{proj}_{u_j}(v_${vectorIndex + 1})$$`,
      logs: dependent
        ? [
            `${vectorLabel('v', vectorIndex)} is linearly dependent on previous rows.`,
            `Residual norm = ${formatNumber(norm)}.`,
            `The new orthogonal direction collapses to the zero vector.`,
          ]
        : [
            `${vectorLabel('u', vectorIndex)} is committed to the orthogonal basis.`,
            `Residual norm = ${formatNumber(norm)}.`,
            `Orthogonal row = [${orthogonal.map(formatNumber).join(', ')}]`,
          ],
      dependent,
    });

    steps.push({
      type: 'normalize',
      vectorIndex,
      projectionIndex: projections.length - 1,
      residual: [...orthogonal],
      norm,
      normalized: [...normalized],
      formula: dependent
        ? `$$\\lVert u_${vectorIndex + 1} \\rVert \\approx 0 \\Rightarrow e_${vectorIndex + 1} \\text{ is skipped}$$`
        : `$$e_${vectorIndex + 1} = \\frac{u_${vectorIndex + 1}}{\\lVert u_${vectorIndex + 1} \\rVert}$$`,
      logs: dependent
        ? [
            `Normalization is skipped because ${vectorLabel('u', vectorIndex)} is the zero vector.`,
            `No orthonormal row is added at this stage.`,
          ]
        : [
            `Normalization factor = 1 / ${formatNumber(norm)} = ${formatNumber(1 / norm)}.`,
            `${vectorLabel('e', vectorIndex)} = [${normalized.map(formatNumber).join(', ')}]`,
            `${vectorLabel('e', vectorIndex)} now has norm 1 by construction.`,
          ],
      dependent,
    });
  });

  return {
    steps,
    orthogonalRows,
    normalizedRows,
    dependentCount,
  };
}

function rebuildComputation(resetStepIndex) {
  stopPlayback();
  const { steps, orthogonalRows, normalizedRows, dependentCount } = computeSteps(state.matrix);
  state.steps = steps;
  state.orthogonalRows = orthogonalRows;
  state.normalizedRows = normalizedRows;
  state.dependentCount = dependentCount;
  if (resetStepIndex) {
    state.currentStepIndex = 0;
  } else {
    state.currentStepIndex = Math.min(state.currentStepIndex, Math.max(steps.length - 1, 0));
  }
  renderAll();
}

function renderProgress() {
  progressTrack.innerHTML = '';
  progressTrack.style.setProperty('--step-count', String(state.steps.length));
  state.steps.forEach((step, index) => {
    const node = document.createElement('div');
    node.className = 'progress-node';
    const fill = index < state.currentStepIndex ? 1 : index === state.currentStepIndex ? 0.66 : 0;
    node.style.setProperty('--fill', String(fill));
    node.title = `${vectorLabel(step.type === 'normalize' ? 'e' : 'u', step.vectorIndex)} · ${step.type}`;
    progressTrack.appendChild(node);
  });
}

function renderFormula(step) {
  formulaBox.innerHTML = `
    <div class="muted">Active formula</div>
    <div>${step.formula}</div>
  `;
  renderMath(formulaBox);
}

function renderWarning(step, dependentCount) {
  const prefix = dependentCount > 0 ? `Rank drop detected: ${dependentCount} dependent row(s).` : 'No rank issue detected.';
  if (step.dependent) {
    warningBox.classList.add('visible');
    warningBox.innerHTML = `<strong>Zero-vector warning.</strong> ${prefix} The current residual is numerically close to zero, so this direction does not contribute a new basis vector.`;
  } else {
    warningBox.classList.remove('visible');
    warningBox.textContent = '';
  }
}

function renderLogs(step) {
  logBox.innerHTML = '';
  step.logs.forEach((message) => {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logBox.appendChild(entry);
  });
}

function renderSummary(step) {
  const targetLabel = step.type === 'normalize' ? vectorLabel('e', step.vectorIndex) : vectorLabel('u', step.vectorIndex);
  const vectorData = step.type === 'normalize' ? step.normalized : step.residual;
  const factor = step.norm && step.norm > EPSILON ? 1 / step.norm : 0;
  summaryTitle.textContent = `${targetLabel} state`;
  summaryVector.textContent = `[${(vectorData ?? []).map(formatNumber).join(', ')}]`;
  summaryNorm.textContent = formatNumber(step.norm ?? 0);
  summaryFactor.textContent = formatNumber(factor);
  summaryPhase.textContent = step.type === 'normalize'
    ? 'Normalization'
    : step.type === 'finalize'
      ? 'Orthogonal commit'
      : step.type === 'initialize'
        ? 'Initialization'
        : 'Projection';
  summaryRank.textContent = step.dependent ? 'Dependent / skipped' : 'Independent';
}

function updateMeta(step, dependentCount) {
  metaStep.textContent = `${state.currentStepIndex + 1} / ${state.steps.length}`;
  metaVector.textContent = step.type === 'normalize'
    ? vectorLabel('e', step.vectorIndex)
    : vectorLabel('u', step.vectorIndex);
  metaStatus.textContent = step.type === 'normalize'
    ? 'Normalization phase'
    : step.type === 'finalize'
      ? 'Commit phase'
      : step.type === 'initialize'
        ? 'Initialization'
        : 'Projection phase';
  metaRank.textContent = dependentCount > 0 ? `Rank < ${state.dimension}` : 'Independent';

  const projectionTotal = Math.max(step.vectorIndex, 1);
  const projectionCurrent = step.type === 'projection' ? step.projectionIndex + 1 : projectionTotal;
  if (step.type === 'initialize') {
    timelineLabel.textContent = 'Initialization for the first row';
  } else if (step.type === 'normalize') {
    timelineLabel.textContent = `Normalization for ${vectorLabel('u', step.vectorIndex)}`;
  } else {
    timelineLabel.textContent = `Projection ${projectionCurrent} of ${projectionTotal}`;
  }
  timelineMode.textContent = state.playing ? 'Auto playback' : 'Manual playback';
  detailHint.textContent = state.dimension > 6
    ? 'Dense arithmetic is abbreviated when the dimension exceeds 6.'
    : 'All inner-product and normalization details are shown in the log for this dimension.';
}

function renderAll() {
  if (state.steps.length === 0) {
    return;
  }
  const step = state.steps[state.currentStepIndex];
  createInputMatrix();
  createOutputMatrix();
  createNormalizedMatrix();
  renderProgress();
  renderFormula(step);
  renderWarning(step, state.dependentCount);
  renderLogs(step);
  renderSummary(step);
  updateMeta(step, state.dependentCount);
}

function goToStep(index) {
  if (state.steps.length === 0) {
    return;
  }
  state.currentStepIndex = Math.max(0, Math.min(index, state.steps.length - 1));
  renderAll();
}

function stopPlayback() {
  state.playing = false;
  if (state.autoTimer) {
    window.clearInterval(state.autoTimer);
    state.autoTimer = null;
  }
  playToggleButton.textContent = 'Play';
  timelineMode.textContent = 'Manual playback';
}

function startPlayback() {
  stopPlayback();
  state.playing = true;
  playToggleButton.textContent = 'Pause';
  timelineMode.textContent = 'Auto playback';
  state.autoTimer = window.setInterval(() => {
    if (state.currentStepIndex >= state.steps.length - 1) {
      stopPlayback();
      return;
    }
    goToStep(state.currentStepIndex + 1);
  }, 1200);
}

function setMode(mode) {
  if (mode === 'auto') {
    startPlayback();
  } else {
    stopPlayback();
  }
}

function bindEvents() {
  dimensionSelect.addEventListener('change', (event) => {
    state.dimension = Number(event.target.value);
    loadSample(sampleSelect.value === 'random' ? 'default' : sampleSelect.value);
  });

  applySampleButton.addEventListener('click', () => {
    if (sampleSelect.value === 'random') {
      state.matrix = matrixToRows(sampleFactories.random(state.dimension));
      rebuildComputation(true);
      return;
    }
    loadSample(sampleSelect.value);
  });

  sampleSelect.addEventListener('change', () => {
    if (sampleSelect.value === 'random') {
      state.matrix = matrixToRows(sampleFactories.random(state.dimension));
      rebuildComputation(true);
    }
  });

  playModeSelect.addEventListener('change', (event) => {
    setMode(event.target.value);
  });

  recomputeButton.addEventListener('click', () => {
    state.matrix = collectInputMatrix();
    rebuildComputation(false);
  });

  clearMatrixButton.addEventListener('click', clearMatrix);
  prevStepButton.addEventListener('click', () => {
    stopPlayback();
    goToStep(state.currentStepIndex - 1);
  });
  nextStepButton.addEventListener('click', () => {
    stopPlayback();
    goToStep(state.currentStepIndex + 1);
  });
  resetStepsButton.addEventListener('click', () => {
    stopPlayback();
    goToStep(0);
  });
  playToggleButton.addEventListener('click', () => {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  openMathButton.addEventListener('click', () => {
    renderModalContent();
    mathModal.showModal();
  });
  closeMathButton.addEventListener('click', () => mathModal.close());
  languageToggle.addEventListener('click', () => {
    state.modalLanguage = state.modalLanguage === 'en' ? 'zhTW' : 'en';
    renderModalContent();
  });
  mathModal.addEventListener('click', (event) => {
    const bounds = mathModal.getBoundingClientRect();
    const clickedInDialog = (
      bounds.top <= event.clientY &&
      event.clientY <= bounds.top + bounds.height &&
      bounds.left <= event.clientX &&
      event.clientX <= bounds.left + bounds.width
    );
    if (!clickedInDialog) {
      mathModal.close();
    }
  });
}

function init() {
  syncDimensionSelect();
  state.matrix = matrixToRows(sampleFactories.default(state.dimension));
  bindEvents();
  rebuildComputation(true);
  renderModalContent();
}

init();
