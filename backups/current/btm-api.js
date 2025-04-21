// تحميل متغيرات البيئة
require('dotenv').config();

import axios from 'axios';

// استخدام المتغيرات البيئية بدلاً من القيم المباشرة
const API_BASE_URL = process.env.RENDER_API_URL || 'https://api.example.com'; // قيمة آمنة افتراضية
const API_KEY = process.env.RENDER_API_KEY || 'default-key'; // قيمة آمنة افتراضية

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