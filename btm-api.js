import axios from 'axios';

const API_BASE_URL = 'https://api.render.com/deploy/srv-cvorjph5pdvs73a3ula0';
const API_KEY = '0-AM3oqCsAE';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

async function fetchBTMBalance(address) {
  try {
    const response = await axios.get(`${API_BASE_URL}/balance/${address}`, { headers });
    return response.data.balance;
  } catch (error) {
    console.error('خطأ في جلب الرصيد من API:', error);
    return null;
  }
}

async function sendBTMReward(address, amount) {
  try {
    const response = await axios.post(`${API_BASE_URL}/reward`, {
      address,
      amount
    }, { headers });
    return response.data.success;
  } catch (error) {
    console.error('خطأ في إرسال المكافأة:', error);
    return false;
  }
}

async function verifyBTMTransaction(txHash) {
  try {
    const response = await axios.get(`${API_BASE_URL}/verify/${txHash}`, { headers });
    return response.data.verified;
  } catch (error) {
    console.error('خطأ في التحقق من المعاملة:', error);
    return false;
  }
}

export { fetchBTMBalance, sendBTMReward, verifyBTMTransaction };