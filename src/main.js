import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

const sampleSelect = document.getElementById('sample-select');
const applySampleButton = document.getElementById('apply-sample');
const prevStepButton = document.getElementById('prev-step');
const nextStepButton = document.getElementById('next-step');
const playToggleButton = document.getElementById('play-toggle');
const resetStepsButton = document.getElementById('reset-steps');
const openMathButton = document.getElementById('open-math');
const closeMathButton = document.getElementById('close-math');
const languageToggle = document.getElementById('language-toggle');
const mathModal = document.getElementById('math-modal');
const mathContent = document.getElementById('math-content');
const inputSpaceView = document.getElementById('input-space-view');
const orthonormalView = document.getElementById('orthonormal-view');
const inputSpaceNote = document.getElementById('input-space-note');
const orthonormalNote = document.getElementById('orthonormal-note');

const inputMatrixRoot = document.getElementById('input-matrix');
const outputMatrixRoot = document.getElementById('output-matrix');
const normalizedMatrixRoot = document.getElementById('normalized-matrix');
const rMatrixRoot = document.getElementById('r-matrix');
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
  rMatrix: [],
  steps: [],
  currentStepIndex: 0,
  playing: false,
  autoTimer: null,
  modalLanguage: 'en',
  dependentCount: 0,
};

const visualizationState = {
  instances: [],
};

