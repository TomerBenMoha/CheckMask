import { createInitialBoard, cloneBoard } from './board.js';
import { getValidMoves } from './moves.js';
import { applyMove, isInCheck, isCheckmate, isStalemate, needsPromotion, applyPromotion } from './rules.js';
import { getBestMove, setAiDepth } from './ai.js';
import {
    renderBoard, setStatus, setSquareClickHandler,
    setNavigateHandler, setHistoryClickHandler,
    renderHistory, updateNav, moveToNotation,
    showPromotionDialog,
} from './ui.js';

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
let gameMode = 'pvai';   // 'pvai' | 'pvp'
let board = null;
let currentTurn = 'white';
let selectedSquare = null;
let validMoves = [];
let gameOver = false;
let awaitingPromotion = false;

// History: array of { board, move, notation }
// Index 0 = initial position (no move). Each subsequent entry is a half-move.
let history = [];
let viewIndex = 0;        // which history entry the board is showing

// DOM references
const gameModeSelect = document.getElementById('game-mode');
const difficultySelect = document.getElementById('difficulty');
const difficultyGroup = document.getElementById('difficulty-group');

// ---------------------------------------------------------------------------
// Setup controls
// ---------------------------------------------------------------------------
gameModeSelect.addEventListener('change', () => {
    gameMode = gameModeSelect.value;
    difficultyGroup.style.display = gameMode === 'pvai' ? '' : 'none';
});

function readSettings() {
    gameMode = gameModeSelect.value;
    difficultyGroup.style.display = gameMode === 'pvai' ? '' : 'none';
    setAiDepth(parseInt(difficultySelect.value, 10));
}

// ---------------------------------------------------------------------------
// Start / restart
// ---------------------------------------------------------------------------
function startGame() {
    readSettings();
    board = createInitialBoard();
    currentTurn = 'white';
    selectedSquare = null;
    validMoves = [];
    gameOver = false;
    awaitingPromotion = false;
    history = [{ board: cloneBoard(board), move: null, notation: null }];
    viewIndex = 0;
    setStatus("White's turn");
    render();
}

// ---------------------------------------------------------------------------
// Rendering (delegates to ui.js)
// ---------------------------------------------------------------------------
function render() {
    const displayBoard = history[viewIndex].board;
    const lastMove = history[viewIndex].move;

    // Only show selection/valid-moves when viewing the live position
    const isLive = viewIndex === history.length - 1;
    renderBoard(displayBoard, {
        selectedSquare: isLive ? selectedSquare : null,
        validMoves: isLive ? validMoves : [],
        lastMove,
    });
    renderHistory(history, viewIndex);
    updateNav(viewIndex, history.length - 1);
}

// ---------------------------------------------------------------------------
// History navigation
// ---------------------------------------------------------------------------
function navigate(action) {
    const max = history.length - 1;
    switch (action) {
        case 'first': viewIndex = 0; break;
        case 'prev':  viewIndex = Math.max(0, viewIndex - 1); break;
        case 'next':  viewIndex = Math.min(max, viewIndex + 1); break;
        case 'last':  viewIndex = max; break;
    }
    selectedSquare = null;
    validMoves = [];
    render();
}

function navigateToIndex(idx) {
    viewIndex = Math.max(0, Math.min(idx, history.length - 1));
    selectedSquare = null;
    validMoves = [];
    render();
}

// ---------------------------------------------------------------------------
// Click handling
// ---------------------------------------------------------------------------
function isHumanTurn() {
    if (gameMode === 'pvp') return true;
    return currentTurn === 'white';
}

function handleSquareClick(row, col) {
    if (gameOver || awaitingPromotion) return;
    if (!isHumanTurn()) return;

    // If viewing a past position, jump to live first
    if (viewIndex !== history.length - 1) {
        viewIndex = history.length - 1;
        render();
        return;
    }

    const piece = board[row][col];

    if (selectedSquare && validMoves.some(m => m.row === row && m.col === col)) {
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
    }

    if (piece && piece.color === currentTurn) {
        selectedSquare = { row, col };
        validMoves = getValidMoves(board, row, col);
        render();
        return;
    }

    selectedSquare = null;
    validMoves = [];
    render();
}

