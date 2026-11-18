const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const blockchain = require('./blockchain');

class SmartContractService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.isEVMConnected = false;
        this.rpcUrl = null;

        this.initEVM();
    }

    // ---------------------------------------------------------------
    // Initialisation
    // ---------------------------------------------------------------

    /**
     * Connect to the local Hardhat EVM node and load the deployed contract.
     * Falls back gracefully to JS-ledger simulation if the node is not running.
     */
    initEVM() {
        try {
            const contractInfoPath = path.join(__dirname, 'contractInfo.json');
            if (!fs.existsSync(contractInfoPath)) {
                console.warn('⚠️  contractInfo.json not found.');
                console.warn('   Run:  cd land_registry/hardhat && npm run node  (in a separate terminal)');
                console.warn('   Then: cd land_registry/hardhat && npm run deploy');
                return;
            }

            const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));
            const rpcUrl = contractInfo.rpcUrl || 'http://127.0.0.1:8545';
            this.rpcUrl = rpcUrl;

            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            // Use env variable; fall back to Hardhat Account #0 (dev-only default key)
            const privateKey = process.env.HARDHAT_PRIVATE_KEY
                || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

            this.signer = new ethers.Wallet(privateKey, this.provider);
            this.contract = new ethers.Contract(contractInfo.address, contractInfo.abi, this.signer);
            this.isEVMConnected = true;

            console.log(`✅ SmartContractService connected → EVM at ${contractInfo.address} (${rpcUrl})`);
        } catch (error) {
            console.error('❌ SmartContractService init failed:', error.message);
            this.isEVMConnected = false;
        }
    }

    /**
     * Ping the EVM node. Re-initialises if the connection was lost.
     * Returns true if EVM is reachable, false otherwise.
     */
    async checkEVMAlive() {
        if (!this.isEVMConnected || !this.provider) {
            this.initEVM();
        }
        try {
            await this.provider.getBlockNumber();
            return true;
        } catch {
            console.warn('⚠️  EVM node unreachable – falling back to JS-ledger simulation.');
            this.isEVMConnected = false;
            return false;
        }
    }

    // ---------------------------------------------------------------
    // Write helpers
    // ---------------------------------------------------------------

    /**
     * Register a new land parcel on the EVM smart contract, then mirror the
     * event in the local JS blockchain ledger.
     */
    async registerLand(landId, location, area, price, ownerId, documentCid = '', photoCid = '') {
        console.log(`\n--- [EVM] registerLand() ---`);
        console.log(`  LandID   : ${landId}`);
        console.log(`  Location : ${location}`);
        console.log(`  Price    : ${price}  Area: ${area}`);
        console.log(`  Owner    : ${ownerId}`);

        const evmAlive = await this.checkEVMAlive();

        let txHash = 'SIMULATED_TX_' + Date.now();
        let blockNumber = 0;
        let gasUsed = '124050';

        if (evmAlive && this.contract) {
            try {
                const tx = await this.contract.registerLand(
                    landId,
                    location,
                    Math.round(Number(area)),
                    Math.round(Number(price)),
                    ownerId,
                    documentCid || '',
                    photoCid || ''
                );

                const receipt = await tx.wait();
                txHash = receipt.hash;
                blockNumber = receipt.blockNumber;
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : '124050';

                console.log(`✅ [EVM Block #${blockNumber}] LandRegistered  TxHash: ${txHash}  Gas: ${gasUsed}`);
            } catch (evmError) {
                // Surface the actual revert reason from the smart contract
                const reason = evmError?.reason || evmError?.shortMessage || evmError?.message || 'Unknown EVM error';
                console.error(`❌ EVM registerLand reverted: ${reason}`);
                throw new Error(`Smart contract rejected registration: ${reason}`);
            }
        } else {
            console.warn('⚠️  EVM unavailable – using JS-ledger simulation only.');
        }

        // Mirror in local JS blockchain ledger (dual-layer protection)
        await blockchain.registerLandOnChain(landId, location, area, price, ownerId, txHash);

        console.log(`--- [EVM] registerLand() done ---\n`);
        return { txHash, blockNumber, gasUsed };
    }

    /**
     * Transfer ownership of a land parcel on the EVM smart contract, then
     * mirror the event in the local JS blockchain ledger.
     */
    async transferOwnership(landId, currentOwnerId, newOwnerId, price, location) {
        console.log(`\n--- [EVM] transferOwnership() ---`);
        console.log(`  LandID : ${landId}`);
        console.log(`  From   : ${currentOwnerId}  →  To: ${newOwnerId}`);
        console.log(`  Price  : ${price}`);

        const evmAlive = await this.checkEVMAlive();

        let txHash = 'SIMULATED_TX_' + Date.now();
        let blockNumber = 0;
        let gasUsed = '84000';

        if (evmAlive && this.contract) {
            try {
                const tx = await this.contract.transferOwnership(
                    landId,
                    currentOwnerId,
                    newOwnerId,
                    Math.round(Number(price)),
                    location || 'Unknown'
                );

                const receipt = await tx.wait();
                txHash = receipt.hash;
                blockNumber = receipt.blockNumber;
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : '84000';

                console.log(`✅ [EVM Block #${blockNumber}] OwnershipTransferred  TxHash: ${txHash}  Gas: ${gasUsed}`);
            } catch (evmError) {
                const reason = evmError?.reason || evmError?.shortMessage || evmError?.message || 'Unknown EVM error';
                console.error(`❌ EVM transferOwnership reverted: ${reason}`);
                throw new Error(`Smart contract rejected transfer: ${reason}`);
            }
        } else {
            console.warn('⚠️  EVM unavailable – using JS-ledger simulation only.');
        }

        // Mirror in local JS blockchain ledger
        await blockchain.transferLandOnChain(landId, currentOwnerId, newOwnerId, price, location, txHash);

        console.log(`--- [EVM] transferOwnership() done ---\n`);
        return { txHash, blockNumber, gasUsed, newOwner: newOwnerId };
    }

    // ---------------------------------------------------------------
    // Read helpers
    // ---------------------------------------------------------------

    /**
     * Query a land record directly from the EVM smart contract state.
     * Returns null if EVM is not available or land is not registered.
     */
    async getLandFromEVM(landId) {
        const evmAlive = await this.checkEVMAlive();
        if (!evmAlive || !this.contract) return null;

        try {
            // Returns: (id, location, area, price, ownerId, isRegistered, registeredAt, lastUpdatedAt)
            const result = await this.contract.getLand(landId);
            if (!result[5]) return null; // isRegistered === false

            return {
                id:            result[0],
                location:      result[1],
                area:          Number(result[2]),
                price:         Number(result[3]),
                ownerId:       result[4],
                isRegistered:  result[5],
                registeredAt:  Number(result[6]),
                lastUpdatedAt: Number(result[7]),
                isEVMVerified: true
            };
        } catch (err) {
            console.error('⚠️  getLandFromEVM failed:', err.message);
            return null;
        }
    }

    /**
     * Check whether a land ID is registered on the EVM contract.
     * Returns false if EVM is unavailable.
     */
    async isRegisteredOnEVM(landId) {
        const evmAlive = await this.checkEVMAlive();
        if (!evmAlive || !this.contract) return false;
        try {
            return await this.contract.isLandRegistered(landId);
        } catch {
            return false;
        }
    }

    /**
     * Get the EVM connection status (for health-check endpoints).
     */
    async getStatus() {
        const alive = await this.checkEVMAlive();
        let chainId = null;
        let currentBlock = null;

        if (alive) {
            const [network, blockNumber] = await Promise.all([
                this.provider.getNetwork(),
                this.provider.getBlockNumber()
            ]);
            chainId = network.chainId.toString();
            currentBlock = blockNumber;
        }

        return {
            evmConnected: alive,
            rpcUrl: this.rpcUrl,
            chainId,
            currentBlock,
            contractAddress: this.contract ? await this.contract.getAddress() : null
        };
    }

    // ---------------------------------------------------------------
    // History
    // ---------------------------------------------------------------

    async getHistory(userId) {
        return await blockchain.getUserEvents([], userId);
    }
}

module.exports = new SmartContractService();