const modalCopy = {
  en: `
    <p>The Gram-Schmidt process converts a linearly independent set $\\{v_1, v_2, \\dots, v_n\\}$ into an orthogonal set $\\{u_1, u_2, \\dots, u_n\\}$ by subtracting projections, then normalizes each nonzero row to obtain an orthonormal set $\\{e_1, e_2, \\dots, e_n\\}$.</p>
    <p>For QR decomposition in this lab, the identification is $A = V$, $Q = E$, and $R = Q^T A$.</p>
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
    <p>The entries of $R$ come directly from the same steps:</p>
    <p>$$
      r_{jk} = \\langle e_j, v_k \\rangle \\quad (j &lt; k),
      \\qquad
      r_{kk} = \\lVert u_k \\rVert
    $$</p>
    <p>Why does this become $R = Q^T A$? Start from the QR factorization</p>
    <p>$$
      A = QR
    $$</p>
    <p>Because the columns or rows of $Q$ are orthonormal in this lab's convention, we have</p>
    <p>$$
      Q^T Q = I
    $$</p>
    <p>Multiplying $A = QR$ on the left by $Q^T$ gives</p>
    <p>$$
      Q^T A = Q^T Q R = I R = R
    $$</p>
    <p>So each entry of $R$ is just the coordinate of $A$ measured in the orthonormal basis $Q$, which is why the projection coefficients fill the upper-triangular matrix.</p>
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
    <p>在這個工具裡，QR 分解的對應關係是 $A = V$、$Q = E$、$R = Q^T A$。</p>
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
    <p>$R$ 的每個元素其實就是同一套過程中的係數：</p>
    <p>$$
      r_{jk} = \\langle e_j, v_k \\rangle \\quad (j &lt; k),
      \\qquad
      r_{kk} = \\lVert u_k \\rVert
    $$</p>
    <p>那麼為什麼會推出 $R = Q^T A$？先從 QR 分解本身開始：</p>
    <p>$$
      A = QR
    $$</p>
    <p>因為在這個工具的記號下，$Q$ 的欄或列是正交且長度為 1 的，所以有：</p>
    <p>$$
      Q^T Q = I
    $$</p>
    <p>把 $A = QR$ 左乘 $Q^T$，就得到：</p>
    <p>$$
      Q^T A = Q^T Q R = I R = R
    $$</p>
    <p>所以 $R$ 的每個元素，本質上就是把 $A$ 投影到正交標準基底 $Q$ 上得到的座標，這也是為什麼前面那些 projection coefficient 會正好填進上三角矩陣。</p>
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

function getColor(index) {
  return COLORS[index % COLORS.length];
}

function colorToThree(index) {
  return new THREE.Color(getColor(index));
}

function matrixToRows(matrix) {
  return matrix.map((row) => [...row]);
}

function toVector3(values) {
  return new THREE.Vector3(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0);
}

function clearThreeGroup(group) {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else if (child.material) {
      child.material.dispose();
    }
  }
}

function computeSceneRadius(vectors) {
  const maxMagnitude = vectors.reduce((maxValue, vector) => {
    const current = Array.isArray(vector) ? magnitude(vector) : vector.length();
    return Math.max(maxValue, current);
  }, 1);
  return Math.max(1.5, maxMagnitude * 1.35);
}

function addSceneFrame(group, vectors, color) {
  const v1 = toVector3(vectors[0]);
  const v2 = toVector3(vectors[1]);
  const v3 = toVector3(vectors[2]);
  const points = [
    new THREE.Vector3(0, 0, 0),
    v1.clone(),
    v2.clone(),
    v3.clone(),
    v1.clone().add(v2),
    v1.clone().add(v3),
    v2.clone().add(v3),
    v1.clone().add(v2).add(v3),
  ];
  const edges = [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [1, 5],
    [2, 4], [2, 6],
    [3, 5], [3, 6],
    [4, 7], [5, 7], [6, 7],
  ];
  const positions = [];
  edges.forEach(([from, to]) => {
    positions.push(points[from].x, points[from].y, points[from].z);
    positions.push(points[to].x, points[to].y, points[to].z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.34 }),
  );
  group.add(line);
}

function addParallelepipedMesh(group, vectors, color) {
  const v1 = toVector3(vectors[0]);
  const v2 = toVector3(vectors[1]);
  const v3 = toVector3(vectors[2]);
  const points = [
    new THREE.Vector3(0, 0, 0),
    v1.clone(),
    v2.clone(),
    v3.clone(),
    v1.clone().add(v2),
    v1.clone().add(v3),
    v2.clone().add(v3),
    v1.clone().add(v2).add(v3),
  ];
  const indices = [
    0, 1, 4, 0, 4, 2,
    0, 1, 5, 0, 5, 3,
    0, 2, 6, 0, 6, 3,
    7, 4, 1, 7, 1, 5,
    7, 6, 2, 7, 2, 4,
    7, 5, 3, 7, 3, 6,
  ];
  const positions = [];
  points.forEach((point) => {
    positions.push(point.x, point.y, point.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
      depthWrite: false,
    }),
  );
  group.add(mesh);
}

function createVisualization(container) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(5.4, 4.8, 5.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.4;
  controls.maxDistance = 18;

  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  const directional = new THREE.DirectionalLight(0xdfefff, 0.9);
  directional.position.set(4, 6, 5);
  scene.add(ambient, directional);

  const grid = new THREE.GridHelper(10, 10, 0x36506c, 0x243447);
  grid.position.y = -0.001;
  scene.add(grid);

  const axes = new THREE.AxesHelper(1.5);
  axes.name = 'scene-axes';
  scene.add(axes);

  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xe5edf7 }),
  );
  scene.add(origin);

  const dynamicGroup = new THREE.Group();
  scene.add(dynamicGroup);

  return {
    container,
    scene,
    renderer,
    camera,
    controls,
    dynamicGroup,
    radius: 4,
    frameKey: null,
  };
}

function updateVisualizationSize(instance) {
  const width = Math.max(instance.container.clientWidth, 1);
  const height = Math.max(instance.container.clientHeight, 340);
  instance.camera.aspect = width / height;
  instance.camera.updateProjectionMatrix();
  instance.renderer.setSize(width, height, false);
}

function focusVisualization(instance, radius) {
  instance.radius = radius;
  instance.camera.position.set(radius * 1.08, radius * 0.96, radius * 1.14);
  instance.camera.near = 0.1;
  instance.camera.far = Math.max(100, radius * 12);
  instance.camera.updateProjectionMatrix();
  instance.controls.target.set(0, 0, 0);
  const axesHelper = instance.scene.getObjectByName('scene-axes');
  if (axesHelper) {
    axesHelper.position.set(-radius * 0.82, 0, -radius * 0.82);
  }
  instance.controls.update();
}

function ensureVisualizationFocus(instance, radius, frameKey) {
  if (instance.frameKey === frameKey) {
    return;
  }
  focusVisualization(instance, radius);
  instance.frameKey = frameKey;
}

function addArrow(group, vectorValues, color, { active = false } = {}) {
  const directionVector = Array.isArray(vectorValues) ? toVector3(vectorValues) : vectorValues.clone();
  const length = directionVector.length();
  if (length < EPSILON) {
    return;
  }

  const arrow = new THREE.ArrowHelper(
    directionVector.clone().normalize(),
    new THREE.Vector3(0, 0, 0),
    length,
    color.getHex(),
    Math.min(0.3, length * 0.18),
    Math.min(0.18, length * 0.1),
  );

  if (active) {
    arrow.line.material.linewidth = 2;
  }
  if (!active) {
    arrow.line.material.transparent = true;
    arrow.line.material.opacity = 0.88;
    arrow.cone.material.transparent = true;
    arrow.cone.material.opacity = 0.88;
  }

  group.add(arrow);
}

function getVisibleNormalizedCount(step) {
  if (step.type === 'normalize') {
    return step.vectorIndex + 1;
  }
  return step.vectorIndex;
}

function renderInputSpace() {
  const instance = visualizationState.instances[0];
  const step = state.steps[state.currentStepIndex];
  const rankDeficient = state.dependentCount > 0;
  clearThreeGroup(instance.dynamicGroup);

  const radius = computeSceneRadius(state.matrix);
  ensureVisualizationFocus(instance, radius, JSON.stringify(state.matrix));

  state.matrix.forEach((vector, index) => {
    addArrow(
      instance.dynamicGroup,
      vector,
      colorToThree(index),
      { active: index === step.vectorIndex },
    );
  });

  const determinant = (
    state.matrix[0][0] * (state.matrix[1][1] * state.matrix[2][2] - state.matrix[1][2] * state.matrix[2][1]) -
    state.matrix[0][1] * (state.matrix[1][0] * state.matrix[2][2] - state.matrix[1][2] * state.matrix[2][0]) +
    state.matrix[0][2] * (state.matrix[1][0] * state.matrix[2][1] - state.matrix[1][1] * state.matrix[2][0])
  );
  if (Math.abs(determinant) >= EPSILON) {
    addSceneFrame(instance.dynamicGroup, state.matrix, new THREE.Color('#7cc7d9'));
  }

  inputSpaceNote.textContent = rankDeficient
    ? 'The input rows do not span a full 3D volume, so one direction collapses into the span of the earlier vectors.'
    : `The highlighted row is v${step.vectorIndex + 1}. Together, the three input rows span a full 3D volume.`;
}

function renderOrthonormalSpace() {
  const instance = visualizationState.instances[1];
  const step = state.steps[state.currentStepIndex];
  clearThreeGroup(instance.dynamicGroup);

  const visibleCount = getVisibleNormalizedCount(step);
  const visibleVectors = state.normalizedRows.slice(0, visibleCount).filter((vector) => magnitude(vector) >= EPSILON);
  const sceneVectors = visibleVectors.length > 0 ? visibleVectors : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const radius = computeSceneRadius(sceneVectors);
  ensureVisualizationFocus(instance, radius, `orthonormal:${JSON.stringify(state.matrix)}`);

  const determinant = (
    state.matrix[0][0] * (state.matrix[1][1] * state.matrix[2][2] - state.matrix[1][2] * state.matrix[2][1]) -
    state.matrix[0][1] * (state.matrix[1][0] * state.matrix[2][2] - state.matrix[1][2] * state.matrix[2][0]) +
    state.matrix[0][2] * (state.matrix[1][0] * state.matrix[2][1] - state.matrix[1][1] * state.matrix[2][0])
  );
  if (Math.abs(determinant) >= EPSILON) {
    addParallelepipedMesh(instance.dynamicGroup, state.matrix, new THREE.Color('#7cc7d9'));
    addSceneFrame(instance.dynamicGroup, state.matrix, new THREE.Color('#7cc7d9'));
  }

  state.normalizedRows.forEach((vector, index) => {
    const isVisible = index < visibleCount && magnitude(vector) >= EPSILON;
    if (!isVisible) {
      return;
    }
    addArrow(
      instance.dynamicGroup,
      vector,
      colorToThree(index),
      { active: step.type === 'normalize' && index === step.vectorIndex },
    );
  });

  if (visibleVectors.length === 0) {
    const placeholder = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.02, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x4c647d, transparent: true, opacity: 0.36 }),
    );
    placeholder.rotation.x = Math.PI / 2;
    instance.dynamicGroup.add(placeholder);
  }

  orthonormalNote.textContent = visibleCount === 0
    ? 'No orthonormal row is available yet. The translucent V-space stays in view as geometric context.'
    : step.type === 'normalize'
      ? `The highlighted unit vector is e${step.vectorIndex + 1}. The translucent body shows the original span of V behind it.`
      : `Rows e1 to e${visibleCount} are already locked as the orthonormal basis Q, with the original V-space kept as context.`;
}

function renderVisualizations() {
  if (visualizationState.instances.length === 0 || state.steps.length === 0) {
    return;
  }
  visualizationState.instances.forEach(updateVisualizationSize);
  renderInputSpace();
  renderOrthonormalSpace();
}

function animateVisualizations() {
  window.requestAnimationFrame(animateVisualizations);
  visualizationState.instances.forEach((instance) => {
    instance.controls.update();
    instance.renderer.render(instance.scene, instance.camera);
  });
}

function initVisualizations() {
  visualizationState.instances = [
    createVisualization(inputSpaceView),
    createVisualization(orthonormalView),
  ];
  visualizationState.instances.forEach(updateVisualizationSize);
  window.addEventListener('resize', () => {
    visualizationState.instances.forEach(updateVisualizationSize);
  });
  animateVisualizations();
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

function loadSample(type) {
  state.matrix = matrixToRows(sampleFactories[type](state.dimension));
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

function createRMatrix() {
  rMatrixRoot.innerHTML = '';
  const step = state.steps[state.currentStepIndex];
  const snapshot = step.rMatrixSnapshot ?? state.rMatrix;
  const activeColumn = step.vectorIndex;

  for (let rowIndex = 0; rowIndex < state.dimension; rowIndex += 1) {
    const rowNode = document.createElement('div');
    rowNode.className = 'matrix-row';
    rowNode.style.gridTemplateColumns = `64px repeat(${state.dimension}, minmax(0, 1fr))`;

    const badge = document.createElement('div');
    badge.className = 'row-badge';
    badge.textContent = vectorLabel('r', rowIndex);
    badge.style.background = getColor(rowIndex);
    rowNode.appendChild(badge);

    for (let colIndex = 0; colIndex < state.dimension; colIndex += 1) {
      const cell = document.createElement('div');
      cell.className = 'matrix-output';
      const value = snapshot[rowIndex]?.[colIndex] ?? null;

      if (rowIndex > colIndex) {
        cell.textContent = '0';
        cell.classList.add('pending');
      } else {
        const visible = colIndex < activeColumn || (colIndex === activeColumn && value !== null);
        cell.textContent = visible ? formatNumber(value) : '...';
        if (!visible) {
          cell.classList.add('pending');
        }
      }

      rowNode.appendChild(cell);
    }

    rMatrixRoot.appendChild(rowNode);
  }
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
  const rMatrix = Array.from({ length: matrix.length }, () => Array(matrix.length).fill(null));
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
        rMatrixSnapshot: rMatrix.map((row) => [...row]),
        rEntry: { row: 0, col: 0, value: null, pending: true },
        logs: [
          `${vectorLabel('v', vectorIndex)} starts the basis directly.`,
          `Residual = [${vk.map(formatNumber).join(', ')}]`,
        ],
        dependent: false,
      });
    }

    normalizedRows.forEach((ej, projectionIndex) => {
      const rValue = dot(vk, ej);
      const projected = scale(ej, rValue);
      residual = subtract(residual, projected);
      projections.push(projected);
      rMatrix[projectionIndex][vectorIndex] = Number(rValue.toFixed(12));

      const verbose = matrix.length <= 6;
      const logs = [
        `R entry ${vectorLabel('r', projectionIndex)}${vectorIndex + 1} is ${formatNumber(rValue)} from dot(${vectorLabel('e', projectionIndex)}, ${vectorLabel('v', vectorIndex)}).`,
        verbose
          ? `dot(${vectorLabel('e', projectionIndex)}, ${vectorLabel('v', vectorIndex)}) = ${formatNumber(rValue)}.`
          : `Inner-product detail hidden in compact mode for dimension ${matrix.length}.`,
        `Projected component = ${formatNumber(rValue)} · ${vectorLabel('e', projectionIndex)} = [${projected.map(formatNumber).join(', ')}]`,
        `Residual after subtraction = [${residual.map(formatNumber).join(', ')}]`,
      ];

      steps.push({
        type: 'projection',
        vectorIndex,
        projectionIndex,
        residual: [...residual],
        coefficient: rValue,
        norm: magnitude(residual),
        normalized: null,
        formula: `$$r_{${projectionIndex + 1},${vectorIndex + 1}} = \\langle e_${projectionIndex + 1}, v_${vectorIndex + 1} \\rangle, \\qquad u_${vectorIndex + 1}^{(${projectionIndex + 1})} = v_${vectorIndex + 1} - \\sum_{j=1}^{${projectionIndex + 1}} r_{j,${vectorIndex + 1}} e_j$$`,
        rMatrixSnapshot: rMatrix.map((row) => [...row]),
        rEntry: { row: projectionIndex, col: vectorIndex, value: rValue, pending: false },
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
      rMatrixSnapshot: rMatrix.map((row) => [...row]),
      rEntry: { row: vectorIndex, col: vectorIndex, value: norm, pending: true },
      formula: dependent
        ? `$$u_${vectorIndex + 1} \\approx 0 \\Rightarrow v_${vectorIndex + 1} \\in \\operatorname{span}(e_1, \\dots, e_${vectorIndex})$$`
        : `$$u_${vectorIndex + 1} = v_${vectorIndex + 1} - \\sum_{j=1}^{${vectorIndex}} r_{j,${vectorIndex + 1}} e_j$$`,
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
            `The diagonal QR entry will unlock at normalization: r_${vectorIndex + 1}${vectorIndex + 1} = ||${vectorLabel('u', vectorIndex)}|| = ${formatNumber(norm)}.`,
          ],
      dependent,
    });

    rMatrix[vectorIndex][vectorIndex] = dependent ? 0 : Number(norm.toFixed(12));

    steps.push({
      type: 'normalize',
      vectorIndex,
      projectionIndex: projections.length - 1,
      residual: [...orthogonal],
      norm,
      normalized: [...normalized],
      rMatrixSnapshot: rMatrix.map((row) => [...row]),
      rEntry: { row: vectorIndex, col: vectorIndex, value: dependent ? 0 : norm, pending: false },
      formula: dependent
        ? `$$\\lVert u_${vectorIndex + 1} \\rVert \\approx 0 \\Rightarrow e_${vectorIndex + 1} \\text{ is skipped}$$`
        : `$$r_{${vectorIndex + 1},${vectorIndex + 1}} = \\lVert u_${vectorIndex + 1} \\rVert, \\qquad e_${vectorIndex + 1} = \\frac{u_${vectorIndex + 1}}{r_{${vectorIndex + 1},${vectorIndex + 1}}}$$`,
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
    rMatrix,
    dependentCount,
  };
}

function rebuildComputation(resetStepIndex) {
  stopPlayback();
  const { steps, orthogonalRows, normalizedRows, rMatrix, dependentCount } = computeSteps(state.matrix);
  state.steps = steps;
  state.orthogonalRows = orthogonalRows;
  state.normalizedRows = normalizedRows;
  state.rMatrix = rMatrix;
  state.dependentCount = dependentCount;
  if (resetStepIndex) {
    state.currentStepIndex = 0;
  } else {
    state.currentStepIndex = Math.min(state.currentStepIndex, Math.max(steps.length - 1, 0));
  }
  renderAll();
}

function renderProgress() {
  const currentStep = state.steps[state.currentStepIndex];
  progressTrack.innerHTML = '';
  for (let vectorIndex = 0; vectorIndex < state.dimension; vectorIndex += 1) {
    const node = document.createElement('div');
    node.className = 'progress-node';
    let fill = 0;
    if (vectorIndex < currentStep.vectorIndex) {
      fill = 1;
    } else if (vectorIndex === currentStep.vectorIndex) {
      if (currentStep.type === 'normalize') {
        fill = 1;
      } else if (currentStep.type === 'finalize') {
        fill = 0.72;
      } else {
        fill = 0.38;
      }
    }
    node.style.setProperty('--fill', String(fill));
    node.title = `${vectorLabel('u', vectorIndex)} progress`;
    progressTrack.appendChild(node);
  }
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
  const stepsToRender = state.steps
    .slice(0, state.currentStepIndex + 1)
    .map((entryStep, stepIndex) => ({ entryStep, stepIndex }))
    .reverse();

  stepsToRender.forEach(({ entryStep, stepIndex }) => {
    const stepGroup = document.createElement('section');
    stepGroup.className = 'log-step';
    if (stepIndex === state.currentStepIndex) {
      stepGroup.classList.add('current');
    }

    const header = document.createElement('div');
    header.className = 'log-step-header';

    const badge = document.createElement('div');
    badge.className = 'log-step-badge';
    badge.textContent = `Step ${stepIndex + 1} · ${vectorLabel('v', entryStep.vectorIndex)}`;

    const status = document.createElement('div');
    status.className = 'log-step-status';
    status.textContent = entryStep.type === 'normalize'
      ? 'Normalization'
      : entryStep.type === 'finalize'
        ? 'Commit'
        : entryStep.type === 'initialize'
          ? 'Initialization'
          : `Projection ${entryStep.projectionIndex + 1}`;

    header.appendChild(badge);
    header.appendChild(status);
    stepGroup.appendChild(header);

    const total = entryStep.logs.length;
    entryStep.logs.forEach((message, index) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';

      const number = document.createElement('div');
      number.className = 'log-index';
      number.textContent = `#${total - index}`;

      const content = document.createElement('div');
      content.className = 'log-message';
      content.textContent = message;

      entry.appendChild(number);
      entry.appendChild(content);
      stepGroup.appendChild(entry);
    });

    logBox.appendChild(stepGroup);
  });

  logBox.scrollTop = 0;
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
  detailHint.textContent = 'All projection coefficients, residuals, and diagonal QR entries are shown in the log.';
}

function renderAll() {
  if (state.steps.length === 0) {
    return;
  }
  const step = state.steps[state.currentStepIndex];
  createInputMatrix();
  createOutputMatrix();
  createNormalizedMatrix();
  createRMatrix();
  renderProgress();
  renderFormula(step);
  renderWarning(step, state.dependentCount);
  renderLogs(step);
  updateMeta(step, state.dependentCount);
  renderVisualizations();
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

function bindEvents() {
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
  state.matrix = matrixToRows(sampleFactories.default(state.dimension));
  initVisualizations();
  bindEvents();
  rebuildComputation(true);
  renderModalContent();
}

init();
