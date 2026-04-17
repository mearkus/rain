// ─── Constants ────────────────────────────────────────────────────────────────

const TILE_SIZE = 72;
const BOARD_PADDING = 72;

// 28 tiles, each [top, right, bottom, left], flowers 0-7.
// Every tile has 4 UNIQUE edge values.
// Built from 6 rotation-groups of 4 + 4 bridge tiles:
//   each flower appears exactly 14 times total, 3-4 times per side.
const TILES = [
  // Group 1 — {0,1,2,3} rotations
  [0, 1, 2, 3],  //  0
  [1, 2, 3, 0],  //  1
  [2, 3, 0, 1],  //  2
  [3, 0, 1, 2],  //  3
  // Group 2 — {4,5,6,7} rotations
  [4, 5, 6, 7],  //  4
  [5, 6, 7, 4],  //  5
  [6, 7, 4, 5],  //  6
  [7, 4, 5, 6],  //  7
  // Group 3 — {0,1,4,5} rotations
  [0, 1, 4, 5],  //  8
  [1, 4, 5, 0],  //  9
  [4, 5, 0, 1],  // 10
  [5, 0, 1, 4],  // 11
  // Group 4 — {2,3,6,7} rotations
  [2, 3, 6, 7],  // 12
  [3, 6, 7, 2],  // 13
  [6, 7, 2, 3],  // 14
  [7, 2, 3, 6],  // 15
  // Group 5 — {0,2,4,6} rotations
  [0, 2, 4, 6],  // 16
  [2, 4, 6, 0],  // 17
  [4, 6, 0, 2],  // 18
  [6, 0, 2, 4],  // 19
  // Group 6 — {1,3,5,7} rotations
  [1, 3, 5, 7],  // 20
  [3, 5, 7, 1],  // 21
  [5, 7, 1, 3],  // 22
  [7, 1, 3, 5],  // 23
  // Bridge tiles — fill gaps so every flower hits exactly 14 total
  [0, 2, 5, 7],  // 24  {0,2,5,7}
  [1, 3, 4, 6],  // 25  {1,3,4,6}
  [3, 7, 0, 4],  // 26  {0,3,4,7}
  [2, 6, 1, 5],  // 27  {1,2,5,6}
];

const FLOWER_COLORS = [
  '#ff006e', // 0 Rose    — neon magenta
  '#4d9fff', // 1 Iris    — electric blue
  '#00f5ff', // 2 Lotus   — neon cyan
  '#f700ff', // 3 Cherry  — hot violet
  '#9b5de5', // 4 Plum    — deep neon purple
  '#39ff14', // 5 Lily    — acid green
  '#ff6b00', // 6 Orchid  — electric orange
  '#ffe600', // 7 Peony   — neon yellow
];

const FLOWER_NAMES = ['Rose','Iris','Lotus','Cherry','Plum','Lily','Orchid','Peony'];

const EDGE_IDX = { t: 0, r: 1, b: 2, l: 3 };
const OPPOSITE  = { t: 'b', r: 'l', b: 't', l: 'r' };
const NEIGHBORS = [
  { dc:  0, dr: -1, side: 't' },
  { dc:  1, dr:  0, side: 'r' },
  { dc:  0, dr:  1, side: 'b' },
  { dc: -1, dr:  0, side: 'l' },
];

// ─── State ─────────────────────────────────────────────────────────────────────

const state = {
  deck:        [],
  board:       new Map(),   // "col,row" → tileIdx
  currentTile: null,
  validSpots:  [],          // [{col, row}]
  tokens:      new Array(8).fill(false),  // placed[flowerIdx]
  boardBounds: { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 },
  panOffset:   { x: 0, y: 0 },
  phase:       'playing',   // 'playing' | 'won' | 'ended'
  score:       0,
  blossoms:    new Set(),   // "cx,cy" corner keys
};

// ─── DOM caches ────────────────────────────────────────────────────────────────

const tileElements    = new Map();  // boardKey  → element
const spotElements    = new Map();  // boardKey  → element
const blossomElements = new Map();  // cornerKey → element

// ─── Utilities ─────────────────────────────────────────────────────────────────