// ---------------------------------------------------------------------------
// Execute a move (human)
// ---------------------------------------------------------------------------
async function executeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];
    let notation = moveToNotation(board, fromRow, fromCol, toRow, toCol, piece, captured);

    applyMove(board, fromRow, fromCol, toRow, toCol);

    // Promotion: if pawn still on last rank after Purim capture logic, ask player
    if (needsPromotion(board, toRow, toCol)) {
        awaitingPromotion = true;
        render();
        const choice = await showPromotionDialog(board[toRow][toCol].color);
        applyPromotion(board, toRow, toCol, choice);
        notation += '=' + { queen: 'Q', rook: 'R', bishop: 'B', knight: 'N' }[choice];
        awaitingPromotion = false;
    }

    const move = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    history.push({ board: cloneBoard(board), move, notation });
    viewIndex = history.length - 1;
    selectedSquare = null;
    validMoves = [];

    const nextColor = currentTurn === 'white' ? 'black' : 'white';

    if (checkEndConditions(nextColor)) return;

    currentTurn = nextColor;

    if (gameMode === 'pvai' && currentTurn === 'black') {
        setStatus('Black is thinking', 'thinking');
        render();
        setTimeout(doAiTurn, 300);
    } else {
        const colorName = currentTurn === 'white' ? 'White' : 'Black';
        if (isInCheck(board, currentTurn)) {
            setStatus(`${colorName}'s turn - CHECK!`, 'check');
        } else {
            setStatus(`${colorName}'s turn`);
        }
        render();
    }
}

// ---------------------------------------------------------------------------
// AI turn
// ---------------------------------------------------------------------------
function doAiTurn() {
    const move = getBestMove(cloneBoard(board), 'black');

    if (!move) {
        setStatus('Stalemate!');
        gameOver = true;
        render();
        return;
    }

    const piece = board[move.from.row][move.from.col];
    const captured = board[move.to.row][move.to.col];
    let notation = moveToNotation(board, move.from.row, move.from.col, move.to.row, move.to.col, piece, captured);

    applyMove(board, move.from.row, move.from.col, move.to.row, move.to.col);

    if (needsPromotion(board, move.to.row, move.to.col)) {
        applyPromotion(board, move.to.row, move.to.col, 'queen');
        notation += '=Q';
    }

    history.push({ board: cloneBoard(board), move: { from: move.from, to: move.to }, notation });
    viewIndex = history.length - 1;

    if (checkEndConditions('white')) return;

    currentTurn = 'white';
    if (isInCheck(board, 'white')) {
        setStatus("White's turn - CHECK!", 'check');
    } else {
        setStatus("White's turn");
    }
    render();
}

// ---------------------------------------------------------------------------
// End conditions
// ---------------------------------------------------------------------------
function checkEndConditions(nextColor) {
    if (isCheckmate(board, nextColor)) {
        const winner = nextColor === 'white' ? 'Black' : 'White';
        setStatus(`Checkmate! ${winner} wins!`);
        gameOver = true;
        render();
        return true;
    }
    if (isStalemate(board, nextColor)) {
        setStatus('Stalemate! Draw.');
        gameOver = true;
        render();
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Wire up handlers
// ---------------------------------------------------------------------------
setSquareClickHandler(handleSquareClick);
setNavigateHandler(navigate);
setHistoryClickHandler(navigateToIndex);
document.getElementById('new-game').addEventListener('click', startGame);

// Keyboard shortcuts for navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') navigate('prev');
    else if (e.key === 'ArrowRight') navigate('next');
    else if (e.key === 'Home') navigate('first');
    else if (e.key === 'End') navigate('last');
});

startGame();
