/**
 * أداة للتحقق من اتصال شبكة Monad Testnet وعرض معلومات عنها
 */

import { ethers } from 'ethers';

// معلومات شبكة Monad Testnet
const MONAD_CHAIN_ID = 10143;
const MONAD_CHAIN_ID_HEX = '0x' + MONAD_CHAIN_ID.toString(16);
const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
const MONAD_EXPLORER_URL = 'https://testnet.monadexplorer.com/';

/**
 * التحقق من حالة اتصال شبكة Monad
 * @returns {Promise<Object>} حالة الاتصال ومعلومات الشبكة
 */
export async function checkMonadConnection() {
    // التحقق مما إذا كانت MetaMask متاحة
    if (!window.ethereum) {
        return {
            connected: false,
            status: 'no-wallet',
            message: 'لم يتم العثور على محفظة. يرجى تثبيت MetaMask أو محفظة متوافقة مع EVM.'
        };
    }

    try {
        // الحصول على Provider من MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // الحصول على معرف الشبكة الحالية
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);
        
        // التحقق مما إذا كان المستخدم متصلاً بشبكة Monad
        const isConnectedToMonad = currentChainId === MONAD_CHAIN_ID;
        
        // الحصول على معلومات الشبكة الإضافية إذا كان متصلاً بـ Monad
        let blockNumber = null;
        let gasPrice = null;
        
        if (isConnectedToMonad) {
            blockNumber = await provider.getBlockNumber();
            gasPrice = await provider.getFeeData();
        }
        
        return {
            connected: isConnectedToMonad,
            status: isConnectedToMonad ? 'connected' : 'wrong-network',
            chainId: currentChainId,
            expectedChainId: MONAD_CHAIN_ID,
            blockNumber,
            gasPrice: gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : null,
            message: isConnectedToMonad 
                ? 'متصل بشبكة Monad Testnet'
                : 'غير متصل بشبكة Monad Testnet. يرجى تبديل الشبكة.'
        };
    } catch (error) {
        console.error('خطأ في التحقق من اتصال Monad:', error);
        return {
            connected: false,
            status: 'error',
            message: `خطأ في التحقق من الاتصال: ${error.message}`
        };
    }
}

/**
 * التبديل إلى شبكة Monad Testnet
 * @returns {Promise<Object>} نتيجة محاولة التبديل
 */
export async function switchToMonadNetwork() {
    if (!window.ethereum) {
        return {
            success: false,
            message: 'لم يتم العثور على محفظة'
        };
    }

    try {
        // محاولة التبديل إلى شبكة Monad
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_CHAIN_ID_HEX }]
        });
        
        return {
            success: true,
            message: 'تم التبديل إلى شبكة Monad Testnet بنجاح'
        };
    } catch (switchError) {
        console.error('خطأ في التبديل:', switchError);
        
        // إذا كان الخطأ هو أن الشبكة غير معروفة، حاول إضافتها
        if (switchError.code === 4902 || switchError.message.includes('Unrecognized chain ID')) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: MONAD_CHAIN_ID_HEX,
                        chainName: 'Monad Testnet',
                        nativeCurrency: {
                            name: 'MON',
                            symbol: 'MON',
                            decimals: 18
                        },
                        rpcUrls: [MONAD_RPC_URL],
                        blockExplorerUrls: [MONAD_EXPLORER_URL]
                    }]
                });
                
                return {
                    success: true,
                    message: 'تمت إضافة شبكة Monad Testnet. يرجى محاولة الاتصال مرة أخرى.'
                };
            } catch (addError) {
                return {
                    success: false,
                    message: `فشل في إضافة شبكة Monad: ${addError.message}`
                };
            }
        }
        
        return {
            success: false,
            message: `فشل في التبديل إلى شبكة Monad: ${switchError.message}`
        };
    }
}

/**
 * عرض معلومات شبكة Monad في واجهة المستخدم
 * @param {HTMLElement} containerElement العنصر الذي سيحتوي على المعلومات
 */
export async function displayMonadInfo(containerElement) {
    if (!containerElement) return;
    
    const connectionInfo = await checkMonadConnection();
    
    containerElement.innerHTML = `
        <div class="${connectionInfo.connected ? 'network-connected' : 'network-disconnected'}">
            <div class="network-status">
                <div class="status-indicator ${connectionInfo.connected ? 'connected' : 'disconnected'}"></div>
                <div class="network-name">Monad Testnet</div>
                <div class="testnet-badge">Testnet</div>
            </div>
            
            ${connectionInfo.connected ? `
                <div class="network-details">
                    <div class="detail-item">
                        <span class="detail-label">رقم الكتلة الحالية:</span>
                        <span class="detail-value">${connectionInfo.blockNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">سعر الغاز:</span>
                        <span class="detail-value">${connectionInfo.gasPrice} Gwei</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">معرف الشبكة:</span>
                        <span class="detail-value">${connectionInfo.chainId}</span>
                    </div>
                </div>
            ` : `
                <div class="network-error">
                    ${connectionInfo.message}
                    <button class="switch-network-btn">التبديل إلى Monad</button>
                </div>
            `}
        </div>
    `;
    
    // إضافة مستمع حدث للزر إذا كان موجوداً
    const switchButton = containerElement.querySelector('.switch-network-btn');
    if (switchButton) {
        switchButton.addEventListener('click', async () => {
            const result = await switchToMonadNetwork();
            alert(result.message);
            
            if (result.success) {
                // تحديث المعلومات بعد التبديل
                setTimeout(() => displayMonadInfo(containerElement), 1000);
            }
        });
    }
}

export default {
    checkMonadConnection,
    switchToMonadNetwork,
    displayMonadInfo,
    MONAD_CHAIN_ID,
    MONAD_RPC_URL,
    MONAD_EXPLORER_URL
}; 