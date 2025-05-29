// Dusk Til Gone - script.js
// Modern, whimsical puzzle game: Board up the gothic window before sunrise!
// Uses pointer events and absolute positioning for robust drag-and-drop.

// --- Seeded PRNG (Mulberry32) ---
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// --- Utility: Get today's seed ---
function getTodaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// --- Polyomino Generator ---
function generateDailyPuzzle(seed) {
  // Returns: { pieces: [ {cells: [{x,y}], color} ], grid: 6x6 array of pieceIdx }
  const rand = mulberry32(seed);
  const size = 6;
  let grid = Array.from({length: size}, () => Array(size).fill(-1));
  let pieces = [];
  let pieceCount = Math.floor(rand() * 5) + 6; // 6-10 pieces
  let cellsLeft = size * size;
  let cellList = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) cellList.push({x, y});
  let used = new Set();

  // Helper: get neighbors
  function neighbors(cell) {
    return [
      {x: cell.x+1, y: cell.y},
      {x: cell.x-1, y: cell.y},
      {x: cell.x, y: cell.y+1},
      {x: cell.x, y: cell.y-1},
    ].filter(c => c.x >= 0 && c.x < size && c.y >= 0 && c.y < size && !used.has(c.y*size+c.x));
  }

  // Place pieces
  let pieceIdx = 0;
  while (cellsLeft > 0 && pieceIdx < pieceCount) {
    // Find a random unused cell
    let startIdx = Math.floor(rand() * cellList.length);
    while (used.has(cellList[startIdx].y*size+cellList[startIdx].x)) startIdx = (startIdx+1)%cellList.length;
    let start = cellList[startIdx];
    let pieceCells = [start];
    used.add(start.y*size+start.x);
    grid[start.y][start.x] = pieceIdx;
    let pieceSize = Math.max(2, Math.min(6, Math.floor(rand()*5)+2, cellsLeft-(pieceCount-pieceIdx-1)));
    // Grow piece
    for (let i=1; i<pieceSize; i++) {
      let options = pieceCells.flatMap(neighbors).filter(c => !used.has(c.y*size+c.x));
      if (!options.length) break;
      let next = options[Math.floor(rand()*options.length)];
      pieceCells.push(next);
      used.add(next.y*size+next.x);
      grid[next.y][next.x] = pieceIdx;
    }
    pieces.push({cells: normalizePolyomino(pieceCells), color: randomWoodColor(rand)});
    pieceIdx++;
    cellsLeft = size*size - used.size;
  }
  // If not all cells used, merge leftovers into last piece
  if (cellsLeft > 0) {
    let last = pieces[pieces.length-1];
    for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
      if (!used.has(y*size+x)) {
        last.cells.push({x:x-last.cells[0].x, y:y-last.cells[0].y});
        grid[y][x] = pieces.length-1;
      }
    }
  }
  return { pieces, grid };
}

// Normalize polyomino to anchor at (0,0)
function normalizePolyomino(cells) {
  let minX = Math.min(...cells.map(c=>c.x));
  let minY = Math.min(...cells.map(c=>c.y));
  return cells.map(c => ({x: c.x-minX, y: c.y-minY}));
}

// Generate a random wood color
function randomWoodColor(rand) {
  const woods = [
    '#6d4e3c', '#a97c50', '#7c5c3e', '#3e2c1c', '#5a4633', '#8b6f4a', '#3a2a1a'
  ];
  return woods[Math.floor(rand()*woods.length)];
}

// --- DOM Setup ---
const gridEl = document.getElementById('window-grid');
const trayEl = document.getElementById('piece-tray');
const trayOverlayEl = document.getElementById('tray-darkness-overlay');
const winModal = document.getElementById('win-modal');
const closeModalBtn = document.getElementById('close-modal');
const restartBtn = document.getElementById('restart-btn');

const GRID_SIZE = 6;
let puzzle, placed, trayPieces, dragging, dragPieceIdx, dragOffset, dragOrigin, dragElem, isWin, dragElemOffset;

// --- Board State ---
// boardState[y][x] = null (empty) or piece index
let boardState;

