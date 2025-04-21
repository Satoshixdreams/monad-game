/*
 * ======================================
 * CRITICAL WARNING - DO NOT MODIFY
 * ======================================
 * This file contains the AI logic for the computer player.
 * Any modifications to this file may affect the AI's behavior and decision-making.
 * 
 * Key components:
 * - AI move selection
 * - Minimax algorithm implementation
 * - Board evaluation functions
 * - Game tree search logic
 */

import { 
    AI_PLAYER,
    BOARD_SIZE,
    P2_MAN,
    P2_KING,
    P1_MAN,
    P1_KING,
    EMPTY,
    calculateValidMovesForPlayer,
    getPlayer,
    isKing,
    isValidSquare,
    simulateMove,
    board,
    gameOver,
    currentPlayer
} from './game.js';

// Enhanced AI settings
const AI_SEARCH_DEPTH = 5; // Increased depth for better lookahead
const MOVE_DELAY = 250;

let isComputerThinking = false;
let moveCache = new Map();

export async function triggerComputerMove(makeMove) {
    if (gameOver || currentPlayer !== AI_PLAYER || isComputerThinking) {
        return;
    }

    isComputerThinking = true;
    const boardElement = document.getElementById('board');
    if (boardElement) {
        boardElement.classList.add('thinking');
    }

    try {
        const validMoves = calculateValidMovesForPlayer(AI_PLAYER, board).availableMoves;
        
        if (validMoves.length === 0) {
            return;
        }

        // Add a small delay to make the AI's moves visible
        await new Promise(resolve => setTimeout(resolve, MOVE_DELAY));

        const bestMove = findBestMoveMinimax(
            board.map(r => [...r]), 
            validMoves,
            AI_SEARCH_DEPTH
        );
        
        if (bestMove) {
            const pieceElement = document.querySelector(
                `.piece[data-row='${bestMove.fromRow}'][data-col='${bestMove.fromCol}']`
            );
            
            if (pieceElement) {
                pieceElement.classList.add('selected');
                await new Promise(resolve => setTimeout(resolve, MOVE_DELAY));
                pieceElement.classList.remove('selected');
            }
            
            await makeMove(bestMove);
        } else if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            await makeMove(randomMove);
        }
    } catch (error) {
        console.error('Error in AI move:', error);
    } finally {
        isComputerThinking = false;
        if (boardElement) {
            boardElement.classList.remove('thinking');
        }
    }
}

function getBoardHash(board) {
    return board.flat().join('');
}

function findBestMoveMinimax(currentBoardState, validMoves, depth) {
    const boardHash = getBoardHash(currentBoardState) + depth;
    if (moveCache.has(boardHash)) {
        return moveCache.get(boardHash);
    }

    let bestScore = -Infinity;
    let bestMove = null;
    
    // Sort moves for better alpha-beta pruning
    const sortedMoves = validMoves.sort((a, b) => {
        const scoreA = getQuickMoveScore(a, currentBoardState);
        const scoreB = getQuickMoveScore(b, currentBoardState);
        return scoreB - scoreA;
    });
    
    for (const move of sortedMoves) {
        const boardAfterMove = simulateSequence(currentBoardState, move);
        const score = minimaxRecursive(boardAfterMove, depth - 1, -Infinity, Infinity, false);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    moveCache.set(boardHash, bestMove);
    if (moveCache.size > 1000) {
        const firstKey = moveCache.keys().next().value;
        moveCache.delete(firstKey);
    }
    
    return bestMove;
}

function getQuickMoveScore(move, boardState) {
    let score = 0;
    
    // Captures are valuable
    if (move.sequence[0].capturedRow !== undefined) {
        const capturedPiece = boardState[move.sequence[0].capturedRow][move.sequence[0].capturedCol];
        // King captures worth more
        score += isKing(capturedPiece) ? 150 : 100;
        
        // Multiple captures even better
        if (move.sequence.length > 1) {
            score += 50 * (move.sequence.length - 1);
        }
    }
    
    // Promotion is high value
    if (move.sequence[0].toRow === BOARD_SIZE - 1 && 
        boardState[move.fromRow][move.fromCol] === P2_MAN) {
        score += 250;
    }
    
    // Center control bonus
    const toCol = move.sequence[0].toCol;
    if (toCol > 1 && toCol < 6) {
        score += 20;
    }
    
    return score;
}

function minimaxRecursive(boardState, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) {
        return evaluateBoard(boardState);
    }
    
    const moves = calculateValidMovesForPlayer(
        isMaximizingPlayer ? AI_PLAYER : 1, 
        boardState
    ).availableMoves;
    
    if (moves.length === 0) {
        return isMaximizingPlayer ? -10000 : 10000;
    }
    
    let bestScore = isMaximizingPlayer ? -Infinity : Infinity;
    
    // Sort moves for better pruning if at higher depths
    if (depth > 2) {
        moves.sort((a, b) => {
            const scoreA = getQuickMoveScore(a, boardState);
            const scoreB = getQuickMoveScore(b, boardState);
            return isMaximizingPlayer ? (scoreB - scoreA) : (scoreA - scoreB);
        });
    }
    
    for (const move of moves) {
        const boardAfterMove = simulateSequence(boardState, move);
        const score = minimaxRecursive(boardAfterMove, depth - 1, alpha, beta, !isMaximizingPlayer);
        
        if (isMaximizingPlayer) {
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, bestScore);
        } else {
            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, bestScore);
        }
        
        if (beta <= alpha) break;
    }
    
    return bestScore;
}

