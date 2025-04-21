const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://bitmon.site", "https://www.bitmon.site", "http://localhost:3002"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// لتخزين معلومات الغرف والمباريات
const rooms = {};
const players = {};

// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname, 'dist')));

// توجيه جميع طلبات HTTP إلى index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`لاعب جديد متصل: ${socket.id}`);
  
  // إنشاء غرفة جديدة
  socket.on('createRoom', ({ roomName, playerName, walletAddress }) => {
    const roomId = generateRoomId();
    
    rooms[roomId] = {
      id: roomId,
      name: roomName,
      players: [{
        id: socket.id,
        name: playerName,
        walletAddress,
        color: 1, // اللاعب الأول (أحمر)
        ready: false
      }],
      status: 'waiting', // الحالات: waiting, playing, finished
      gameState: null,
      spectators: []
    };
    
    // ربط اللاعب بالغرفة
    players[socket.id] = roomId;
    
    // انضمام اللاعب للغرفة
    socket.join(roomId);
    
    // إرسال تأكيد إنشاء الغرفة
    socket.emit('roomCreated', { roomId, room: rooms[roomId] });
    io.emit('roomsList', getRoomsList());
    
    console.log(`لاعب بعنوان محفظة: ${walletAddress} انضم للغرفة`);
  });
  
  // الانضمام إلى غرفة موجودة
  socket.on('joinRoom', ({ roomId, playerName, walletAddress }) => {
    const room = rooms[roomId];
    
    if (!room) {
      socket.emit('error', { message: 'الغرفة غير موجودة' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'الغرفة ممتلئة' });
      return;
    }
    
    // إضافة اللاعب للغرفة
    room.players.push({
      id: socket.id,
      name: playerName,
      walletAddress,
      color: 2, // اللاعب الثاني (أزرق)
      ready: false
    });
    
    // ربط اللاعب بالغرفة
    players[socket.id] = roomId;
    
    // انضمام اللاعب للغرفة
    socket.join(roomId);
    
    // إخطار اللاعبين
    io.to(roomId).emit('playerJoined', { room });
    io.emit('roomsList', getRoomsList());
    
    console.log(`لاعب بعنوان محفظة: ${walletAddress} انضم للغرفة`);
  });
  
  // عندما يكون اللاعب جاهزاً
  socket.on('playerReady', () => {
    const roomId = players[socket.id];
    if (!roomId || !rooms[roomId]) return;
    
    const room = rooms[roomId];
    const player = room.players.find(p => p.id === socket.id);
    
    if (player) {
      player.ready = true;
      
      // إذا كان جميع اللاعبين جاهزين، ابدأ اللعبة
      const allReady = room.players.length === 2 && room.players.every(p => p.ready);
      if (allReady) {
        room.status = 'playing';
        
        // إنشاء حالة اللعبة الأولية وإرسالها
        const initialGameState = createInitialGameState();
        room.gameState = initialGameState;
        
        io.to(roomId).emit('gameStart', { gameState: initialGameState });
      }
      
      io.to(roomId).emit('playerStatusUpdate', { room });
    }
  });
  
  // استقبال حركة من لاعب
  socket.on('move', ({ fromRow, fromCol, toRow, toCol }) => {
    const roomId = players[socket.id];
    if (!roomId || !rooms[roomId]) return;
    
    const room = rooms[roomId];
    
    // التحقق من أن اللعبة جارية وأن هذا دور اللاعب
    if (room.status !== 'playing') return;
    
    const currentPlayer = room.players.find(p => p.id === socket.id);
    if (!currentPlayer || currentPlayer.color !== room.gameState.currentPlayer) {
      socket.emit('error', { message: 'ليس دورك' });
      return;
    }
    
    // تحديث حالة اللعبة وإرسالها للاعبين
    // (هنا ستضيف منطق اللعبة للتحقق من صحة الحركة وتنفيذها)
    const updatedGameState = processMove(room.gameState, fromRow, fromCol, toRow, toCol);
    room.gameState = updatedGameState;
    
    io.to(roomId).emit('gameStateUpdate', { gameState: updatedGameState });
    
    // التحقق من انتهاء اللعبة
    if (checkGameOver(updatedGameState)) {
      room.status = 'finished';
      io.to(roomId).emit('gameOver', { 
        winner: updatedGameState.currentPlayer === 1 ? 2 : 1,
        gameState: updatedGameState
      });
    }
  });
  
  // مغادرة الغرفة
  socket.on('leaveRoom', () => {
    leaveRoom(socket);
  });
  
  // قطع الاتصال
  socket.on('disconnect', () => {
    console.log(`لاعب غادر: ${socket.id}`);
    leaveRoom(socket);
  });
});

// مساعدة - مغادرة الغرفة
function leaveRoom(socket) {
  const roomId = players[socket.id];
  if (!roomId || !rooms[roomId]) return;
  
  const room = rooms[roomId];
  
  // إزالة اللاعب من الغرفة
  const playerIndex = room.players.findIndex(p => p.id === socket.id);
  if (playerIndex !== -1) {
    room.players.splice(playerIndex, 1);
  }
  
  // إذا لم يعد هناك لاعبين، احذف الغرفة
  if (room.players.length === 0) {
    delete rooms[roomId];
  } else {
    // أو أعلم اللاعبين المتبقين
    io.to(roomId).emit('playerLeft', { room });
  }
  
  // إلغاء ربط اللاعب بالغرفة
  delete players[socket.id];
  
  // مغادرة الغرفة
  socket.leave(roomId);
  
  // تحديث قائمة الغرف
  io.emit('roomsList', getRoomsList());
}

// إنشاء معرف فريد للغرفة
function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}

// الحصول على قائمة الغرف المتاحة
function getRoomsList() {
  return Object.values(rooms)
    .filter(room => room.status === 'waiting' && room.players.length < 2)
    .map(room => ({
      id: room.id,
      name: room.name,
      players: room.players.length
    }));
}

// إنشاء حالة اللعبة الأولية
function createInitialGameState() {
  // إنشاء لوحة اللعبة الأولية
  const board = Array(8).fill().map(() => Array(8).fill(0));
  
  // وضع القطع الأولية (يمكنك تعديل هذا ليناسب قواعد لعبتك)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = 1; // قطع اللاعب الأول
      }
    }
  }
  
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = 2; // قطع اللاعب الثاني
      }
    }
  }
  
  return {
    board,
    currentPlayer: 1,
    player1PiecesCount: 12,
    player2PiecesCount: 12,
    gameOver: false
  };
}

// معالجة حركة اللاعب - هذه نسخة مبسطة، يمكنك استخدام منطق اللعبة الفعلي من game.js
function processMove(gameState, fromRow, fromCol, toRow, toCol) {
  const newGameState = JSON.parse(JSON.stringify(gameState));
  const board = newGameState.board;
  
  // تحريك القطعة
  const piece = board[fromRow][fromCol];
  board[fromRow][fromCol] = 0;
  board[toRow][toCol] = piece;
  
  // تبديل دور اللاعب
  newGameState.currentPlayer = newGameState.currentPlayer === 1 ? 2 : 1;
  
  // هنا يمكنك إضافة منطق أكثر تعقيدًا مثل التقاط قطع الخصم
  // وترقية القطع العادية إلى ملوك
  
  return newGameState;
}

// التحقق من انتهاء اللعبة
function checkGameOver(gameState) {
  // نسخة مبسطة للتحقق من انتهاء اللعبة
  return gameState.player1PiecesCount === 0 || gameState.player2PiecesCount === 0;
}

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('حدث خطأ في الخادم!');
});

// تشغيل الخادم
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
}); 
