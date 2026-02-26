/**
 * Web Worker: runs getBestMove off the main thread so the UI doesn't freeze.
 * Receives: { board, aiColor, castlingRights, depth }
 * Sends back: { move } or { error: "message" }
 */
import { getBestMove, setAiDepth } from './ai.js';

self.onmessage = function (e) {
    try {
        const { board, aiColor, castlingRights, depth } = e.data;
        setAiDepth(depth);
        const move = getBestMove(board, aiColor, castlingRights);
        self.postMessage({ move });
    } catch (err) {
        self.postMessage({ error: err instanceof Error ? err.message : String(err) });
    }
};