function edgeOf(tileIdx, side) {
  return TILES[tileIdx][EDGE_IDX[side]];
}

function boardKey(col, row) {
  return `${col},${row}`;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Placement validation ──────────────────────────────────────────────────────

function isValidPlacement(tileIdx, col, row) {
  if (state.board.has(boardKey(col, row))) return false;
  let hasNeighbor = false;
  for (const { dc, dr, side } of NEIGHBORS) {
    const nc = col + dc, nr = row + dr;
    const nKey = boardKey(nc, nr);
    if (state.board.has(nKey)) {
      hasNeighbor = true;
      const neighborTile = state.board.get(nKey);
      if (edgeOf(tileIdx, side) !== edgeOf(neighborTile, OPPOSITE[side])) {
        return false;
      }
    }
  }
  return hasNeighbor;
}

function findValidSpots(tileIdx) {
  const candidates = new Set();
  for (const key of state.board.keys()) {
    const [col, row] = key.split(',').map(Number);
    for (const { dc, dr } of NEIGHBORS) {
      const nc = col + dc, nr = row + dr;
      const nKey = boardKey(nc, nr);
      if (!state.board.has(nKey)) candidates.add(nKey);
    }
  }
  const spots = [];
  for (const key of candidates) {
    const [col, row] = key.split(',').map(Number);
    if (isValidPlacement(tileIdx, col, row)) spots.push({ col, row });
  }
  return spots;
}

// ─── Board bounds ──────────────────────────────────────────────────────────────

function updateBounds(col, row) {
  const b = state.boardBounds;
  const oldMinCol = b.minCol;
  const oldMinRow = b.minRow;

  b.minCol = Math.min(b.minCol, col);
  b.maxCol = Math.max(b.maxCol, col);
  b.minRow = Math.min(b.minRow, row);
  b.maxRow = Math.max(b.maxRow, row);

  // Compensate pan so existing tiles don't jump when bounds expand negatively
  if (b.minCol < oldMinCol) state.panOffset.x -= (oldMinCol - b.minCol) * TILE_SIZE;
  if (b.minRow < oldMinRow) state.panOffset.y -= (oldMinRow - b.minRow) * TILE_SIZE;
}

// ─── Blossom detection ─────────────────────────────────────────────────────────

function getBlossomFlowers(cx, cy) {
  // Corner (cx,cy) is the top-left corner of tile (cx,cy).
  // The four surrounding tiles are: (cx-1,cy-1) tl, (cx,cy-1) tr, (cx-1,cy) bl, (cx,cy) br.
  const tl = state.board.get(boardKey(cx - 1, cy - 1));
  const tr = state.board.get(boardKey(cx,     cy - 1));
  const bl = state.board.get(boardKey(cx - 1, cy    ));
  const br = state.board.get(boardKey(cx,     cy    ));
  const flowers = new Set();
  if (tl !== undefined) { flowers.add(edgeOf(tl, 'r')); flowers.add(edgeOf(tl, 'b')); }
  if (tr !== undefined) { flowers.add(edgeOf(tr, 'l')); flowers.add(edgeOf(tr, 'b')); }
  if (bl !== undefined) { flowers.add(edgeOf(bl, 'r')); flowers.add(edgeOf(bl, 't')); }
  if (br !== undefined) { flowers.add(edgeOf(br, 'l')); flowers.add(edgeOf(br, 't')); }
  return flowers;
}

function checkBlossoms(placedCol, placedRow) {
  // The placed tile participates in 4 potential blossom corners
  const corners = [
    [placedCol,     placedRow    ],
    [placedCol + 1, placedRow    ],
    [placedCol,     placedRow + 1],
    [placedCol + 1, placedRow + 1],
  ];

  for (const [cx, cy] of corners) {
    const tl = state.board.get(boardKey(cx - 1, cy - 1));
    const tr = state.board.get(boardKey(cx,     cy - 1));
    const bl = state.board.get(boardKey(cx - 1, cy    ));
    const br = state.board.get(boardKey(cx,     cy    ));
    if (tl === undefined || tr === undefined || bl === undefined || br === undefined) continue;

    const cornerKey = boardKey(cx, cy);
    if (state.blossoms.has(cornerKey)) continue;  // already processed

    state.blossoms.add(cornerKey);

    // Claim the first available matching token
    const flowers = getBlossomFlowers(cx, cy);
    for (const f of flowers) {
      if (!state.tokens[f]) {
        state.tokens[f] = true;
        break;
      }
    }
  }

  // Update score
  if (state.tokens.every(Boolean)) {
    state.score = 8 + state.deck.length;
    state.phase = 'won';
  } else {
    state.score = state.tokens.filter(Boolean).length;
  }
}

// ─── Game flow ─────────────────────────────────────────────────────────────────

function drawNextTile() {
  // Draw and discard until we find a placeable tile or exhaust the deck
  while (state.deck.length > 0) {
    const candidate = state.deck.shift();
    const spots = findValidSpots(candidate);
    if (spots.length > 0) {
      state.currentTile = candidate;
      state.validSpots = spots;
      return;
    }
    // No valid spots — silently discard
  }
  // Deck exhausted
  state.currentTile = null;
  state.validSpots = [];
  state.phase = 'ended';
  state.score = state.tokens.filter(Boolean).length;
}

function placeTile(col, row) {
  if (state.phase !== 'playing') return;
  if (state.currentTile === null) return;
  if (!state.validSpots.some(s => s.col === col && s.row === row)) return;

  const tileIdx = state.currentTile;
  state.currentTile = null;
  state.validSpots = [];

  state.board.set(boardKey(col, row), tileIdx);
  updateBounds(col, row);
  checkBlossoms(col, row);

  if (state.phase !== 'won') {
    drawNextTile();
  }

  render();

  if (state.phase !== 'playing') {
    setTimeout(showOverlay, 600);
  } else {
    autoPanToTile(col, row);
  }
}

function initGame() {
  // Clear DOM caches
  tileElements.clear();
  spotElements.clear();
  blossomElements.clear();
  document.getElementById('board').innerHTML = '';

  // Reset state
  const fullDeck = shuffleArray([...Array(TILES.length).keys()]);
  state.deck        = fullDeck;
  state.board       = new Map();
  state.currentTile = null;
  state.validSpots  = [];
  state.tokens      = new Array(8).fill(false);
  state.boardBounds = { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
  state.panOffset   = { x: 0, y: 0 };
  state.phase       = 'playing';
  state.score       = 0;
  state.blossoms    = new Set();

  // Place first tile at origin (no rules check)
  const firstTile = state.deck.shift();
  state.board.set(boardKey(0, 0), firstTile);

  hideOverlay();
  drawNextTile();
  render();
  centerBoard();
}

// ─── Pixel helpers ─────────────────────────────────────────────────────────────

function tileX(col) {
  return (col - state.boardBounds.minCol) * TILE_SIZE + BOARD_PADDING;
}

function tileY(row) {
  return (row - state.boardBounds.minRow) * TILE_SIZE + BOARD_PADDING;
}

// ─── Rendering ─────────────────────────────────────────────────────────────────

function createTileElement(tileIdx) {
  const el = document.createElement('div');
  el.className = 'tile';
  const sides = [
    ['top',    't'],
    ['right',  'r'],
    ['bottom', 'b'],
    ['left',   'l'],
  ];
  for (const [cls, key] of sides) {
    const petal = document.createElement('div');
    petal.className = `petal ${cls}`;
    petal.style.background = FLOWER_COLORS[edgeOf(tileIdx, key)];
    el.appendChild(petal);
  }
  const center = document.createElement('div');
  center.className = 'tile-center';
  el.appendChild(center);
  return el;
}

function renderBoard() {
  const board = document.getElementById('board');
  const b = state.boardBounds;
  const boardW = (b.maxCol - b.minCol + 1) * TILE_SIZE + 2 * BOARD_PADDING;
  const boardH = (b.maxRow - b.minRow + 1) * TILE_SIZE + 2 * BOARD_PADDING;
  board.style.width  = boardW + 'px';
  board.style.height = boardH + 'px';

  for (const [key, tileIdx] of state.board) {
    const [col, row] = key.split(',').map(Number);
    const x = tileX(col), y = tileY(row);
    if (!tileElements.has(key)) {
      const el = createTileElement(tileIdx);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.classList.add('placing');
      board.appendChild(el);
      tileElements.set(key, el);
      el.addEventListener('animationend', () => el.classList.remove('placing'), { once: true });
    } else {
      // Reposition in case bounds changed
      const el = tileElements.get(key);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    }
  }
}

function renderValidSpots() {
  const board = document.getElementById('board');
  const currentKeys = new Set(state.validSpots.map(s => boardKey(s.col, s.row)));

  // Remove stale spots
  for (const [key, el] of spotElements) {
    if (!currentKeys.has(key)) { el.remove(); spotElements.delete(key); }
  }

  // Add / reposition valid spots
  for (const { col, row } of state.validSpots) {
    const key = boardKey(col, row);
    const x = tileX(col), y = tileY(row);
    if (!spotElements.has(key)) {
      const el = document.createElement('div');
      el.className = 'valid-spot';
      el.dataset.col = col;
      el.dataset.row = row;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      board.appendChild(el);
      spotElements.set(key, el);
    } else {
      const el = spotElements.get(key);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    }
  }
}

function renderBlossomLayer() {
  const board = document.getElementById('board');
  for (const key of state.blossoms) {
    const [cx, cy] = key.split(',').map(Number);
    const x = tileX(cx), y = tileY(cy);
    if (!blossomElements.has(key)) {
      const el = document.createElement('div');
      el.className = 'blossom-dot new';
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      board.appendChild(el);
      blossomElements.set(key, el);
      el.addEventListener('animationend', () => el.classList.remove('new'), { once: true });
    } else {
      const el = blossomElements.get(key);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    }
  }
}

function renderCurrentTile() {
  const container = document.getElementById('current-tile-container');
  container.innerHTML = '';
  if (state.currentTile === null) {
    container.textContent = '—';
    return;
  }
  const el = createTileElement(state.currentTile);
  el.style.position = 'relative';
  el.style.width  = '52px';
  el.style.height = '52px';
  container.appendChild(el);
}

function renderTokenRack() {
  const rack = document.getElementById('token-rack');
  // Build token elements lazily / update in place
  const existing = rack.children;
  for (let i = 0; i < 8; i++) {
    let token = existing[i];
    if (!token) {
      token = document.createElement('div');
      token.className = 'token';
      token.style.background = FLOWER_COLORS[i];
      token.style.setProperty('--token-color', FLOWER_COLORS[i]);
      token.title = FLOWER_NAMES[i];
      rack.appendChild(token);
    }
    if (state.tokens[i]) {
      token.classList.add('placed');
    } else {
      token.classList.remove('placed');
    }
  }
}

function renderUI() {
  document.getElementById('deck-count').textContent = `Deck: ${state.deck.length}`;
  document.getElementById('score').textContent      = `Score: ${state.score}`;
}

function render() {
  renderBoard();
  renderValidSpots();
  renderBlossomLayer();
  renderCurrentTile();
  renderTokenRack();
  renderUI();
  applyPan(false);
}

// ─── Pan / center ──────────────────────────────────────────────────────────────

function applyPan(animate) {
  const board = document.getElementById('board');
  if (!board) return;
  board.style.transition = animate ? 'transform 0.3s ease-out' : 'none';
  board.style.transform  = `translate(${state.panOffset.x}px, ${state.panOffset.y}px)`;
}

function centerBoard() {
  const viewport = document.getElementById('board-viewport');
  const b = state.boardBounds;
  const boardW = (b.maxCol - b.minCol + 1) * TILE_SIZE + 2 * BOARD_PADDING;
  const boardH = (b.maxRow - b.minRow + 1) * TILE_SIZE + 2 * BOARD_PADDING;
  state.panOffset.x = Math.round((viewport.clientWidth  - boardW) / 2);
  state.panOffset.y = Math.round((viewport.clientHeight - boardH) / 2);
  applyPan(true);
}

function autoPanToTile(col, row) {
  const viewport = document.getElementById('board-viewport');
  const tx = tileX(col) + TILE_SIZE / 2;
  const ty = tileY(row) + TILE_SIZE / 2;
  state.panOffset.x = Math.round(viewport.clientWidth  / 2 - tx);
  state.panOffset.y = Math.round(viewport.clientHeight / 2 - ty);
  applyPan(true);
}

// ─── Touch / mouse interaction ─────────────────────────────────────────────────

const touch = {
  active: false,
  startX: 0, startY: 0,
  startPanX: 0, startPanY: 0,
  startTime: 0,
  isPanning: false,
  targetEl: null,
};

const PAN_THRESHOLD    = 8;
const TAP_MAX_DURATION = 300;

function onPointerDown(clientX, clientY, target) {
  touch.active    = true;
  touch.startX    = clientX;
  touch.startY    = clientY;
  touch.startPanX = state.panOffset.x;
  touch.startPanY = state.panOffset.y;
  touch.startTime = Date.now();
  touch.isPanning = false;
  touch.targetEl  = target;
}

function onPointerMove(clientX, clientY) {
  if (!touch.active) return;
  const dx = clientX - touch.startX;
  const dy = clientY - touch.startY;
  if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
    touch.isPanning = true;
  }
  if (touch.isPanning) {
    state.panOffset.x = touch.startPanX + dx;
    state.panOffset.y = touch.startPanY + dy;
    applyPan(false);
  }
}

function onPointerUp(clientX, clientY) {
  if (!touch.active) return;
  const duration = Date.now() - touch.startTime;
  if (!touch.isPanning && duration < TAP_MAX_DURATION) {
    handleTap(touch.targetEl);
  }
  touch.active = false;
}

function handleTap(el) {
  if (!el) return;
  let target = el;
  while (target && !target.classList.contains('valid-spot')) {
    if (target.id === 'board-viewport') return;
    target = target.parentElement;
  }
  if (target && target.classList.contains('valid-spot')) {
    placeTile(parseInt(target.dataset.col), parseInt(target.dataset.row));
  }
}

function initInteraction() {
  const viewport = document.getElementById('board-viewport');

  // Touch
  viewport.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    onPointerDown(t.clientX, t.clientY, document.elementFromPoint(t.clientX, t.clientY));
  }, { passive: false });

  viewport.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    onPointerMove(t.clientX, t.clientY);
  }, { passive: false });

  viewport.addEventListener('touchend', e => {
    e.preventDefault();
    onPointerUp(0, 0);
  }, { passive: false });

  // Mouse (desktop testing)
  viewport.addEventListener('mousedown', e => {
    onPointerDown(e.clientX, e.clientY, e.target);
  });
  window.addEventListener('mousemove', e => {
    onPointerMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', e => {
    onPointerUp(e.clientX, e.clientY);
  });
}

