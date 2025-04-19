/*
 * ======================================
 * CRITICAL WARNING - DO NOT MODIFY
 * ======================================
 * This file contains the core game logic and rules for Turkish Draughts (Dama).
 * Any modifications to this file may break the game's fundamental mechanics.
 * 
 * Key components:
 * - Board initialization
 * - Game rules and move validation
 * - Piece movement and capture logic
 * - Game state management
 */

export const BOARD_SIZE = 8;
export const EMPTY = 0;
export const P1_MAN = 1;
export const P2_MAN = 2;
export const P1_KING = 3;
export const P2_KING = 4;
export const AI_PLAYER = 2;
export const HUMAN_PLAYER = 1;

let board = [];
let currentPlayer = HUMAN_PLAYER;
let player1PiecesCount = 12;
let player2PiecesCount = 12;
let gameOver = false;

// Add setter functions for mutable state
export function setBoard(newBoard) {
    board = newBoard;
}

export function setCurrentPlayer(player) {
    currentPlayer = player;
}

export function setPlayer1PiecesCount(count) {
    player1PiecesCount = count;
}

export function setPlayer2PiecesCount(count) {
    player2PiecesCount = count;
}

export function setGameOver(value) {
    gameOver = value;
}

export function initializeBoard() {
    board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY));
    gameOver = false;
    currentPlayer = HUMAN_PLAYER;
    player1PiecesCount = 12;
    player2PiecesCount = 12;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (row === 0 || row === BOARD_SIZE - 1) {
                board[row][col] = EMPTY;
            }
            else if (row === 1 || row === 2) {
                board[row][col] = P2_MAN;
            }
            else if (row === 5 || row === 6) {
                board[row][col] = P1_MAN;
            }
            else {
                board[row][col] = EMPTY;
            }
        }
    }
}

export function getPlayer(pieceType) {
    return pieceType === P1_MAN || pieceType === P1_KING ? 1 : 
           pieceType === P2_MAN || pieceType === P2_KING ? 2 : 0;
}

export function getOpponent(player) {
    return player === 1 ? 2 : 1;
}

export function isKing(pieceType) {
    return pieceType === P1_KING || pieceType === P2_KING;
}

export function isValidSquare(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function calculateValidMovesForPlayer(player, boardState) {
    let availableMoves = [];
    let mandatoryPieces = [];
    let currentMaxCapture = 0;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (getPlayer(boardState[row][col]) === player) {
                const captures = findAllCaptures(row, col, boardState[row][col], boardState);
                if (captures.length > 0) {
                    const maxCaptureForPiece = Math.max(...captures.map(m => m.sequence.length));
                    if (maxCaptureForPiece > currentMaxCapture) {
                        currentMaxCapture = maxCaptureForPiece;
                        mandatoryPieces = [[row, col]];
                        availableMoves = captures.filter(m => m.sequence.length === maxCaptureForPiece);
                    } else if (maxCaptureForPiece === currentMaxCapture) {
                        mandatoryPieces.push([row, col]);
                        availableMoves.push(...captures.filter(m => m.sequence.length === maxCaptureForPiece));
                    }
                }
            }
        }
    }
    
    if (currentMaxCapture === 0) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (getPlayer(boardState[row][col]) === player) {
                    const normalMoves = findNormalMoves(row, col, boardState[row][col], boardState);
                    availableMoves.push(...normalMoves);
                }
            }
        }
    }
    
    return { availableMoves, mandatoryPieces, maxCaptures: currentMaxCapture };
}

export function findAllCaptures(row, col, pieceType, boardState) {
    const visited = new Set();
    const moves = [];
    
    function findCaptures(currentRow, currentCol, sequence, capturedPieces) {
        const visitedKey = (r, c) => `${r},${c}`;
        visited.add(visitedKey(currentRow, currentCol));
        
        const directions = isKing(pieceType) ? 
            [[1,0], [-1,0], [0,1], [0,-1]] :
            getPlayer(pieceType) === 1 ? 
                [[-1,0], [0,1], [0,-1]] :
                [[1,0], [0,1], [0,-1]];
        
        let foundCapture = false;
        
        for (const [dr, dc] of directions) {
            let r = currentRow + dr;
            let c = currentCol + dc;
            
            while (isValidSquare(r, c)) {
                const key = visitedKey(r, c);
                if (boardState[r][c] !== EMPTY) {
                    if (getPlayer(boardState[r][c]) === getOpponent(getPlayer(pieceType)) && 
                        !capturedPieces.has(key)) {
                        const jumpRow = r + dr;
                        const jumpCol = c + dc;
                        
                        if (isValidSquare(jumpRow, jumpCol) && 
                            boardState[jumpRow][jumpCol] === EMPTY && 
                            !visited.has(visitedKey(jumpRow, jumpCol))) {
                            
                            foundCapture = true;
                            const newCapturedPieces = new Set(capturedPieces);
                            newCapturedPieces.add(key);
                            
                            const newSequence = [...sequence, {
                                toRow: jumpRow,
                                toCol: jumpCol,
                                capturedRow: r,
                                capturedCol: c
                            }];
                            
                            const newBoard = simulateMove(boardState, {
                                fromRow: currentRow,
                                fromCol: currentCol,
                                toRow: jumpRow,
                                toCol: jumpCol,
                                capturedRow: r,
                                capturedCol: c
                            });
                            
                            findCaptures(jumpRow, jumpCol, newSequence, newCapturedPieces);
                        }
                    }
                    break;
                }
                if (!isKing(pieceType)) break;
                r += dr;
                c += dc;
            }
        }
        
        if (!foundCapture && sequence.length > 0) {
            moves.push({
                fromRow: row,
                fromCol: col,
                sequence: sequence
            });
        }
    }
    
    findCaptures(row, col, [], new Set());
    return moves;
}

export function findNormalMoves(row, col, pieceType, boardState) {
    const moves = [];
    const directions = isKing(pieceType) ? 
        [[1,0], [-1,0], [0,1], [0,-1]] :
        getPlayer(pieceType) === 1 ? 
            [[-1,0], [0,1], [0,-1]] :
            [[1,0], [0,1], [0,-1]];
    
    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        
        while (isValidSquare(r, c) && boardState[r][c] === EMPTY) {
            moves.push({
                fromRow: row,
                fromCol: col,
                sequence: [{
                    toRow: r,
                    toCol: c
                }]
            });
            if (!isKing(pieceType)) break;
            r += dr;
            c += dc;
        }
    }
    
    return moves;
}

export function simulateMove(currentBoard, moveDetails) {
    let newBoard = currentBoard.map(row => [...row]);
    const { fromRow, fromCol, toRow, toCol, capturedRow, capturedCol } = moveDetails;
    
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = EMPTY;
    
    if (capturedRow !== undefined && capturedCol !== undefined) {
        newBoard[capturedRow][capturedCol] = EMPTY;
    }
    
    if (toRow === 0 && newBoard[toRow][toCol] === P1_MAN) {
        newBoard[toRow][toCol] = P1_KING;
    } else if (toRow === BOARD_SIZE - 1 && newBoard[toRow][toCol] === P2_MAN) {
        newBoard[toRow][toCol] = P2_KING;
    }
    
    return newBoard;
}

// Export state variables
export { board, currentPlayer, player1PiecesCount, player2PiecesCount, gameOver }