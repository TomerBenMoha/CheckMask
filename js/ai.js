import { PIECE_VALUE } from './constants.js';
import { cloneBoard } from './board.js';
import { getValidMoves } from './moves.js';
import { applyMove, isCheckmate, isStalemate, needsPromotion, applyPromotion } from './rules.js';

let aiDepth = 3;

export function setAiDepth(depth) {
    aiDepth = depth;
}

// Positional bonus tables (from white's perspective, mirrored for black)
const CENTER_BONUS = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [0,  0,  0,  0,  0,  0,  0,  0],
    [0,  0,  5, 10, 10,  5,  0,  0],
    [0,  5, 10, 20, 20, 10,  5,  0],
    [0,  5, 10, 20, 20, 10,  5,  0],
    [0,  0,  5, 10, 10,  5,  0,  0],
    [0,  0,  0,  0,  0,  0,  0,  0],
    [0,  0,  0,  0,  0,  0,  0,  0],
];

function evaluateBoard(board, aiColor) {
    let score = 0;
    const playerColor = aiColor === 'white' ? 'black' : 'white';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            const sign = piece.color === aiColor ? 1 : -1;
            const material = PIECE_VALUE[piece.type] || 0;
            score += sign * material;

            // Positional nudge
            if (piece.type === 'pawn' || piece.type === 'knight') {
                score += sign * CENTER_BONUS[r][c];
            }

            // Purim: upgraded piece bonus
            if (piece.originalType) {
                score += sign * 150;
            }

            // Purim: King power bonus
            if (piece.type === 'king' && piece.extraMoves) {
                score += sign * 80 * piece.extraMoves.length;
            }
        }
    }
    return score;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
    const currentColor = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');

    if (isCheckmate(board, currentColor)) {
        return { score: isMaximizing ? -100000 - depth : 100000 + depth, move: null };
    }
    if (isStalemate(board, currentColor)) {
        return { score: 0, move: null };
    }
    if (depth === 0) {
        return { score: evaluateBoard(board, aiColor), move: null };
    }

    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;
        const moves = orderMoves(board, getAllMoves(board, aiColor));
        for (const { from, to } of moves) {
            const sim = cloneBoard(board);
            applyMove(sim, from.row, from.col, to.row, to.col);
            if (needsPromotion(sim, to.row, to.col)) applyPromotion(sim, to.row, to.col, 'queen');
            const result = minimax(sim, depth - 1, alpha, beta, false, aiColor);
            if (result.score > maxEval) {
                maxEval = result.score;
                bestMove = { from, to };
            }
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        const opponentColor = aiColor === 'white' ? 'black' : 'white';
        const moves = orderMoves(board, getAllMoves(board, opponentColor));
        for (const { from, to } of moves) {
            const sim = cloneBoard(board);
            applyMove(sim, from.row, from.col, to.row, to.col);
            if (needsPromotion(sim, to.row, to.col)) applyPromotion(sim, to.row, to.col, 'queen');
            const result = minimax(sim, depth - 1, alpha, beta, true, aiColor);
            if (result.score < minEval) {
                minEval = result.score;
                bestMove = { from, to };
            }
            beta = Math.min(beta, minEval);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getAllMoves(board, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === color) {
                const targets = getValidMoves(board, r, c);
                for (const t of targets) {
                    moves.push({ from: { row: r, col: c }, to: t });
                }
            }
        }
    }
    return moves;
}

// Move ordering: prioritize captures and upgrades for better pruning
function orderMoves(board, moves) {
    return moves.sort((a, b) => {
        const targetA = board[a.to.row][a.to.col];
        const targetB = board[b.to.row][b.to.col];
        const valA = targetA ? (PIECE_VALUE[targetA.type] || 0) : 0;
        const valB = targetB ? (PIECE_VALUE[targetB.type] || 0) : 0;
        return valB - valA;
    });
}

export function getBestMove(board, aiColor) {
    const result = minimax(board, aiDepth, -Infinity, Infinity, true, aiColor);
    return result.move;
}
