import { INITIAL_LAYOUT } from './constants.js';

function clonePiece(piece) {
    if (!piece) return null;
    const copy = { color: piece.color, type: piece.type };
    if (piece.extraMoves) copy.extraMoves = [...piece.extraMoves];
    if (piece.originalType) copy.originalType = piece.originalType;
    return copy;
}

export function cloneBoard(board) {
    return board.map(row => row.map(clonePiece));
}

export function createInitialBoard() {
    return cloneBoard(INITIAL_LAYOUT);
}

export function createInitialCastlingRights() {
    return { whiteK: true, whiteQ: true, blackK: true, blackQ: true };
}

export function cloneCastlingRights(r) {
    return { ...r };
}

export function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function getPiece(board, row, col) {
    return inBounds(row, col) ? board[row][col] : null;
}

export function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.type === 'king' && p.color === color) return { row: r, col: c };
        }
    }
    return null;
}

export function forEachPiece(board, color, callback) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === color) callback(p, r, c);
        }
    }
}
