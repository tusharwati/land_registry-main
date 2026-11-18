const crypto = require('crypto');
const pool = require('./db');

class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return crypto.createHash('sha256').update(
            this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)
        ).digest('hex');
    }
}

class Blockchain {
    constructor() {
        this.chain = [];
    }

    async initialize() {
        const [rows] = await pool.query('SELECT * FROM blocks ORDER BY idx ASC');
        if (rows.length === 0) {
            const genesisBlock = this.createGenesisBlock();
            this.chain.push(genesisBlock);
            await this.saveBlock(genesisBlock);
        } else {
            this.chain = rows.map(row => new Block(row.idx, row.timestamp, row.data, row.previousHash));
        }
    }

    async saveBlock(block) {
        await pool.query(
            'INSERT INTO blocks (idx, timestamp, data, previousHash, hash) VALUES (?, ?, ?, ?, ?)',
            [block.index, block.timestamp, JSON.stringify(block.data), block.previousHash, block.hash]
        );
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), "Genesis Block", "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    async addBlock(data) {
        const previousBlock = this.getLatestBlock();
        const newBlock = new Block(
            previousBlock.index + 1,
            Date.now(),
            data,
            previousBlock.hash
        );
        this.chain.push(newBlock);
        await this.saveBlock(newBlock);
        return newBlock;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    // --- EVM & Local Ledger Integration Methods ---

    async registerLandOnChain(landId, location, area, price, ownerId, evmTxHash = null) {
        const data = {
            type: 'Registration',
            landId: landId,
            location: location,
            area: area,
            price: price,
            ownerId: ownerId,
            evmTxHash: evmTxHash,
            timestamp: Date.now()
        };
        const block = await this.addBlock(data);
        console.log(`[Ledger] Land registered: Block #${block.index} Hash: ${block.hash} EVM Tx: ${evmTxHash || 'N/A'}`);
        return block.hash;
    }

    async transferLandOnChain(landId, fromId, toId, price, location, evmTxHash = null) {
        const data = {
            type: 'Transfer',
            landId: landId,
            from: fromId,
            to: toId,
            price: price,
            location: location,
            evmTxHash: evmTxHash,
            timestamp: Date.now()
        };
        const block = await this.addBlock(data);
        console.log(`[Ledger] Land transferred: Block #${block.index} Hash: ${block.hash} EVM Tx: ${evmTxHash || 'N/A'}`);
        return { txHash: block.hash, evmTxHash, newOwner: toId };
    }

    async getBlockchainData() {
        return this.chain.map(block => ({
            number: block.index,
            hash: block.hash,
            timestamp: new Date(block.timestamp).toLocaleString(),
            transactions: block.index === 0 ? [] : [{
                hash: block.data?.evmTxHash || block.hash,
                from: 'System',
                to: 'System',
                value: '0',
                timestamp: new Date(block.timestamp).toLocaleString(),
                details: block.data
            }]
        })).reverse();
    }

    async getUserEvents(landIds, userId) {
        const events = [];
        for (const block of this.chain) {
            if (block.index === 0) continue;

            const data = block.data;
            if (data && (landIds.length === 0 || landIds.includes(data.landId))) {
                if (userId) {
                    const isRegistration = data.type === 'Registration' && data.ownerId === userId;
                    const isTransfer = data.type === 'Transfer' && (data.from === userId || data.to === userId);
                    if (!isRegistration && !isTransfer) continue;
                }

                events.push({
                    type: data.type,
                    landIdHash: data.landId,
                    blockNumber: block.index,
                    transactionHash: data.evmTxHash || block.hash,
                    timestamp: new Date(block.timestamp).toLocaleString(),
                    details: data.type === 'Registration' ? {
                        location: data.location,
                        area: data.area,
                        price: data.price,
                        ownerId: data.ownerId
                    } : {
                        oldOwner: data.from || 'Unknown',
                        newOwner: data.to || data.newOwner,
                        price: data.price || '0',
                        location: data.location || 'Unknown'
                    }
                });
            }
        }
        return events.sort((a, b) => b.blockNumber - a.blockNumber);
    }

    async getLandStateFromChain(landId) {
        const smartContractService = require('./smartContractService');

        // 1. Try querying real EVM Smart Contract state directly via the improved helper
        try {
            const evmState = await smartContractService.getLandFromEVM(landId);
            if (evmState) {
                return {
                    ownerId: evmState.ownerId,
                    price: Number(evmState.price),
                    location: evmState.location,
                    area: Number(evmState.area),
                    isEVMVerified: true
                };
            }
        } catch (err) {
            console.warn('[Blockchain] EVM getLand failed, falling back to JS ledger:', err.message);
        }

        // 2. Fallback: replay the local JS-ledger blocks to reconstruct state
        let expectedState = null;
        for (const block of this.chain) {
            const data = block.data;
            if (!data) continue;

            if (data.type === 'Registration' && data.landId === landId) {
                expectedState = {
                    ownerId: data.ownerId,
                    price: Number(data.price),
                    isEVMVerified: false
                };
            } else if (data.type === 'Transfer' && data.landId === landId) {
                if (expectedState) {
                    expectedState.ownerId = data.to;
                    expectedState.price = Number(data.price);
                }
            }
        }
        return expectedState;
    }

    async verifyLandIntegrity(landId, currentDbRecord) {
        const expectedState = await this.getLandStateFromChain(landId);

        if (!expectedState) {
            // Land ID does not exist on EVM Blockchain or local chain ledger!
            return {
                landId,
                isTampered: true,
                discrepancies: [
                    {
                        field: 'landId',
                        dbValue: landId,
                        chainValue: 'Unregistered / Fake Land (No EVM Smart Contract record)'
                    }
                ]
            };
        }

        const discrepancies = [];

        // Compare Owner
        if (currentDbRecord.ownerId !== expectedState.ownerId) {
            discrepancies.push({
                field: 'ownerId',
                dbValue: currentDbRecord.ownerId,
                chainValue: expectedState.ownerId
            });
        }

        // Compare Price
        if (Number(currentDbRecord.price) !== Number(expectedState.price)) {
            discrepancies.push({
                field: 'price',
                dbValue: Number(currentDbRecord.price),
                chainValue: Number(expectedState.price)
            });
        }

        if (discrepancies.length > 0) {
            return {
                landId,
                isTampered: true,
                discrepancies
            };
        }

        return { landId, isTampered: false };
    }

    getLandsOwnedBy(userId) {
        const ownership = {};

        for (const block of this.chain) {
            const data = block.data;
            if (!data) continue;

            if (data.type === 'Registration') {
                ownership[data.landId] = data.ownerId;
            } else if (data.type === 'Transfer') {
                ownership[data.landId] = data.to;
            }
        }

        return Object.keys(ownership).filter(landId => ownership[landId] === userId);
    }
}

const blockchain = new Blockchain();

module.exports = blockchain;
