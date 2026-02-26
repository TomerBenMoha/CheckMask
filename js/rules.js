import { PIECE_RANK } from './constants.js';
import { findKing } from './board.js';
import { getValidMoves, isSquareAttacked } from './moves.js';

// ---------------------------------------------------------------------------
// Apply a move (with Purim capture/mutation logic)
// Returns the new board (mutates and returns the passed-in board).
// Promotion is handled separately -- call needsPromotion() + applyPromotion().
// ---------------------------------------------------------------------------
export function applyMove(board, fromRow, fromCol, toRow, toCol) {
    const attacker = board[fromRow][fromCol];
    const target = board[toRow][toCol];

    if (target) {
        if (attacker.type === 'king') {
            if (!attacker.extraMoves) attacker.extraMoves = [];
            if (target.type !== 'king' && !attacker.extraMoves.includes(target.type)) {
                attacker.extraMoves.push(target.type);
            }
        } else {
            const attackerRank = PIECE_RANK[attacker.type] ?? 0;
            const targetRank = PIECE_RANK[target.type] ?? 0;
            if (targetRank > attackerRank) {
                attacker.originalType = attacker.originalType || attacker.type;
                attacker.type = target.type;
            }
        }
    }

    board[toRow][toCol] = attacker;
    board[fromRow][fromCol] = null;
    return board;
}

// ---------------------------------------------------------------------------
// Pawn promotion
// ---------------------------------------------------------------------------
export function needsPromotion(board, row, col) {
    const piece = board[row][col];
    if (!piece || piece.type !== 'pawn') return false;
    return (piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7);
}

export function applyPromotion(board, row, col, promotionType) {
    const piece = board[row][col];
    if (!piece) return;
    piece.originalType = piece.originalType || piece.type;
    piece.type = promotionType;
}

// ---------------------------------------------------------------------------
// Check / Checkmate / Stalemate
// ---------------------------------------------------------------------------

export function isInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) return false;
    const enemy = color === 'white' ? 'black' : 'white';
    return isSquareAttacked(board, king.row, king.col, enemy);
}

export function hasAnyLegalMove(board, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === color) {
                if (getValidMoves(board, r, c).length > 0) return true;
            }
        }
    }
    return false;
}

export function isCheckmate(board, color) {
    return isInCheck(board, color) && !hasAnyLegalMove(board, color);
}

export function isStalemate(board, color) {
    return !isInCheck(board, color) && !hasAnyLegalMove(board, color);
}