function setupGame() {
  // Generate puzzle
  const seed = getTodaySeed();
  puzzle = generateDailyPuzzle(seed);
  placed = Array(puzzle.pieces.length).fill(null); // null or {x, y}
  trayPieces = puzzle.pieces.map((p, i) => i); // indices of pieces in tray
  dragging = false;
  dragPieceIdx = null;
  dragOffset = null;
  dragOrigin = null;
  dragElem = null;
  dragElemOffset = null;
  isWin = false;
  renderGrid();
  renderTray();
  updateTrayDarkness();
  winModal.classList.add('hidden');
  gridEl.style.pointerEvents = '';
  trayEl.style.pointerEvents = '';
  boardState = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

// --- Grid Rendering ---
function getPieceBoundingBox(cells) {
  let minX = Math.min(...cells.map(c => c.x));
  let minY = Math.min(...cells.map(c => c.y));
  let maxX = Math.max(...cells.map(c => c.x));
  let maxY = Math.max(...cells.map(c => c.y));
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function renderGrid() {
  gridEl.innerHTML = '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      // Check if covered and by which piece
      let coveredIdx = null;
      for (let i=0; i<placed.length; i++) {
        if (placed[i]) {
          for (const c of puzzle.pieces[i].cells) {
            if (x === placed[i].x + c.x && y === placed[i].y + c.y) coveredIdx = i;
          }
        }
      }
      if (coveredIdx !== null) cell.classList.add('covered');
      gridEl.appendChild(cell);
    }
  }
  // Render placed pieces as draggable overlays
  const cellSize = gridEl.offsetWidth / GRID_SIZE;
  for (let i = 0; i < placed.length; i++) {
    if (placed[i]) {
      const piece = puzzle.pieces[i];
      const bbox = getPieceBoundingBox(piece.cells);
      const pieceEl = createPieceElement(
        piece,
        i,
        true,
        placed[i].x + bbox.minX,
        placed[i].y + bbox.minY,
        bbox,
        cellSize
      );
      gridEl.appendChild(pieceEl);
    }
  }
}

function createPieceElement(piece, idx, isPlaced = false, gridX = 0, gridY = 0, bbox = null, cellSizeOverride = null) {
  if (!bbox) bbox = getPieceBoundingBox(piece.cells);
  const pieceEl = document.createElement('div');
  pieceEl.className = 'piece';
  pieceEl.dataset.idx = idx;
  pieceEl.style.zIndex = 2;
  pieceEl.draggable = false;
  pieceEl.ariaLabel = 'Wooden board';
  pieceEl.style.position = 'relative';
  // Use the board's cell size for everything
  const cellSize = cellSizeOverride || (gridEl.offsetWidth / GRID_SIZE);
  for (const c of piece.cells) {
    const cell = document.createElement('div');
    cell.className = 'piece-cell';
    cell.style.left = `${(c.x - bbox.minX) * cellSize}px`;
    cell.style.top = `${(c.y - bbox.minY) * cellSize}px`;
    cell.style.width = `${cellSize}px`;
    cell.style.height = `${cellSize}px`;
    pieceEl.appendChild(cell);
  }
  pieceEl.addEventListener('pointerdown', e => startDrag(e, idx, isPlaced, bbox));
  pieceEl.style.width = `${(bbox.width) * cellSize}px`;
  pieceEl.style.height = `${(bbox.height) * cellSize}px`;
  if (isPlaced) {
    pieceEl.style.position = 'absolute';
    pieceEl.style.left = (gridX * cellSize) + 'px';
    pieceEl.style.top = (gridY * cellSize) + 'px';
    pieceEl.style.pointerEvents = 'auto';
    pieceEl.style.zIndex = 20;
  }
  return pieceEl;
}

// --- Piece Placement/Removal ---
function placePieceOnBoard(pieceIdx, gridX, gridY) {
  const piece = puzzle.pieces[pieceIdx];
  for (const c of piece.cells) {
    const gx = gridX + c.x;
    const gy = gridY + c.y;
    boardState[gy][gx] = pieceIdx;
  }
  placed[pieceIdx] = { x: gridX, y: gridY };
}
function removePieceFromBoard(pieceIdx) {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (boardState[y][x] === pieceIdx) boardState[y][x] = null;
    }
  }
  placed[pieceIdx] = null;
}
function canPlacePiece(pieceIdx, gridX, gridY) {
  const piece = puzzle.pieces[pieceIdx];
  for (const c of piece.cells) {
    const gx = gridX + c.x;
    const gy = gridY + c.y;
    if (
      gx < 0 || gx >= GRID_SIZE ||
      gy < 0 || gy >= GRID_SIZE ||
      boardState[gy][gx] !== null
    ) {
      return false;
    }
  }
  return true;
}

