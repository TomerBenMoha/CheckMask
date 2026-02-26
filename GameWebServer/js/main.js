import { createInitialBoard, cloneBoard, createInitialCastlingRights, cloneCastlingRights } from './board.js';
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

// Castling rights (mutated by applyMove)
let currentCastlingRights = createInitialCastlingRights();

// History: array of { board, move, notation, castlingRights }
// Index 0 = initial position (no move). Each subsequent entry is a half-move.
let history = [];
let viewIndex = 0;        // which history entry the board is showing

// DOM references
const gameModeSelect = document.getElementById('game-mode');
const difficultySelect = document.getElementById('difficulty');
const difficultyGroup = document.getElementById('difficulty-group');
const playAsSelect = document.getElementById('play-as');
const playAsGroup = document.getElementById('play-as-group');

// Human/AI colors (when vs Computer); set in readSettings()
let humanColor = 'white';
let aiColor = 'black';

// ---------------------------------------------------------------------------
// Setup controls
// ---------------------------------------------------------------------------
gameModeSelect.addEventListener('change', () => {
    gameMode = gameModeSelect.value;
    difficultyGroup.style.display = gameMode === 'pvai' ? '' : 'none';
    playAsGroup.style.display = gameMode === 'pvai' ? '' : 'none';
});

function readSettings() {
    gameMode = gameModeSelect.value;
    difficultyGroup.style.display = gameMode === 'pvai' ? '' : 'none';
    playAsGroup.style.display = gameMode === 'pvai' ? '' : 'none';
    setAiDepth(parseInt(difficultySelect.value, 10));
    humanColor = playAsSelect.value;
    aiColor = humanColor === 'white' ? 'black' : 'white';
}

// ---------------------------------------------------------------------------
// Start / restart
// ---------------------------------------------------------------------------
function startGame() {
    readSettings();
    board = createInitialBoard();
    currentCastlingRights = createInitialCastlingRights();
    currentTurn = 'white';
    selectedSquare = null;
    validMoves = [];
    gameOver = false;
    awaitingPromotion = false;
    history = [{ board: cloneBoard(board), move: null, notation: null, castlingRights: cloneCastlingRights(currentCastlingRights) }];
    viewIndex = 0;
    const turnName = currentTurn === 'white' ? 'White' : 'Black';
    setStatus(`${turnName}'s turn`);
    render();
    // If vs Computer and AI moves first (player chose Black), trigger AI
    if (gameMode === 'pvai' && currentTurn === aiColor) {
        setStatus((aiColor === 'white' ? 'White' : 'Black') + ' is thinking', 'thinking');
        render();
        setTimeout(doAiTurn, 300);
    }
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
    return currentTurn === humanColor;
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
        validMoves = getValidMoves(board, row, col, currentCastlingRights);
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

    applyMove(board, fromRow, fromCol, toRow, toCol, currentCastlingRights);

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
    history.push({ board: cloneBoard(board), move, notation, castlingRights: cloneCastlingRights(currentCastlingRights) });
    viewIndex = history.length - 1;
    selectedSquare = null;
    validMoves = [];

    const nextColor = currentTurn === 'white' ? 'black' : 'white';

    if (checkEndConditions(nextColor)) return;

    currentTurn = nextColor;

    if (gameMode === 'pvai' && currentTurn === aiColor) {
        const name = aiColor === 'white' ? 'White' : 'Black';
        setStatus(`${name} is thinking`, 'thinking');
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
    const move = getBestMove(cloneBoard(board), aiColor, cloneCastlingRights(currentCastlingRights));

    if (!move) {
        setStatus('Stalemate!');
        gameOver = true;
        render();
        return;
    }

    const piece = board[move.from.row][move.from.col];
    const captured = board[move.to.row][move.to.col];
    let notation = moveToNotation(board, move.from.row, move.from.col, move.to.row, move.to.col, piece, captured);

    applyMove(board, move.from.row, move.from.col, move.to.row, move.to.col, currentCastlingRights);

    if (needsPromotion(board, move.to.row, move.to.col)) {
        applyPromotion(board, move.to.row, move.to.col, 'queen');
        notation += '=Q';
    }

    history.push({ board: cloneBoard(board), move: { from: move.from, to: move.to }, notation, castlingRights: cloneCastlingRights(currentCastlingRights) });
    viewIndex = history.length - 1;

    if (checkEndConditions(humanColor)) return;

    currentTurn = humanColor;
    const name = humanColor === 'white' ? 'White' : 'Black';
    if (isInCheck(board, humanColor)) {
        setStatus(`${name}'s turn - CHECK!`, 'check');
    } else {
        setStatus(`${name}'s turn`);
    }
    render();
}

// ---------------------------------------------------------------------------
// End conditions
// ---------------------------------------------------------------------------
function checkEndConditions(nextColor) {
    if (isCheckmate(board, nextColor, currentCastlingRights)) {
        const winner = nextColor === 'white' ? 'Black' : 'White';
        setStatus(`Checkmate! ${winner} wins!`);
        gameOver = true;
        render();
        return true;
    }
    if (isStalemate(board, nextColor, currentCastlingRights)) {
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
