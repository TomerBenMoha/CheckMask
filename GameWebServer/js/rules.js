import { PIECE_RANK } from './constants.js';
import { findKing } from './board.js';
import { getValidMoves, isSquareAttacked } from './moves.js';

// ---------------------------------------------------------------------------
// Apply a move (with Purim capture/mutation logic)
// Returns the new board (mutates and returns the passed-in board).
// Promotion is handled separately -- call needsPromotion() + applyPromotion().
// If castlingRights is provided, it is mutated in place to update rights.
// ---------------------------------------------------------------------------
export function applyMove(board, fromRow, fromCol, toRow, toCol, castlingRights) {
    const attacker = board[fromRow][fromCol];
    const target = board[toRow][toCol];

    const isCastling = attacker?.type === 'king' && fromCol === 4 && (toCol === 6 || toCol === 2);
    if (castlingRights && isCastling) {
        if (attacker.color === 'white') {
            castlingRights.whiteK = false;
            castlingRights.whiteQ = false;
        } else {
            castlingRights.blackK = false;
            castlingRights.blackQ = false;
        }
        const row = fromRow;
        if (toCol === 6) {
            board[row][5] = board[row][7];
            board[row][7] = null;
        } else {
            board[row][3] = board[row][0];
            board[row][0] = null;
        }
        board[toRow][toCol] = attacker;
        board[fromRow][fromCol] = null;
        return board;
    }

    if (castlingRights && !isCastling) {
        if (attacker.type === 'king') {
            if (attacker.color === 'white') { castlingRights.whiteK = false; castlingRights.whiteQ = false; }
            else { castlingRights.blackK = false; castlingRights.blackQ = false; }
        }
        if (attacker.type === 'rook') {
            if (fromRow === 7 && fromCol === 0) castlingRights.whiteQ = false;
            if (fromRow === 7 && fromCol === 7) castlingRights.whiteK = false;
            if (fromRow === 0 && fromCol === 0) castlingRights.blackQ = false;
            if (fromRow === 0 && fromCol === 7) castlingRights.blackK = false;
        }
        if (target?.type === 'rook') {
            if (toRow === 7 && toCol === 0) castlingRights.whiteQ = false;
            if (toRow === 7 && toCol === 7) castlingRights.whiteK = false;
            if (toRow === 0 && toCol === 0) castlingRights.blackQ = false;
            if (toRow === 0 && toCol === 7) castlingRights.blackK = false;
        }
    }

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

export function hasAnyLegalMove(board, color, castlingRights) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === color) {
                if (getValidMoves(board, r, c, castlingRights).length > 0) return true;
            }
        }
    }
    return false;
}

export function isCheckmate(board, color, castlingRights) {
    return isInCheck(board, color) && !hasAnyLegalMove(board, color, castlingRights);
}

export function isStalemate(board, color, castlingRights) {
    return !isInCheck(board, color) && !hasAnyLegalMove(board, color, castlingRights);
}
