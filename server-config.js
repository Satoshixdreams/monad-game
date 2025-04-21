// تكوين الخادم
module.exports = {
  // تكوين المنفذ
  port: process.env.PORT || 3002,
  
  // تكوين CORS
  corsOptions: {
    origin: ["https://bitmon.site", "https://www.bitmon.site", "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  
  // مسارات الملفات الثابتة
  staticPath: 'dist',
  
  // عنوان API
  apiEndpoint: '/api',
  
  // عنوان Socket.io
  socketEndpoint: '/socket.io',
  
  // الوثوق بالخادم وراء الـ proxy
  trustProxy: true
}; 