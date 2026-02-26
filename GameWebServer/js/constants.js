export const COLORS = { WHITE: 'white', BLACK: 'black' };

export const TYPES = {
    PAWN: 'pawn',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    ROOK: 'rook',
    QUEEN: 'queen',
    KING: 'king',
};

// Strict upgrade hierarchy -- position matters, not just point value.
// Bishop(2) capturing Knight(3) upgrades; Knight(3) capturing Bishop(2) does not.
export const PIECE_RANK = {
    pawn: 1,
    bishop: 2,
    knight: 3,
    rook: 4,
    queen: 5,
};

// Centipawn-scale values for AI evaluation
export const PIECE_VALUE = {
    pawn: 100,
    bishop: 320,
    knight: 330,
    rook: 500,
    queen: 900,
    king: 0,
};

export const UNICODE_PIECES = {
    white: { king: '\u265A', queen: '\u265B', rook: '\u265C', bishop: '\u265D', knight: '\u265E', pawn: '\u265F' },
    black: { king: '\u265A', queen: '\u265B', rook: '\u265C', bishop: '\u265D', knight: '\u265E', pawn: '\u265F' },
};

// Row 0 = black back rank, Row 7 = white back rank
const B = COLORS.BLACK;
const W = COLORS.WHITE;
const T = TYPES;

function p(color, type) {
    if (type === T.KING) return { color, type, extraMoves: [] };
    return { color, type };
}

export const INITIAL_LAYOUT = [
    [p(B,T.ROOK), p(B,T.KNIGHT), p(B,T.BISHOP), p(B,T.QUEEN), p(B,T.KING), p(B,T.BISHOP), p(B,T.KNIGHT), p(B,T.ROOK)],
    [p(B,T.PAWN), p(B,T.PAWN),   p(B,T.PAWN),   p(B,T.PAWN),  p(B,T.PAWN), p(B,T.PAWN),   p(B,T.PAWN),   p(B,T.PAWN)],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [p(W,T.PAWN), p(W,T.PAWN),   p(W,T.PAWN),   p(W,T.PAWN),  p(W,T.PAWN), p(W,T.PAWN),   p(W,T.PAWN),   p(W,T.PAWN)],
    [p(W,T.ROOK), p(W,T.KNIGHT), p(W,T.BISHOP), p(W,T.QUEEN), p(W,T.KING), p(W,T.BISHOP), p(W,T.KNIGHT), p(W,T.ROOK)],
];