// --- Drag and Drop (Pointer Events, Absolute Position) ---
function startDrag(e, idx, isPlaced = false, bbox = null) {
  if (isWin) return;
  e.preventDefault();
  dragging = true;
  dragPieceIdx = idx;
  dragOrigin = getPointerPos(e);
  dragOffset = getPointerPos(e);
  dragElem = null;
  dragElemOffset = null;
  if (isPlaced) {
    removePieceFromBoard(idx);
    renderGrid();
    renderTray();
    updateTrayDarkness();
  }
  dragElem = (isPlaced
    ? Array.from(gridEl.children).find(el => el.classList.contains('piece') && +el.dataset.idx === idx)
    : Array.from(trayEl.children).find(el => +el.dataset.idx === idx));
  dragElem.classList.add('dragging');
  dragElem.setPointerCapture(e.pointerId);
  dragElem.addEventListener('pointermove', onDragMove);
  dragElem.addEventListener('pointerup', onDragEnd);
}

function onDragMove(e) {
  if (!dragging || !dragElem) return;
  // Use requestAnimationFrame for smoother drag
  if (dragElem._raf) cancelAnimationFrame(dragElem._raf);
  dragElem._raf = requestAnimationFrame(() => {
    const pos = getPointerPos(e);
    let dx = pos.x - dragOrigin.x;
    let dy = pos.y - dragOrigin.y;
    dragElem.style.transform = `translate(${dx}px, ${dy}px)`;
  });
}

function onDragEnd(e) {
  if (!dragging || !dragElem) return;
  dragElem.classList.remove('dragging');
  dragElem.releasePointerCapture(e.pointerId);
  dragElem.removeEventListener('pointermove', onDragMove);
  dragElem.removeEventListener('pointerup', onDragEnd);
  const gridRect = gridEl.getBoundingClientRect();
  const pos = getPointerPos(e);
  const cellSize = gridEl.offsetWidth / GRID_SIZE;
  let snapped = snapToGrid(pos.x, pos.y, gridRect.left, gridRect.top, cellSize);
  let gridX = snapped.x;
  let gridY = snapped.y;
  if (canPlacePiece(dragPieceIdx, gridX, gridY)) {
    placePieceOnBoard(dragPieceIdx, gridX, gridY);
    trayPieces = trayPieces.filter(i => i !== dragPieceIdx);
    renderTray();
    renderGrid();
    updateTrayDarkness();
    checkWin();
  } else {
    trayPieces = trayPieces.includes(dragPieceIdx)
      ? trayPieces
      : [...trayPieces, dragPieceIdx];
    placed[dragPieceIdx] = null;
    renderTray();
    renderGrid();
    updateTrayDarkness();
    dragElem.style.transform = '';
  }
  dragging = false;
  dragPieceIdx = null;
  dragElem = null;
  dragElemOffset = null;
}

function getPointerPos(e) {
  if (e.touches && e.touches.length) {
    return {x: e.touches[0].clientX, y: e.touches[0].clientY};
  } else {
    return {x: e.clientX, y: e.clientY};
  }
}

// --- Tray Rendering ---
function renderTray() {
  trayEl.innerHTML = '';
  const cellSize = gridEl.offsetWidth / GRID_SIZE;
  trayPieces.forEach((idx, i) => {
    const piece = puzzle.pieces[idx];
    const bbox = getPieceBoundingBox(piece.cells);
    const pieceEl = createPieceElement(piece, idx, false, 0, 0, bbox, cellSize);
    pieceEl.setAttribute('tabindex', 0);
    trayEl.appendChild(pieceEl);
  });
}

// --- Tray Darkness Overlay ---
function updateTrayDarkness() {
  let covered = 0;
  for (let i=0; i<placed.length; i++) {
    if (placed[i]) covered += puzzle.pieces[i].cells.length;
  }
  let pct = covered / (GRID_SIZE*GRID_SIZE);
  let overlay = 'var(--tray-overlay-0)';
  if (pct >= 0.9) overlay = 'var(--tray-overlay-4)';
  else if (pct >= 0.75) overlay = 'var(--tray-overlay-3)';
  else if (pct >= 0.5) overlay = 'var(--tray-overlay-2)';
  else if (pct >= 0.25) overlay = 'var(--tray-overlay-1)';
  trayOverlayEl.style.background = overlay;
}

// --- Win Condition ---
function checkWin() {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (boardState[y][x] === null) return;
    }
  }
  winModal.classList.remove('hidden');
  isWin = true;
  gridEl.style.pointerEvents = 'none';
  trayEl.style.pointerEvents = 'none';
}

// --- Restart ---
restartBtn.addEventListener('click', setupGame);
closeModalBtn.addEventListener('click', () => winModal.classList.add('hidden'));

// --- Init ---
setupGame(); 

function snapToGrid(pixelX, pixelY, gridOffsetX, gridOffsetY, cellSize) {
  const x = Math.floor((pixelX - gridOffsetX) / cellSize);
  const y = Math.floor((pixelY - gridOffsetY) / cellSize);
  return { x, y };
} 