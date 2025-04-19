import { ethers } from 'ethers';
import tokenAbi from './token-abi.js';

const BTM_CONTRACT_ADDRESS = '0x59d6d0ADB836Ed25a3E7921ded05BF1997E82b8d';
const MONAD_CHAIN_ID = 10143;
const MONAD_CHAIN_ID_HEX = '0x' + MONAD_CHAIN_ID.toString(16);
const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
const API_URL = 'https://noone-3kkj.onrender.com';

let provider = null;
let btmContract = null;

async function initializeBTMContract() {
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask not found');
        }

        provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainIdNumber = Number(network.chainId);
        
        console.log('Current network chainId:', chainIdNumber);
        console.log('Expected Monad chainId:', MONAD_CHAIN_ID);
        
        if (chainIdNumber !== MONAD_CHAIN_ID) {
            // Try to switch to Monad network
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: MONAD_CHAIN_ID_HEX }]
                });
                
                // Refresh provider after network switch
                provider = new ethers.BrowserProvider(window.ethereum);
            } catch (error) {
                console.error('Failed to switch to Monad network:', error);
                alert('يرجى التبديل إلى شبكة Monad Testnet أولاً');
                throw new Error('Please connect to Monad network first');
            }
        }

        const signer = await provider.getSigner();
        btmContract = new ethers.Contract(BTM_CONTRACT_ADDRESS, tokenAbi, signer);
        console.log('BTM contract initialized successfully');
        return btmContract;
    } catch (error) {
        console.error('Error initializing BTM contract:', error);
        return null;
    }
}

async function updateBTMBalance() {
    try {
        if (!btmContract) return "0.0";
        
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await btmContract.balanceOf(address);
        const formattedBalance = ethers.formatUnits(balance, 18);
        
        return formattedBalance;
    } catch (error) {
        console.error('Error updating BTM balance:', error);
        return "0.0";
    }
}

async function rewardPlayer(amount) {
    try {
        if (!btmContract) {
            await initializeBTMContract();
        }
        
        // Get the user's address
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        console.log(`Requesting reward of ${amount} BTM tokens for ${address} from server`);
        
        // Call the API to send the reward from the server wallet
        try {
            const response = await fetch(`${API_URL}/reward`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: address,
                    amount: amount
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Wait a moment for the blockchain to update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Get the updated balance
                const newBalance = await updateBTMBalance();
                
                return { 
                    success: true, 
                    balance: newBalance,
                    message: `تم إرسال ${amount} BTM كمكافأة!`
                };
            } else {
                return {
                    success: false,
                    balance: await updateBTMBalance(),
                    message: result.message || 'فشل إرسال المكافأة من الخادم'
                };
            }
        } catch (apiError) {
            console.error('API error:', apiError);
            
            // Fall back to simulation mode if the API call fails
            console.log('Falling back to simulation mode');
            const currentBalance = await updateBTMBalance();
            const simulatedBalance = parseFloat(currentBalance) + parseFloat(amount);
            
            return { 
                success: true, 
                balance: simulatedBalance.toString(),
                message: `تم منح ${amount} BTM كمكافأة (محاكاة - الخادم غير متاح)`
            };
        }
    } catch (error) {
        console.error('Error rewarding player:', error);
        return { 
            success: false, 
            balance: await updateBTMBalance(),
            message: 'فشل إرسال المكافأة: رصيد أو صلاحيات غير كافية'
        };
    }
}

export { initializeBTMContract, updateBTMBalance, rewardPlayer };