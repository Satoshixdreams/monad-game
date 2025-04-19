import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    initializeBoard, 
    BOARD_SIZE, 
    EMPTY, 
    getPlayer, 
    isKing, 
    AI_PLAYER,
    getOpponent,
    calculateValidMovesForPlayer,
    simulateMove,
    setBoard,
    setCurrentPlayer,
    setPlayer1PiecesCount,
    setPlayer2PiecesCount,
    setGameOver
} from './game.js';

import { connectWallet, disconnectWallet } from './wallet.js';
import { rewardPlayer } from './btm-contract.js';
import { triggerComputerMove } from './bot.js';

function App() {
    const [gameState, setGameState] = useState({
        board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY)),
        currentPlayer: 1,
        player1PiecesCount: 12,
        player2PiecesCount: 12,
        gameOver: false
    });
    
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [mandatoryPieces, setMandatoryPieces] = useState([]);
    const [gameMode, setGameMode] = useState('pvp');
    const [statusMessage, setStatusMessage] = useState('');
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [btmBalance, setBtmBalance] = useState('');

    // Chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showChat, setShowChat] = useState(true);
    const chatEndRef = useRef(null);
    
    // Mock other player for demonstration
    const mockPlayerAddress = '0x89e5F2B3C3Ae3A99983ADE8A9732De67C80fa2c3';
    const mockPlayerName = mockPlayerAddress.slice(0, 6) + '...' + mockPlayerAddress.slice(-4);

    useEffect(() => {
        startNewGame();
    }, []);

    useEffect(() => {
        // Update game.js state
        setBoard(gameState.board);
        setCurrentPlayer(gameState.currentPlayer);
        setPlayer1PiecesCount(gameState.player1PiecesCount);
        setPlayer2PiecesCount(gameState.player2PiecesCount);
        setGameOver(gameState.gameOver);

        // Trigger AI move if it's AI's turn
        if (gameMode === 'pvc' && gameState.currentPlayer === AI_PLAYER && !gameState.gameOver) {
            triggerComputerMove(makeMove);
        }
    }, [gameState, gameMode]);

    // Scroll to bottom of chat when messages change
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    // Keep messages limited to a reasonable count to prevent excessive growth
    useEffect(() => {
        if (chatMessages.length > 50) {
            // Keep only the most recent 50 messages
            setChatMessages(prev => prev.slice(prev.length - 50));
        }
    }, [chatMessages]);

    const startNewGame = () => {
        const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (row === 0 || row === BOARD_SIZE - 1) {
                    newBoard[row][col] = EMPTY;
                }
                else if (row === 1 || row === 2) {
                    newBoard[row][col] = 2; // P2_MAN
                }
                else if (row === 5 || row === 6) {
                    newBoard[row][col] = 1; // P1_MAN
                }
                else {
                    newBoard[row][col] = EMPTY;
                }
            }
        }

        setGameState({
            board: newBoard,
            currentPlayer: 1,
            player1PiecesCount: 12,
            player2PiecesCount: 12,
            gameOver: false
        });
        setStatusMessage('دور اللاعب 1');
        setSelectedPiece(null);
        setValidMoves([]);
    };

    const handlePieceClick = (row, col) => {
        if (gameState.gameOver || (gameMode === 'pvc' && gameState.currentPlayer === AI_PLAYER)) return;
        
        if (getPlayer(gameState.board[row][col]) !== gameState.currentPlayer) {
            setStatusMessage(`دور اللاعب ${gameState.currentPlayer}`);
            return;
        }
        
        const moveInfo = calculateValidMovesForPlayer(gameState.currentPlayer, gameState.board);
        setMandatoryPieces(moveInfo.mandatoryPieces);
        
        const pieceValidMoves = moveInfo.availableMoves.filter(m => 
            m.fromRow === row && m.fromCol === col
        );
        
        if (mandatoryPieces.length > 0 && 
            !mandatoryPieces.some(([r, c]) => r === row && c === col)) {
            setStatusMessage('يجب تنفيذ الضربة الإجبارية');
            return;
        }
        
        if (selectedPiece?.row === row && selectedPiece?.col === col) {
            setSelectedPiece(null);
            setValidMoves([]);
            setStatusMessage(`دور اللاعب ${gameState.currentPlayer}`);
        } else if (pieceValidMoves.length > 0) {
            setValidMoves(pieceValidMoves);
            setSelectedPiece({ row, col });
            setStatusMessage('اختر المربع للتحرك إليه');
        } else {
            setStatusMessage('لا توجد حركات متاحة لهذه القطعة');
        }
    };

    const handleSquareClick = (row, col) => {
        if (!selectedPiece || gameState.gameOver || 
            (gameMode === 'pvc' && gameState.currentPlayer === AI_PLAYER)) return;
        
        const validMove = validMoves.find(m => 
            m.fromRow === selectedPiece.row && 
            m.fromCol === selectedPiece.col && 
            m.sequence[0].toRow === row && 
            m.sequence[0].toCol === col
        );
        
        if (validMove) {
            makeMove(validMove);
        }
        
        setSelectedPiece(null);
        setValidMoves([]);
    };

    const makeMove = async (move) => {
        let currentBoardState = gameState.board.map(row => [...row]);
        let currentRow = move.fromRow;
        let currentCol = move.fromCol;
        let player1Count = gameState.player1PiecesCount;
        let player2Count = gameState.player2PiecesCount;
        
        for (const step of move.sequence) {
            const newBoard = simulateMove(currentBoardState, {
                fromRow: currentRow,
                fromCol: currentCol,
                ...step
            });
            
            if (step.capturedRow !== undefined) {
                const capturedPiece = getPlayer(currentBoardState[step.capturedRow][step.capturedCol]);
                if (capturedPiece === 1) player1Count--;
                else if (capturedPiece === 2) player2Count--;
            }
            
            currentRow = step.toRow;
            currentCol = step.toCol;
            currentBoardState = newBoard;
        }
        
        const nextPlayer = getOpponent(gameState.currentPlayer);
        setGameState(prev => ({
            ...prev,
            board: currentBoardState,
            currentPlayer: nextPlayer,
            player1PiecesCount: player1Count,
            player2PiecesCount: player2Count
        }));
        
        setStatusMessage(`دور اللاعب ${nextPlayer}`);
        
        if (player1Count === 0 || player2Count === 0) {
            await showWinMessage(getOpponent(gameState.currentPlayer));
            setGameState(prev => ({ ...prev, gameOver: true }));
        } else {
            const moves = calculateValidMovesForPlayer(nextPlayer, currentBoardState).availableMoves;
            if (moves.length === 0) {
                await showWinMessage(getOpponent(nextPlayer));
                setGameState(prev => ({ ...prev, gameOver: true }));
            }
        }
    };

    const showWinMessage = async (winner) => {
        try {
            const reward = 10;
            const rewardResult = await rewardPlayer(reward);
            
            setStatusMessage(`الفائز هو اللاعب ${winner}!`);
            
            if (rewardResult.success) {
                setBtmBalance(`${rewardResult.balance} BTM`);
                
                // Check if we have a custom message from the reward function
                if (rewardResult.message) {
                    setStatusMessage(prev => `${prev} ${rewardResult.message}`);
                } else {
                    setStatusMessage(prev => `${prev} تم إرسال ${reward} BTM كمكافأة!`);
                }
            } else {
                // Display custom error message if available
                if (rewardResult.message) {
                    setStatusMessage(prev => `${prev} ${rewardResult.message}`);
                } else {
                    setStatusMessage(prev => `${prev} فشل إرسال المكافأة. يرجى التأكد من اتصال المحفظة.`);
                }
            }
        } catch (error) {
            console.error('خطأ في إرسال المكافأة:', error);
            setStatusMessage(prev => `${prev} حدث خطأ أثناء إرسال المكافأة`);
        }
    };

    const handleConnectWallet = async () => {
        if (walletConnected) {
            const result = disconnectWallet();
            if (result.success) {
                setWalletConnected(false);
                setWalletAddress('');
                setBtmBalance('');
                setStatusMessage('تم فصل المحفظة');
            }
        } else {
            try {
                setStatusMessage('جاري الاتصال بالمحفظة...');
                const result = await connectWallet();
                
                if (result.success) {
                    setWalletConnected(true);
                    setWalletAddress(result.address);
                    
                    // Format the BTM balance
                    const formattedBalance = parseFloat(result.balance).toFixed(4);
                    setBtmBalance(formattedBalance);
                    
                    setStatusMessage(`تم الاتصال بالمحفظة بنجاح! الرصيد: ${formattedBalance} BTM`);
                    
                    // Check if we're on Monad testnet
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    if (chainId !== '0x279f') { // 0x279f is 10143 in hex
                        setStatusMessage('يرجى التبديل إلى شبكة Monad Testnet');
                    }
                } else {
                    setStatusMessage('فشل الاتصال بالمحفظة');
                }
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                setStatusMessage(`فشل الاتصال بالمحفظة: ${error.message}`);
            }
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!currentMessage.trim()) return;
        
        if (!walletConnected) {
            // Show alert if not connected
            alert('يرجى ربط المحفظة للمشاركة في الدردشة');
            return;
        }

        // Create new message
        const newMessage = {
            id: Date.now(),
            text: currentMessage,
            sender: walletAddress ? (walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)) : 'زائر',
            timestamp: new Date().toLocaleTimeString()
        };

        // Add message to chat
        setChatMessages(prev => [...prev, newMessage]);
        
        // Clear input
        setCurrentMessage('');
        
        // Mock response from other player after 1-3 seconds
        if (chatMessages.length < 10 && Math.random() > 0.3) {
            const responses = [
                'أحسنت! هذه حركة جيدة',
                'مرحباً، هل أنت جاهز للعب؟',
                'لعبة ممتازة!',
                'أنا أستمتع بهذه اللعبة كثيراً',
                'هل تعرف استراتيجية جيدة؟',
                'أنا لاعب منذ سنوات',
                'هذه المرة سأفوز!',
                'يجب أن ألعب بانتباه أكثر',
                'أتمنى لك التوفيق',
                'هل لعبت الدامة التركية من قبل؟'
            ];
            
            setTimeout(() => {
                const mockResponse = {
                    id: Date.now() + 1,
                    text: responses[Math.floor(Math.random() * responses.length)],
                    sender: mockPlayerName,
                    timestamp: new Date().toLocaleTimeString()
                };
                setChatMessages(prev => [...prev, mockResponse]);
            }, 1000 + Math.random() * 2000);
        }
    };

    // Add initial welcome message when the component mounts
    useEffect(() => {
        if (chatMessages.length === 0) {
            setChatMessages([{
                id: Date.now(),
                text: 'مرحباً بك في غرفة الدردشة! يمكنك التواصل مع اللاعب الآخر هنا. قم بربط المحفظة للمشاركة.',
                sender: 'النظام',
                timestamp: new Date().toLocaleTimeString(),
                isSystem: true
            }]);
        }
    }, []); // Empty dependency array to run only once on mount

    const toggleChat = () => {
        // Only toggle visibility - do not change position
        setShowChat(prev => !prev);
    };

    return (
        <div className="game-container">
            <div className="wallet-section">
                <button 
                    className="connect-wallet"
                    onClick={handleConnectWallet}
                >
                    {walletConnected ? 'فصل المحفظة' : 'ربط المحفظة'}
                </button>
                {walletConnected && (
                    <>
                        <span className="wallet-address">العنوان: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                        <span className="token-balance">رصيد BTM: {btmBalance}</span>
                    </>
                )}
            </div>

            {/* Main Game Area Container */}
            <div className="main-layout">
                {/* Game Area - Center */}
                <div className="game-area">
                    {/* Game Board */}
                    <div id="board" className="game-board">
                        {gameState.board.map((row, rowIndex) => (
                            row.map((cell, colIndex) => {
                                const isSelected = selectedPiece?.row === rowIndex && 
                                                 selectedPiece?.col === colIndex;
                                const isValidMove = validMoves.some(move => 
                                    move.sequence[0].toRow === rowIndex && 
                                    move.sequence[0].toCol === colIndex
                                );
                                
                                return (
                                    <div 
                                        key={`${rowIndex}-${colIndex}`}
                                        className={`square ${isValidMove ? 'valid-move' : ''}`}
                                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                                    >
                                        {cell !== EMPTY && (
                                            <div 
                                                className={`piece player${getPlayer(cell)} ${isKing(cell) ? 'king' : ''} ${isSelected ? 'selected' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePieceClick(rowIndex, colIndex);
                                                }}
                                                data-row={rowIndex}
                                                data-col={colIndex}
                                            />
                                        )}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                    
                    <div className="game-info">
                        <div className="status-area">{statusMessage}</div>
                        <div className="pieces-count-area">
                            اللاعب 1: {gameState.player1PiecesCount} | اللاعب 2: {gameState.player2PiecesCount}
                        </div>
                    </div>
                    
                    <div className="game-controls">
                        <button className="connect-wallet" onClick={startNewGame}>لعبة جديدة</button>
                        <select 
                            value={gameMode} 
                            onChange={(e) => {
                                setGameMode(e.target.value);
                                startNewGame();
                            }}
                        >
                            <option value="pvp">لاعب ضد لاعب</option>
                            <option value="pvc">لاعب ضد كمبيوتر</option>
                        </select>
                    </div>
                </div>

                {/* Chat Section - Right Side - Always in position */}
                <div className="chat-section">
                    <button 
                        className="chat-toggle"
                        onClick={toggleChat}
                    >
                        {showChat ? 'إخفاء الدردشة' : 'إظهار الدردشة'}
                    </button>
                    
                    {showChat && (
                        <div className="chat-container">
                            <div className="chat-header">
                                <h3>دردشة اللاعبين {!walletConnected && <span className="read-only">(للقراءة فقط)</span>}</h3>
                            </div>
                            <div className="chat-messages">
                                {chatMessages.length === 0 ? (
                                    <div className="no-messages">لا توجد رسائل. ابدأ المحادثة!</div>
                                ) : (
                                    chatMessages.map(msg => (
                                        <div 
                                            key={msg.id} 
                                            className={`chat-message ${msg.isSystem ? 'system-message' : msg.sender.startsWith(walletAddress?.slice(0, 6) || '') ? 'my-message' : 'other-message'}`}
                                        >
                                            {!msg.isSystem && <div className="message-sender">{msg.sender}</div>}
                                            <div className="message-text">{msg.text}</div>
                                            {!msg.isSystem && <div className="message-time">{msg.timestamp}</div>}
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <form className="chat-input" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={e => setCurrentMessage(e.target.value)}
                                    placeholder={walletConnected ? "اكتب رسالتك هنا..." : "قم بربط المحفظة للمشاركة في الدردشة"}
                                    disabled={!walletConnected}
                                />
                                <button 
                                    type="submit" 
                                    className={`send-button ${!walletConnected ? 'disabled' : ''}`}
                                    disabled={!walletConnected}
                                >
                                    إرسال
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);