// ─── Overlay ───────────────────────────────────────────────────────────────────

function showOverlay() {
  const overlay = document.getElementById('overlay');
  const title   = document.getElementById('overlay-title');
  const message = document.getElementById('overlay-message');
  const tokensPlaced = state.tokens.filter(Boolean).length;

  if (state.phase === 'won') {
    title.textContent   = 'All Flowers Bloomed!';
    message.textContent = `Score: ${state.score}  (8 blooms + ${state.deck.length} remaining cards)`;
  } else {
    const headings = ['No flowers bloomed', 'A single blossom', 'A gentle start',
                      'Three blooms', 'Four blooms', 'Nearly there',
                      'Six blooms', 'So close…', 'All Flowers Bloomed!'];
    title.textContent   = headings[tokensPlaced] || `${tokensPlaced} blooms`;
    message.textContent = `${tokensPlaced} of 8 flowers bloomed  ·  Score: ${state.score}`;
  }

  overlay.classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

// ─── Help modal ────────────────────────────────────────────────────────────────

function toggleHelp() {
  const help = document.getElementById('help-modal');
  help.classList.toggle('hidden');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initInteraction();

  document.getElementById('new-game-btn').addEventListener('click', initGame);
  document.getElementById('play-again-btn').addEventListener('click', initGame);
  document.getElementById('help-btn').addEventListener('click', toggleHelp);
  document.getElementById('help-close').addEventListener('click', toggleHelp);

  initGame();
});