function simulateSequence(boardState, move) {
    let boardAfterMove = boardState.map(r => [...r]);
    let currentRow = move.fromRow;
    let currentCol = move.fromCol;
    
    for (const step of move.sequence) {
        boardAfterMove = simulateMove(boardAfterMove, { 
            fromRow: currentRow, 
            fromCol: currentCol, 
            ...step 
        });
        currentRow = step.toRow;
        currentCol = step.toCol;
    }
    
    return boardAfterMove;
}

function evaluateBoard(boardState) {
    let score = 0;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = boardState[r][c];
            const player = getPlayer(piece);
            
            if (player === AI_PLAYER) {
                // Base piece value
                score += 100;
                
                // King is more valuable
                if (isKing(piece)) score += 150;
                
                // Forward advancement for men
                if (!isKing(piece)) {
                    score += r * 8; // Incentivize forward movement
                }
                
                // Promotion potential
                if (r >= 6 && !isKing(piece)) {
                    score += 50; // Close to promotion
                }
                
                // Center control
                if (c > 1 && c < 6) score += 15;
                
                // Edge control - less vulnerable
                if (c === 0 || c === 7) score += 5;
                
                // Protection
                if (isProtected(r, c, boardState)) score += 20;
                
            } else if (player === 1) {
                // Same evaluations for opponent, but negative
                score -= 100;
                
                if (isKing(piece)) score -= 150;
                
                if (!isKing(piece)) {
                    score -= (BOARD_SIZE - 1 - r) * 8; // Forward movement for opponent
                }
                
                if (r <= 1 && !isKing(piece)) {
                    score -= 50; // Opponent close to promotion
                }
                
                if (c > 1 && c < 6) score -= 15; // Center control
                
                if (c === 0 || c === 7) score -= 5; // Edge control
                
                if (isProtected(r, c, boardState)) score -= 20; // Protection
            }
        }
    }
    
    return score;
}

function isProtected(row, col, boardState) {
    const piece = boardState[row][col];
    const player = getPlayer(piece);
    const directions = [[1,0], [-1,0], [0,1], [0,-1]];
    
    for (const [dr, dc] of directions) {
        const r = row + dr;
        const c = col + dc;
        
        if (isValidSquare(r, c) && getPlayer(boardState[r][c]) === player) {
            return true;
        }
    }
    
    return false;
}

// These functions are kept for compatibility but simplified
export function updateAIKnowledge(didAIWin) {
    // Simple placeholder for UI compatibility
    return true;
}

export function evaluatePlayerSkill() {
    return 'intermediate';
}

export function adjustDifficulty(playerSkill) {
    // Fixed difficulty for consistent behavior
    return true;
}