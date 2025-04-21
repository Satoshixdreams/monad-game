import { ethers } from 'ethers';
import { initializeBTMContract, updateBTMBalance } from './btm-contract.js';

let provider = null;
let signer = null;
let connectedAddress = null;
let btmBalanceValue = '';

const MONAD_CHAIN_ID = 10143;
const MONAD_CHAIN_ID_HEX = '0x' + MONAD_CHAIN_ID.toString(16);

const MONAD_PARAMS = {
    chainId: MONAD_CHAIN_ID_HEX,
    chainName: 'Monad Testnet',
    nativeCurrency: {
        name: 'MON',
        symbol: 'MON',
        decimals: 18
    },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet.monadexplorer.com/']
};

async function ensureMonadNetwork() {
    if (!window.ethereum) {
        throw new Error('MetaMask not found');
    }

    try {
        // Request to switch to Monad network
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_CHAIN_ID_HEX }]
        });
        console.log('Successfully switched to Monad network');
    } catch (switchError) {
        console.error('Switch error:', switchError);
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902 || switchError.message.includes('Unrecognized chain ID')) {
            try {
                console.log('Attempting to add Monad network');
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [MONAD_PARAMS]
                });
                
                // Retry switching after adding
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: MONAD_CHAIN_ID_HEX }]
                });
                
                console.log('Added and switched to Monad network');
            } catch (addError) {
                console.error('Failed to add network:', addError);
                alert('فشل في إضافة شبكة Monad. يرجى الموافقة على إضافة الشبكة في المحفظة.');
                throw new Error('فشل في إضافة شبكة Monad');
            }
        } else {
            console.error('Failed to switch network:', switchError);
            alert('فشل في التبديل إلى شبكة Monad. يرجى الموافقة على تبديل الشبكة في المحفظة.');
            throw new Error('فشل في التبديل إلى شبكة Monad');
        }
    }
}

async function connectWallet() {
    try {
        if (!window.ethereum) {
            alert('يرجى تثبيت MetaMask');
            return { success: false, address: null, balance: null };
        }

        // Reset state
        provider = null;
        signer = null;
        connectedAddress = null;

        // Request accounts first
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('لم يتم العثور على حسابات');
        }

        // Then ensure we're on the correct network
        await ensureMonadNetwork();

        // Verify that we are indeed on the right network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== MONAD_CHAIN_ID_HEX) {
            throw new Error('لم يتم التبديل إلى شبكة Monad. يرجى المحاولة مرة أخرى.');
        }

        // Initialize provider and signer
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        connectedAddress = accounts[0];
        
        // Setup event listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // Initialize BTM contract
        const contract = await initializeBTMContract();
        if (!contract) {
            throw new Error('فشل في تهيئة عقد BTM');
        }
        
        // Get BTM balance with retry
        let balance = "0.0";
        try {
            balance = await updateBTMBalance();
            console.log('BTM Balance:', balance);
        } catch (balanceError) {
            console.error('Error getting BTM balance:', balanceError);
            // Retry once
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                balance = await updateBTMBalance();
            } catch (retryError) {
                console.error('Retry failed:', retryError);
            }
        }
        btmBalanceValue = balance;
        
        console.log('Wallet successfully connected to Monad network');
        
        return { 
            success: true, 
            address: connectedAddress,
            balance: btmBalanceValue
        };
    } catch (error) {
        console.error('خطأ في اتصال المحفظة:', error);
        alert('خطأ في اتصال المحفظة: ' + error.message);
        disconnectWallet();
        return { success: false, address: null, balance: null };
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        connectedAddress = accounts[0];
        updateBTMBalance().then(balance => {
            btmBalanceValue = balance;
        });
    }
}

function handleChainChanged() {
    window.location.reload();
}

function disconnectWallet() {
    if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
    
    provider = null;
    signer = null;
    connectedAddress = null;
    btmBalanceValue = '';
    
    return { success: true, address: null, balance: null };
}

function getWalletInfo() {
    return {
        connected: !!connectedAddress,
        address: connectedAddress,
        balance: btmBalanceValue
    };
}

export { connectWallet, disconnectWallet, getWalletInfo, provider, signer, connectedAddress };