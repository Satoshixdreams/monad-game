const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running');
  });
  
// Test database connection
async function testConnection() {
  try {
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection error:', error);
    }
}

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Server is listening at http://localhost:${PORT}`);
  await testConnection();
});

module.exports = server; 