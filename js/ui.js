import { UNICODE_PIECES } from './constants.js';
import { findKing } from './board.js';
import { isInCheck } from './rules.js';

const boardEl = document.getElementById('board');
const statusBar = document.getElementById('status-bar');
const historyList = document.getElementById('history-list');
const navLabel = document.getElementById('nav-label');
const navFirst = document.getElementById('nav-first');
const navPrev = document.getElementById('nav-prev');
const navNext = document.getElementById('nav-next');
const navLast = document.getElementById('nav-last');

let onSquareClick = null;
let onNavigate = null;
let onHistoryClick = null;

export function setSquareClickHandler(handler) { onSquareClick = handler; }
export function setNavigateHandler(handler) { onNavigate = handler; }
export function setHistoryClickHandler(handler) { onHistoryClick = handler; }

// Wire nav buttons once
navFirst.addEventListener('click', () => onNavigate && onNavigate('first'));
navPrev.addEventListener('click', () => onNavigate && onNavigate('prev'));
navNext.addEventListener('click', () => onNavigate && onNavigate('next'));
navLast.addEventListener('click', () => onNavigate && onNavigate('last'));

// ---------------------------------------------------------------------------
// Board rendering
// ---------------------------------------------------------------------------
export function renderBoard(board, { selectedSquare, validMoves, lastMove } = {}) {
    boardEl.innerHTML = '';
    const validSet = new Set((validMoves || []).map(m => m.row * 8 + m.col));

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            const isLight = (r + c) % 2 === 0;
            sq.className = `square ${isLight ? 'light' : 'dark'}`;
            sq.dataset.row = r;
            sq.dataset.col = c;

            if (selectedSquare && selectedSquare.row === r && selectedSquare.col === c) {
                sq.classList.add('selected');
            }

            const key = r * 8 + c;
            if (validSet.has(key)) {
                sq.classList.add('valid-move');
                if (board[r][c]) sq.classList.add('has-enemy');
            }

            if (lastMove) {
                if (lastMove.from.row === r && lastMove.from.col === c) sq.classList.add('last-from');
                if (lastMove.to.row === r && lastMove.to.col === c) sq.classList.add('last-to');
            }

            const piece = board[r][c];
            if (piece) {
                const span = document.createElement('span');
                span.className = `piece-symbol piece-${piece.color}`;
                span.textContent = UNICODE_PIECES[piece.color][piece.type];

                if (piece.originalType) {
                    span.classList.add('costumed');
                    span.title = `Originally a ${piece.originalType}, now wearing a ${piece.type} costume!`;
                }
                if (piece.type === 'king' && piece.extraMoves && piece.extraMoves.length > 0) {
                    span.classList.add('king-powered');
                    span.title = `King has absorbed: ${piece.extraMoves.join(', ')}`;
                }
                sq.appendChild(span);
            }

            if (piece && piece.type === 'king' && isInCheck(board, piece.color)) {
                sq.classList.add('in-check');
            }

            sq.addEventListener('click', () => {
                if (onSquareClick) onSquareClick(r, c);
            });

            boardEl.appendChild(sq);
        }
    }
    updateKingPowers(board);
}

// ---------------------------------------------------------------------------
// King powers panel
// ---------------------------------------------------------------------------
function updateKingPowers(board) {
    for (const color of ['white', 'black']) {
        const king = findKing(board, color);
        const el = document.querySelector(`.power-icons[data-color="${color}"]`);
        if (!el) continue;
        if (king) {
            const piece = board[king.row][king.col];
            if (piece.extraMoves && piece.extraMoves.length > 0) {
                el.textContent = piece.extraMoves
                    .map(t => UNICODE_PIECES[color][t] || t)
                    .join(' ');
            } else {
                el.textContent = 'none';
            }
        } else {
            el.textContent = '-';
        }
    }
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------
export function setStatus(text, classes = '') {
    statusBar.textContent = text;
    statusBar.className = classes;
}

// ---------------------------------------------------------------------------
// Move history panel
// ---------------------------------------------------------------------------
const COL_LETTERS = 'abcdefgh';
const PIECE_SYMBOLS = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' };

export function moveToNotation(board, fromRow, fromCol, toRow, toCol, piece, captured) {
    const sym = PIECE_SYMBOLS[piece.type] || '';
    const dest = COL_LETTERS[toCol] + (8 - toRow);
    const cap = captured ? 'x' : '';
    const fromFile = (piece.type === 'pawn' && captured) ? COL_LETTERS[fromCol] : '';
    return `${sym || fromFile}${cap}${dest}`;
}

export function renderHistory(history, viewIndex) {
    historyList.innerHTML = '';

    // history[0] is the initial board (no move), moves start at index 1
    const moveCount = history.length - 1;
    const fullMoves = Math.ceil(moveCount / 2);

    for (let i = 0; i < fullMoves; i++) {
        const row = document.createElement('div');
        row.className = 'history-row';

        const num = document.createElement('span');
        num.className = 'history-num';
        num.textContent = `${i + 1}.`;
        row.appendChild(num);

        // White's move (history index = i*2 + 1)
        const wIdx = i * 2 + 1;
        const wMove = document.createElement('span');
        wMove.className = 'history-move';
        if (wIdx < history.length) {
            wMove.textContent = history[wIdx].notation || '...';
            if (wIdx === viewIndex) wMove.classList.add('active');
            wMove.addEventListener('click', () => onHistoryClick && onHistoryClick(wIdx));
        } else {
            wMove.classList.add('empty');
        }
        row.appendChild(wMove);

        // Black's move (history index = i*2 + 2)
        const bIdx = i * 2 + 2;
        const bMove = document.createElement('span');
        bMove.className = 'history-move';
        if (bIdx < history.length) {
            bMove.textContent = history[bIdx].notation || '...';
            if (bIdx === viewIndex) bMove.classList.add('active');
            bMove.addEventListener('click', () => onHistoryClick && onHistoryClick(bIdx));
        } else {
            bMove.classList.add('empty');
        }
        row.appendChild(bMove);

        historyList.appendChild(row);
    }

    // Auto-scroll to bottom when viewing latest
    if (viewIndex === history.length - 1) {
        historyList.scrollTop = historyList.scrollHeight;
    }
}

// ---------------------------------------------------------------------------
// Navigation bar state
// ---------------------------------------------------------------------------
export function updateNav(viewIndex, totalMoves) {
    navLabel.textContent = `Move ${viewIndex} / ${totalMoves}`;
    navFirst.disabled = viewIndex <= 0;
    navPrev.disabled = viewIndex <= 0;
    navNext.disabled = viewIndex >= totalMoves;
    navLast.disabled = viewIndex >= totalMoves;
}

// ---------------------------------------------------------------------------
// Promotion dialog
// ---------------------------------------------------------------------------
const PROMOTION_CHOICES = ['queen', 'rook', 'bishop', 'knight'];

export function showPromotionDialog(color) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'promo-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'promo-dialog';

        const title = document.createElement('div');
        title.className = 'promo-title';
        title.textContent = 'Promote pawn to:';
        dialog.appendChild(title);

        const choices = document.createElement('div');
        choices.className = 'promo-choices';

        for (const type of PROMOTION_CHOICES) {
            const btn = document.createElement('button');
            btn.className = `promo-btn piece-${color}`;
            btn.textContent = UNICODE_PIECES[color][type];
            btn.title = type.charAt(0).toUpperCase() + type.slice(1);
            btn.addEventListener('click', () => {
                overlay.remove();
                resolve(type);
            });
            choices.appendChild(btn);
        }

        dialog.appendChild(choices);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}
