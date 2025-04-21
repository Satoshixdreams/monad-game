require('dotenv').config();
const express = require('express');
const Web3 = require('web3');
const cors = require('cors'); // Import CORS
const app = express();
const contractUtils = require('./utils/contract');

// نقل هذين السطرين إلى هنا (قبل تعريف المسارات)
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// ثم تأتي المسارات بعد ذلك
// Reward endpoint - sends BTM tokens to players
app.post('/reward', async (req, res) => {
  console.log('Reward endpoint accessed');
  try {
    const { address, amount } = req.body;
    
    console.log(`Received reward request: Address=${address}, Amount=${amount}`);
    
    // تحقق من وجود العنوان والمبلغ
    if (!address || !amount) {
      console.log('Missing required parameters');
      return res.status(400).json({ 
        success: false, 
        message: 'يجب تحديد العنوان والمبلغ' 
      });
    }
    
    // تحقق من صحة العنوان
    if (!contractUtils.web3.utils.isAddress(address)) {
      console.log('Invalid Ethereum address');
      return res.status(400).json({ 
        success: false, 
        message: 'عنوان محفظة غير صالح' 
      });
    }
    
    // تحويل المبلغ إلى wei
    const amountInWei = contractUtils.web3.utils.toWei(amount.toString(), 'ether');
    console.log(`Attempting to transfer ${amount} BTM (${amountInWei} wei) to ${address}`);
    
    // استخدام وظيفة transferTokens من contract utilities
    const transferResult = await contractUtils.transferTokens(
      null, // استخدام المفتاح الخاص من متغيرات البيئة
      address,
      amountInWei
    );
    
    // معالجة نتيجة التحويل
    if (transferResult.success) {
      console.log(`Transfer successful! Transaction hash: ${transferResult.transactionHash}`);
      
      // إرجاع استجابة نجاح
      res.json({ 
        success: true, 
        message: `تم إرسال ${amount} BTM بنجاح`,
        txHash: transferResult.transactionHash 
      });
    } else {
      // إذا فشل التحويل الحقيقي، تحقق إذا كانت المحاكاة مسموحة
      console.error(`Transfer failed: ${transferResult.error}`);
      
      if (process.env.NODE_ENV === 'development' || process.env.ALLOW_SIMULATED_REWARDS === 'true') {
        console.log('Falling back to simulated reward');
        
        // محاكاة نجاح العملية
        res.json({ 
          success: true, 
          message: `تم منح ${amount} BTM كمكافأة (محاكاة)`,
          txHash: '0x' + Math.random().toString(16).substr(2, 64),
          simulated: true
        });
      } else {
        // إرجاع خطأ إذا لم تكن المحاكاة مسموحة
        throw new Error(transferResult.error || 'فشل التحويل لسبب غير معروف');
      }
    }
  } catch (error) {
    // معالجة أي أخطاء أخرى
    console.error('Error processing reward:', error);
    
    res.status(500).json({ 
      success: false, 
      message: `فشل إرسال المكافأة: ${error.message}` 
    });
  }
});

// Test connection to Monad Testnet
async function testConnection() {
  try {
    // Try different methods to test connection
    try {
      // First try getting the block number
      const blockNumber = await contractUtils.web3.eth.getBlockNumber();
      console.log(`Connected to Monad Testnet. Current block: ${blockNumber}`);
      return true;
    } catch (innerError) {
      // If that fails, try a different method
      try {
        const accounts = await contractUtils.web3.eth.getAccounts();
        console.log(`Connected to Monad Testnet. Found ${accounts.length} accounts.`);
        return true;
      } catch (accountError) {
        // If that also fails, try a simple web3 isConnected check
        if (contractUtils.web3.eth.net.isListening()) {
          console.log('Connected to Monad Testnet via isListening check.');
          return true;
        }
        throw new Error('All connection methods failed');
      }
    }
  } catch (error) {
    console.error('Failed to connect to Monad Testnet:', error.message);
    console.log('API will continue running without blockchain connectivity.');
    return false;
  }
}

// API Routes
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.json({ message: 'BTM API is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health endpoint accessed');
  res.json({ status: 'ok' });
});

