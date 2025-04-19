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
    calculateValidMovesForPlayer,
    getPlayer,
    isKing,
    isValidSquare,
    simulateMove,
    board,
    gameOver,
    currentPlayer
} from './game.js';

const AI_SEARCH_DEPTH = 4;
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
    
    if (move.sequence[0].capturedRow !== undefined) {
        const capturedPiece = boardState[move.sequence[0].capturedRow][move.sequence[0].capturedCol];
        score += isKing(capturedPiece) ? 150 : 100;
    }
    
    if (move.sequence[0].toRow === BOARD_SIZE - 1 && 
        boardState[move.fromRow][move.fromCol] === P2_MAN) {
        score += 200;
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
                score += 100;
                if (isKing(piece)) score += 80;
                if (r >= 5) score += (r - 4) * 30;
                if (c > 1 && c < 6) score += 15;
                if (isProtected(r, c, boardState)) score += 25;
            } else if (player === 1) {
                score -= 100;
                if (isKing(piece)) score -= 80;
                if (r <= 2) score -= (3 - r) * 30;
                if (c > 1 && c < 6) score -= 15;
                if (isProtected(r, c, boardState)) score -= 25;
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