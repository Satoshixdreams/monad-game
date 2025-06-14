import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';
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
    const [gameMode, setGameMode] = useState('pvc');
    const [statusMessage, setStatusMessage] = useState('');
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [btmBalance, setBtmBalance] = useState('');

    // Chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showChat, setShowChat] = useState(true);
    const chatEndRef = useRef(null);
    
    // حالات نظام الغرف
    const [socket, setSocket] = useState(null);
    const [username, setUsername] = useState('');
    const [roomsList, setRoomsList] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [roomName, setRoomName] = useState('');
    const [onlineStatus, setOnlineStatus] = useState('browse'); // browse, create, room
    
    // Mock other player for demonstration
    const mockPlayerAddress = '0x89e5F2B3C3Ae3A99983ADE8A9732De67C80fa2c3';
    const mockPlayerName = mockPlayerAddress.slice(0, 6) + '...' + mockPlayerAddress.slice(-4);

    useEffect(() => {
        startNewGame();
    }, []);

    // تهيئة الاتصال بالخادم عندما يختار المستخدم وضع اللعب عبر الإنترنت
    useEffect(() => {
        if (gameMode === 'online' && !socket) {
            // استبدل بعنوان الخادم الخاص بك - في الوضع المحلي سيكون localhost:3002
            const newSocket = io('http://localhost:3002');
            
            newSocket.on('connect', () => {
                console.log('Connected to server');
                setStatusMessage('Connected to online game server');
            });
            
            newSocket.on('roomsList', (rooms) => {
                setRoomsList(rooms);
            });
            
            newSocket.on('roomCreated', ({ roomId, room }) => {
                setCurrentRoom(room);
                setOnlineStatus('room');
                setStatusMessage(`Room created: ${room.name}`);
            });
            
            newSocket.on('playerJoined', ({ room }) => {
                setCurrentRoom(room);
                setStatusMessage(`New player joined: ${room.players[room.players.length-1].name}`);
            });
            
            newSocket.on('playerStatusUpdate', ({ room }) => {
                setCurrentRoom(room);
                const readyPlayers = room.players.filter(p => p.ready).length;
                setStatusMessage(`${readyPlayers} of ${room.players.length} players ready`);
            });
            
            newSocket.on('gameStart', ({ gameState }) => {
                setGameState({
                    board: gameState.board,
                    currentPlayer: gameState.currentPlayer,
                    player1PiecesCount: gameState.player1PiecesCount,
                    player2PiecesCount: gameState.player2PiecesCount,
                    gameOver: gameState.gameOver
                });
                setStatusMessage(`Game started! Player ${gameState.currentPlayer}'s turn`);
            });
            
            newSocket.on('gameStateUpdate', ({ gameState }) => {
                setGameState({
                    board: gameState.board,
                    currentPlayer: gameState.currentPlayer,
                    player1PiecesCount: gameState.player1PiecesCount,
                    player2PiecesCount: gameState.player2PiecesCount,
                    gameOver: gameState.gameOver
                });
                setStatusMessage(`Player ${gameState.currentPlayer}'s turn`);
            });
            
            newSocket.on('gameOver', ({ winner, gameState }) => {
                showWinMessage(winner);
                setGameState(prev => ({ ...prev, gameOver: true }));
            });
            
            newSocket.on('playerLeft', ({ room }) => {
                setCurrentRoom(room);
                if (room.players.length < 2) {
                    setStatusMessage('Other player left the game');
                }
            });
            
            newSocket.on('error', ({ message }) => {
                setStatusMessage(message);
            });
            
            setSocket(newSocket);
            
            return () => {
                newSocket.disconnect();
            };
        }
    }, [gameMode]);

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
        setStatusMessage('Player 1\'s turn');
        setSelectedPiece(null);
        setValidMoves([]);
    };

    // وظائف إدارة الغرف
    const createRoom = (roomName) => {
        if (!socket || !walletConnected) {
            setStatusMessage('You must connect your wallet first to play online');
            return;
        }
        
        socket.emit('createRoom', {
            roomName,
            playerName: username || walletAddress.slice(0, 8),
            walletAddress
        });
    };
    
    const joinRoom = (roomId) => {
        if (!socket || !walletConnected) {
            setStatusMessage('You must connect your wallet first to play online');
            return;
        }
        
        socket.emit('joinRoom', {
            roomId,
            playerName: username || walletAddress.slice(0, 8),
            walletAddress
        });
        
        setOnlineStatus('room');
    };
    
    const setPlayerReady = () => {
        if (!socket || !currentRoom) return;
        
        socket.emit('playerReady');
        setStatusMessage('You are ready! Waiting for other player...');
    };
    
    const sendMove = (fromRow, fromCol, toRow, toCol) => {
        if (!socket || !currentRoom) return;
        
        socket.emit('move', { fromRow, fromCol, toRow, toCol });
    };

    const handlePieceClick = (row, col) => {
        if (gameState.gameOver || 
            (gameMode === 'pvc' && gameState.currentPlayer === AI_PLAYER) ||
            (gameMode === 'online' && currentRoom?.status === 'playing' && 
             currentRoom?.players.find(p => p.id === socket.id)?.color !== gameState.currentPlayer)) {
            return;
        }
        
        if (getPlayer(gameState.board[row][col]) !== gameState.currentPlayer) {
            setStatusMessage(`Player ${gameState.currentPlayer}'s turn`);
            return;
        }
        
        const moveInfo = calculateValidMovesForPlayer(gameState.currentPlayer, gameState.board);
        setMandatoryPieces(moveInfo.mandatoryPieces);
        
        const pieceValidMoves = moveInfo.availableMoves.filter(m => 
            m.fromRow === row && m.fromCol === col
        );
        
        if (mandatoryPieces.length > 0 && 
            !mandatoryPieces.some(([r, c]) => r === row && c === col)) {
            setStatusMessage('You must make the mandatory capture');
            return;
        }
        
        if (selectedPiece?.row === row && selectedPiece?.col === col) {
            setSelectedPiece(null);
            setValidMoves([]);
            setStatusMessage(`Player ${gameState.currentPlayer}'s turn`);
        } else if (pieceValidMoves.length > 0) {
            setValidMoves(pieceValidMoves);
            setSelectedPiece({ row, col });
            setStatusMessage('Select a square to move to');
        } else {
            setStatusMessage('No valid moves for this piece');
        }
    };

    const handleSquareClick = (row, col) => {
        if (!selectedPiece || gameState.gameOver || 
            (gameMode === 'pvc' && gameState.currentPlayer === AI_PLAYER) ||
            (gameMode === 'online' && currentRoom?.status === 'playing' && 
             currentRoom?.players.find(p => p.id === socket.id)?.color !== gameState.currentPlayer)) {
            return;
        }
        
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
        // في وضع اللعب عبر الإنترنت، نرسل الحركة للخادم فقط
        if (gameMode === 'online') {
            const firstStep = move.sequence[0];
            sendMove(move.fromRow, move.fromCol, firstStep.toRow, firstStep.toCol);
            return;
        }
        
        // كود اللعب المحلي
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
        
        setStatusMessage(`Player ${nextPlayer}'s turn`);
        
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
            
            setStatusMessage(`Player ${winner} wins!`);
            
            if (rewardResult.success) {
                setBtmBalance(`${rewardResult.balance} BTM`);
                
                // Check if we have a custom message from the reward function
                if (rewardResult.message) {
                    setStatusMessage(prev => `${prev} ${rewardResult.message}`);
                } else {
                    setStatusMessage(prev => `${prev} Sent ${reward} BTM as reward!`);
                }
            } else {
                // Display custom error message if available
                if (rewardResult.message) {
                    setStatusMessage(prev => `${prev} ${rewardResult.message}`);
                } else {
                    setStatusMessage(prev => `${prev} Failed to send reward. Please check your wallet connection.`);
                }
            }
        } catch (error) {
            console.error('Error sending reward:', error);
            setStatusMessage(prev => `${prev} An error occurred while sending the reward`);
        }
    };

    const handleConnectWallet = async () => {
        if (walletConnected) {
            const result = disconnectWallet();
            if (result.success) {
                setWalletConnected(false);
                setWalletAddress('');
                setBtmBalance('');
                setStatusMessage('Wallet disconnected');
            }
        } else {
            try {
                setStatusMessage('Connecting to wallet...');
                const result = await connectWallet();
                
                if (result.success) {
                    setWalletConnected(true);
                    setWalletAddress(result.address);
                    
                    // Format the BTM balance
                    const formattedBalance = parseFloat(result.balance).toFixed(4);
                    setBtmBalance(formattedBalance);
                    
                    setStatusMessage(`Successfully connected to wallet! Balance: ${formattedBalance} BTM`);
                    
                    // Check if we're on Monad testnet
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    if (chainId !== '0x279f') { // 0x279f is 10143 in hex
                        setStatusMessage('Please switch to Monad Testnet');
                    }
                } else {
                    setStatusMessage('Failed to connect wallet');
                }
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                setStatusMessage(`Failed to connect wallet: ${error.message}`);
            }
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!currentMessage.trim()) return;
        
        if (!walletConnected) {
            // Show alert if not connected
            alert('Please connect your wallet to participate in chat');
            return;
        }

        // Create new message
        const newMessage = {
            id: Date.now(),
            text: currentMessage,
            sender: walletAddress ? (walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)) : 'Guest',
            timestamp: new Date().toLocaleTimeString()
        };

        // Add message to chat
        setChatMessages(prev => [...prev, newMessage]);
        
        // Clear input
        setCurrentMessage('');
        
        // In online mode, we could send the message to the server to distribute to players
        if (gameMode === 'online' && socket && currentRoom) {
            // socket.emit('chatMessage', { roomId: currentRoom.id, message: newMessage });
        } else {
            // Mock response from other player after 1-3 seconds
            if (chatMessages.length < 10 && Math.random() > 0.3) {
                const responses = [
                    'Well done! That was a good move',
                    'Hello, are you ready to play?',
                    'Great game!',
                    'I am really enjoying this game',
                    'Do you know any good strategy?',
                    'I have been playing for years',
                    'This time I will win!',
                    'I need to pay more attention',
                    'Good luck to you',
                    'Have you played Turkish Checkers before?'
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
        }
    };

    // Add initial welcome message when the component mounts
    useEffect(() => {
        if (chatMessages.length === 0) {
            setChatMessages([{
                id: Date.now(),
                text: 'Welcome to the chat room! You can communicate with the other player here. Connect your wallet to participate.',
                sender: 'System',
                timestamp: new Date().toLocaleTimeString(),
                isSystem: true
            }]);
        }
    }, []); // Empty dependency array to run only once on mount

    const toggleChat = () => {
        // Only toggle visibility - do not change position
        setShowChat(prev => !prev);
    };

    // عرض واجهة قائمة الغرف
    const renderRoomsList = () => (
        <div className="rooms-list">
            <h3>Available Rooms</h3>
            {roomsList.length === 0 ? (
                <p>No rooms available at the moment</p>
            ) : (
                <ul>
                    {roomsList.map(room => (
                        <li key={room.id}>
                            {room.name} ({room.players}/2)
                            <button onClick={() => joinRoom(room.id)}>Join</button>
                        </li>
                    ))}
                </ul>
            )}
            <button onClick={() => setOnlineStatus('create')}>Create Room</button>
            <button onClick={() => setGameMode('pvp')}>Back to Local Play</button>
        </div>
    );
    
    // عرض واجهة إنشاء غرفة جديدة
    const renderCreateRoom = () => (
        <div className="create-room">
            <h3>Create New Room</h3>
            <input
                type="text"
                placeholder="Room Name"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
            />
            <button onClick={() => createRoom(roomName)}>Create</button>
            <button onClick={() => setOnlineStatus('browse')}>Back</button>
        </div>
    );
    
    // عرض واجهة الغرفة
    const renderRoom = () => {
        if (!currentRoom) return null;
        
        const currentPlayer = currentRoom.players.find(p => p.id === socket.id);
        const otherPlayer = currentRoom.players.find(p => p.id !== socket.id);
        
        return (
            <div className="game-room">
                <h3>Room: {currentRoom.name}</h3>
                <div className="players-info">
                    <div className="player-info">
                        <p>You: {currentPlayer?.name}</p>
                        <p>Color: {currentPlayer?.color === 1 ? 'Red' : 'Blue'}</p>
                        <p>Status: {currentPlayer?.ready ? 'Ready' : 'Not Ready'}</p>
                        {!currentPlayer?.ready && (
                            <button onClick={setPlayerReady}>Ready to Play</button>
                        )}
                    </div>
                    
                    {otherPlayer ? (
                        <div className="player-info">
                            <p>Opponent: {otherPlayer.name}</p>
                            <p>Color: {otherPlayer.color === 1 ? 'Red' : 'Blue'}</p>
                            <p>Status: {otherPlayer.ready ? 'Ready' : 'Not Ready'}</p>
                        </div>
                    ) : (
                        <div className="player-info">
                            <p>Waiting for another player...</p>
                        </div>
                    )}
                </div>
                
                <button onClick={() => {
                    socket.emit('leaveRoom');
                    setCurrentRoom(null);
                    setOnlineStatus('browse');
                }}>Leave Room</button>
            </div>
        );
    };

    // Use simple game info section
    const renderGameInfo = () => (
        <div className="game-info">
            <div className="status-area">{statusMessage}</div>
            <div className="pieces-count-area">
                Player 1: {gameState.player1PiecesCount} | Player 2: {gameState.player2PiecesCount}
            </div>
        </div>
    );

    return (
        <div className="game-container">
            <div className="wallet-section">
                <button 
                    className="connect-wallet"
                    onClick={handleConnectWallet}
                >
                    {walletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
                </button>
                {walletConnected && (
                    <>
                        <span className="wallet-address">Address: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                        <span className="token-balance">BTM Balance: {btmBalance}</span>
                    </>
                )}
            </div>

            {/* إضافة اختيار وضع اللعب */}
            <div className="game-setup">
                <div className="mode-selection">
                    <label>Game Mode:</label>
                    <select 
                        value={gameMode} 
                        onChange={(e) => {
                            setGameMode(e.target.value);
                            if (e.target.value === 'online') {
                                setOnlineStatus('browse');
                            } else {
                                startNewGame();
                            }
                        }}
                    >
                        <option value="pvp">Player vs Player (Local)</option>
                        <option value="pvc">Player vs Smart AI</option>
                        <option value="online">Online Multiplayer</option>
                    </select>
                </div>
            </div>

            {/* Main Game Area Container */}
            <div className="main-layout">
                {/* عرض واجهة اللعب عبر الإنترنت */}
                {gameMode === 'online' && onlineStatus === 'browse' && renderRoomsList()}
                {gameMode === 'online' && onlineStatus === 'create' && renderCreateRoom()}
                {gameMode === 'online' && onlineStatus === 'room' && renderRoom()}
                
                {/* Game Area - Center */}
                {(gameMode !== 'online' || (currentRoom && currentRoom.status === 'playing')) && (
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
                        
                        {renderGameInfo()}
                        
                        <div className="game-controls">
                            {gameMode !== 'online' && (
                                <button className="connect-wallet" onClick={startNewGame}>New Game</button>
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Section - Right Side - Always in position */}
                <div className="chat-section">
                    <button 
                        className="chat-toggle"
                        onClick={toggleChat}
                    >
                        {showChat ? 'Hide Chat' : 'Show Chat'}
                    </button>
                    
                    {showChat && (
                        <div className="chat-container">
                            <div className="chat-messages">
                                {chatMessages.length === 0 ? (
                                    <div className="no-messages">No messages. Start the conversation!</div>
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
                                    placeholder={walletConnected ? "Type your message here..." : "Connect your wallet to participate in chat"}
                                    disabled={!walletConnected}
                                />
                                <button 
                                    type="submit" 
                                    className={`send-button ${!walletConnected ? 'disabled' : ''}`}
                                    disabled={!walletConnected}
                                >
                                    Send
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