// Add BTM token info endpoint
app.get('/token-info', async (req, res) => {
  try {
    // Get token info from blockchain
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contractUtils.getTokenName(),
      contractUtils.getTokenSymbol(),
      contractUtils.getTokenDecimals(),
      contractUtils.getTokenTotalSupply()
    ]);
    
    const tokenInfo = {
      name,
      symbol,
      type: "ERC20",
      contractAddress: "0x59d6d0ADB836Ed25a3E7921ded05BF1997E82b8d",
      decimals,
      totalSupply
    };
    res.json(tokenInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add symbol endpoint
app.get('/symbol', async (req, res) => {
  console.log('Symbol endpoint accessed');
  try {
    const symbol = await contractUtils.getTokenSymbol();
    res.json({ symbol });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add totalSupply endpoint
app.get('/totalSupply', async (req, res) => {
  console.log('Total supply endpoint accessed');
  try {
    const totalSupply = await contractUtils.getTokenTotalSupply();
    res.json({ totalSupply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add balance endpoint (with query parameter)
app.get('/balance', async (req, res) => {
  console.log('Balance endpoint accessed');
  try {
    // Get address from query parameter
    const address = req.query.address;
    
    if (!address) {
      return res.status(400).json({ error: "Address parameter is required" });
    }
    
    console.log(`Fetching balance for address: ${address}`);
    
    const balance = await contractUtils.getTokenBalance(address);
    const decimals = await contractUtils.getTokenDecimals();
    
    // Format the balance with decimals
    const formattedBalance = contractUtils.web3.utils.fromWei(balance, 'ether');
    
    res.json({ 
      address,
      balance,
      formattedBalance: `${formattedBalance} BTM`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new endpoint that accepts address as a path parameter
app.get('/balance/:address', async (req, res) => {
  console.log('Balance endpoint accessed with path parameter');
  try {
    // Get address from path parameter
    const address = req.params.address;
    
    console.log(`Fetching balance for address: ${address}`);
    
    const balance = await contractUtils.getTokenBalance(address);
    const decimals = await contractUtils.getTokenDecimals();
    
    // Format the balance with decimals
    const formattedBalance = contractUtils.web3.utils.fromWei(balance, 'ether');
    
    res.json({ 
      address,
      balance,
      formattedBalance: `${formattedBalance} BTM`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Make sure these routes are defined BEFORE the catch-all route
// Database mock - in production, use a real database
const playerPointsDB = {};

// Add points endpoint
app.post('/add-points', async (req, res) => {
  console.log('Add points endpoint accessed');
  try {
    const { playerAddress, pointsToAdd } = req.body;
    
    if (!playerAddress || !pointsToAdd) {
      return res.status(400).json({ 
        success: false, 
        error: "Player address and points are required" 
      });
    }
    
    // Validate Ethereum address format
    if (!contractUtils.web3.utils.isAddress(playerAddress)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid Ethereum address format" 
      });
    }
    
    // Validate points
    if (isNaN(pointsToAdd) || pointsToAdd <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Points must be a positive number" 
      });
    }
    
    console.log(`Adding ${pointsToAdd} points for address: ${playerAddress}`);
    
    // Get current points (or initialize to 0)
    const currentPoints = playerPointsDB[playerAddress] || 0;
    
    // Add points
    playerPointsDB[playerAddress] = currentPoints + parseInt(pointsToAdd);
    
    res.json({ 
      success: true, 
      newTotalPoints: playerPointsDB[playerAddress]
    });
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to add points" 
    });
  }
});

// Get points endpoint
app.get('/get-points/:address', async (req, res) => {
  console.log('Get points endpoint accessed');
  try {
    const address = req.params.address;
    
    if (!address) {
      return res.status(400).json({ 
        success: false, 
        error: "Address parameter is required" 
      });
    }
    
    // Validate Ethereum address format
    if (!contractUtils.web3.utils.isAddress(address)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid Ethereum address format" 
      });
    }
    
    console.log(`Fetching points for address: ${address}`);
    
    // Get current points (or return 0)
    const points = playerPointsDB[address] || 0;
    
    res.json({ 
      success: true, 
      points
    });
  } catch (error) {
    console.error('Error getting points:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to get points" 
    });
  }
});

// Claim rewards endpoint
app.post('/claim-rewards', async (req, res) => {
  console.log('Claim rewards endpoint accessed');
  try {
    const { playerAddress } = req.body;
    
    if (!playerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: "Player address is required" 
      });
    }
    
    // Validate Ethereum address format
    if (!contractUtils.web3.utils.isAddress(playerAddress)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid Ethereum address format" 
      });
    }
   
    const currentPoints = playerPointsDB[playerAddress] || 0;
    
    // Check if player has any points
    if (currentPoints <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No points available to claim" 
      });
    }
    
    // Calculate BTM amount (100 points = 1 BTM)
    const conversionRate = 100; // 100 points = 1 BTM
    const btmAmount = currentPoints / conversionRate;
    const btmAmountWei = contractUtils.web3.utils.toWei(btmAmount.toString(), 'ether');
    
    console.log(`Converting ${currentPoints} points to ${btmAmount} BTM for ${playerAddress}`);
    
    // In a real implementation, you would transfer tokens here
    // For demo, just simulate success
    const transferResult = {
      success: true,
      transactionHash: "0x" + Math.random().toString(16).substr(2, 64)
    };
    
    // Reset points after claiming
    playerPointsDB[playerAddress] = 0;
    
    res.json({ 
      success: true, 
      pointsClaimed: currentPoints,
      tokensReceived: btmAmount,
      transactionHash: transferResult.transactionHash
    });
  } catch (error) {
    console.error('Error processing reward claim:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to process reward claim" 
    });
  }
});

// THEN add the catch-all route
app.use((req, res) => {
  console.log(`Attempted to access undefined route: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Server is listening at http://localhost:${PORT}`);
  await testConnection();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
