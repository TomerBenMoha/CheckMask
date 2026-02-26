import { inBounds, cloneBoard, findKing } from './board.js';

// ---------------------------------------------------------------------------
// Sliding helper -- shared by bishop, rook, queen
// ---------------------------------------------------------------------------
function slidingMoves(board, row, col, color, directions) {
    const moves = [];
    for (const [dr, dc] of directions) {
        let r = row + dr, c = col + dc;
        while (inBounds(r, c)) {
            const target = board[r][c];
            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (target.color !== color) moves.push({ row: r, col: c });
                break;
            }
            r += dr;
            c += dc;
        }
    }
    return moves;
}

// ---------------------------------------------------------------------------
// Per-type raw move generators (no check filtering)
// ---------------------------------------------------------------------------

const DIAGONALS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ORTHOGONALS = [[-1,0],[1,0],[0,-1],[0,1]];
const ALL_DIRS = [...DIAGONALS, ...ORTHOGONALS];

export function getPawnMoves(board, row, col) {
    const piece = board[row][col];
    const color = piece.color;
    const moves = [];
    const dir = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    // Forward 1
    if (inBounds(row + dir, col) && !board[row + dir][col]) {
        moves.push({ row: row + dir, col });
        // Forward 2 from start
        if (row === startRow && !board[row + 2 * dir][col]) {
            moves.push({ row: row + 2 * dir, col });
        }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
        const nr = row + dir, nc = col + dc;
        if (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (target && target.color !== color) moves.push({ row: nr, col: nc });
        }
    }
    return moves;
}

export function getBishopMoves(board, row, col) {
    return slidingMoves(board, row, col, board[row][col].color, DIAGONALS);
}

export function getKnightMoves(board, row, col) {
    const color = board[row][col].color;
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    const moves = [];
    for (const [dr, dc] of offsets) {
        const r = row + dr, c = col + dc;
        if (inBounds(r, c)) {
            const target = board[r][c];
            if (!target || target.color !== color) moves.push({ row: r, col: c });
        }
    }
    return moves;
}

export function getRookMoves(board, row, col) {
    return slidingMoves(board, row, col, board[row][col].color, ORTHOGONALS);
}

export function getQueenMoves(board, row, col) {
    return slidingMoves(board, row, col, board[row][col].color, ALL_DIRS);
}

export function getStandardKingMoves(board, row, col) {
    const color = board[row][col].color;
    const moves = [];
    for (const [dr, dc] of ALL_DIRS) {
        const r = row + dr, c = col + dc;
        if (inBounds(r, c)) {
            const target = board[r][c];
            if (!target || target.color !== color) moves.push({ row: r, col: c });
        }
    }
    return moves;
}

// Lookup from type string to generator (for King's extraMoves)
const MOVE_GENERATORS = {
    pawn: getPawnMoves,
    bishop: getBishopMoves,
    knight: getKnightMoves,
    rook: getRookMoves,
    queen: getQueenMoves,
};

export function getKingMoves(board, row, col) {
    const piece = board[row][col];
    const seen = new Set();
    const key = (r, c) => r * 8 + c;
    const moves = [];

    function add(list) {
        for (const m of list) {
            const k = key(m.row, m.col);
            if (!seen.has(k)) { seen.add(k); moves.push(m); }
        }
    }

    add(getStandardKingMoves(board, row, col));

    if (piece.extraMoves) {
        for (const type of piece.extraMoves) {
            const gen = MOVE_GENERATORS[type];
            if (gen) add(gen(board, row, col));
        }
    }
    return moves;
}

// ---------------------------------------------------------------------------
// Dispatch raw moves by piece type
// ---------------------------------------------------------------------------
function getRawMoves(board, row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    switch (piece.type) {
        case 'pawn':   return getPawnMoves(board, row, col);
        case 'bishop': return getBishopMoves(board, row, col);
        case 'knight': return getKnightMoves(board, row, col);
        case 'rook':   return getRookMoves(board, row, col);
        case 'queen':  return getQueenMoves(board, row, col);
        case 'king':   return getKingMoves(board, row, col);
        default:       return [];
    }
}

// ---------------------------------------------------------------------------
// Check-aware valid moves (public API)
// ---------------------------------------------------------------------------

export function isSquareAttacked(board, row, col, byColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === byColor) {
                const moves = getRawMoves(board, r, c);
                if (moves.some(m => m.row === row && m.col === col)) return true;
            }
        }
    }
    return false;
}

export function getValidMoves(board, row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    const raw = getRawMoves(board, row, col);
    const legal = [];

    for (const move of raw) {
        const sim = cloneBoard(board);
        sim[move.row][move.col] = sim[row][col];
        sim[row][col] = null;
        const king = findKing(sim, piece.color);
        if (king && !isSquareAttacked(sim, king.row, king.col, piece.color === 'white' ? 'black' : 'white')) {
            legal.push(move);
        }
    }
    return legal;
}

export { getRawMoves };
