require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const blockchain = require('./blockchain');
const pool = require('./db');
const ipfsService = require('./ipfsService');
const smartContractService = require('./smartContractService');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({
        service: 'Land Registry API',
        frontend: 'http://localhost:5173',
        evmRpc: 'http://127.0.0.1:8545',
        rpcNote: 'This endpoint is not a JSON-RPC endpoint. Send JSON-RPC requests directly to evmRpc.'
    });
});


app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Initialize Blockchain
// Blockchain initialized in init()

// Helper to generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initialize Database and Blockchain
async function init() {
    try {
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql.split(';').filter(stmt => stmt.trim());

        for (const stmt of statements) {
            if (stmt.trim()) {
                await pool.query(stmt);
            }
        }
        console.log('Database schema initialized.');

        const restoredPhotos = ipfsService.restoreBundledLandPhotos();
        if (restoredPhotos > 0) {
            console.log(`Restored ${restoredPhotos} bundled land photo(s) to the uploads directory.`);
        }

        // Migration: Add phoneNumber if not exists (for existing DBs)
        try {
            await pool.query('ALTER TABLE users ADD COLUMN phoneNumber VARCHAR(20)');
            console.log('Added phoneNumber column to users table.');
        } catch (err) {
            // Ignore if column already exists
            if (err.code !== 'ER_DUP_FIELDNAME') {
                // console.error('Migration error (phoneNumber):', err.message);
            }
        }

        // Migration: Add new columns to lands table
        const newColumns = [
            'surveyNumber VARCHAR(50) UNIQUE',
            'district VARCHAR(100)',
            'state VARCHAR(100)',
            'pinCode VARCHAR(20)',
            'marketValue DECIMAL(15, 2)',
            'documentUrl VARCHAR(255)',
            'photoUrl VARCHAR(255)'
        ];

        for (const col of newColumns) {
            try {
                await pool.query(`ALTER TABLE lands ADD COLUMN ${col}`);
                console.log(`Added column ${col.split(' ')[0]} to lands table.`);
            } catch (err) {
                if (err.code !== 'ER_DUP_FIELDNAME') {
                    // console.error(`Migration error (${col.split(' ')[0]}):`, err.message);
                }
            }
        }

        // Migration: Add sellerId to requests table
        try {
            await pool.query('ALTER TABLE requests ADD COLUMN sellerId VARCHAR(50)');
            console.log('Added sellerId column to requests table.');

            // Backfill sellerId for existing requests (best effort)
            // This is tricky because if ownership transferred, we don't know previous owner easily without history.
            // For PENDING requests, we can use current owner.
            await pool.query(`
                UPDATE requests r 
                JOIN lands l ON r.landId = l.id 
                SET r.sellerId = l.ownerId 
                WHERE r.sellerId IS NULL AND r.status != 'COMPLETED'
            `);
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                // console.error('Migration error (sellerId):', err.message);
            }
        }

        // Initialize blockchain from DB
        // Initialize blockchain from DB
        await blockchain.initialize();
        console.log('Blockchain simulation ready.');

    } catch (err) {
        console.error('Initialization error:', err);
    }
}

init();

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phoneNumber } = req.body;

    try {
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const id = generateId();
        const userType = 'USER'; // Unified role
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query('INSERT INTO users (id, name, email, phoneNumber, password, type) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, email, phoneNumber, hashedPassword, userType]);

        res.json({ id, name, email, type: userType });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = users[0];

        // Compare password with hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        res.json({ id: user.id, name: user.name, email: user.email, type: user.type });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- User Routes ---
app.get('/api/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await pool.query('SELECT id, name, email, phoneNumber, type FROM users WHERE id = ?', [id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phoneNumber, password } = req.body;
    try {
        await pool.query('UPDATE users SET name = ?, email = ?, phoneNumber = ?, password = ? WHERE id = ?',
            [name, email, phoneNumber, password, id]);
        res.json({ id, name, email, phoneNumber, password, type: req.body.type }); // Return updated user object
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- Land Routes ---
app.get('/api/lands', async (req, res) => {
    try {
        const query = `
            SELECT l.*, u.name as ownerName 
            FROM lands l 
            JOIN users u ON l.ownerId = u.id
        `;
        const [lands] = await pool.query(query);
        res.json(lands);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/lands/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT l.*, u.name as ownerName, u.email as ownerEmail, u.phoneNumber as ownerPhone
            FROM lands l 
            JOIN users u ON l.ownerId = u.id
            WHERE l.id = ?
        `;
        const [lands] = await pool.query(query, [id]);
        if (lands.length === 0) return res.status(404).json({ message: 'Land not found' });
        res.json(lands[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/lands/:id/status', async (req, res) => {
    const { id } = req.params;
    const { isForSale } = req.body;
    try {
        await pool.query('UPDATE lands SET isForSale = ? WHERE id = ?', [isForSale, id]);
        res.json({ message: 'Land status updated', id, isForSale });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/my-lands/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT l.*, u.name as ownerName 
            FROM lands l 
            JOIN users u ON l.ownerId = u.id
            WHERE l.ownerId = ?
        `;
        const [myLands] = await pool.query(query, [userId]);
        res.json(myLands);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/lands', upload.fields([{ name: 'document', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), async (req, res) => {
    const { location, area, price, ownerId, surveyNumber, district, state, pinCode, marketValue } = req.body;

    // IPFS Integration: processed by ipfsService
    let documentUrl = null;
    let photoUrl = null;
    let documentCid = null;
    let photoCid = null;

    try {
        if (req.files['document']) {
            const result = await ipfsService.uploadFile(req.files['document'][0]);
            documentUrl = result.url;
            documentCid = result.cid;
        }
        if (req.files['photo']) {
            const result = await ipfsService.uploadFile(req.files['photo'][0]);
            photoUrl = result.url;
            photoCid = result.cid;
        }

        // Fraud Detection: Check if document already exists
        if (documentUrl) {
            const [existingDoc] = await pool.query('SELECT id FROM lands WHERE documentUrl = ?', [documentUrl]);
            if (existingDoc.length > 0) {
                return res.status(400).json({ message: 'Fraud Detection: This document has already been used for another land registration.' });
            }
        }

        const id = generateId();
        await pool.query(
            'INSERT INTO lands (id, location, area, price, ownerId, isForSale, surveyNumber, district, state, pinCode, marketValue, documentUrl, photoUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, location, area, price, ownerId, true, surveyNumber, district, state, pinCode, marketValue, documentUrl, photoUrl]
        );

        // Record in blockchain via Smart Contract Service
        try {
            await smartContractService.registerLand(id, location, area, price, ownerId, documentCid, photoCid);
        } catch (bcError) {
            console.error("Smart Contract execution failed:", bcError);
            // We might want to rollback DB here, but for now just log it.
        }

        res.json({ id, location, area, price, ownerId, isForSale: true, surveyNumber, district, state, pinCode, marketValue, documentUrl, photoUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// --- Transaction Routes ---
app.post('/api/lands/request', async (req, res) => {
    const { landId, buyerId } = req.body;
    const id = generateId();
    try {
        // Get current owner (seller)
        const [lands] = await pool.query('SELECT * FROM lands WHERE id = ?', [landId]);
        if (lands.length === 0) return res.status(404).json({ message: 'Land not found' });

        const land = lands[0];

        // INTEGRITY CHECK
        const integrityReport = await blockchain.verifyLandIntegrity(land.id, land);
        if (integrityReport && integrityReport.isTampered) {
            return res.status(403).json({ message: 'SECURITY ALERT: Land record is compromised/tampered. Transactions are blocked.' });
        }

        const sellerId = land.ownerId;

        await pool.query('INSERT INTO requests (id, landId, buyerId, sellerId, status) VALUES (?, ?, ?, ?, ?)',
            [id, landId, buyerId, sellerId, 'PENDING']);
        res.json({ id, landId, buyerId, sellerId, status: 'PENDING' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/requests/:ownerId', async (req, res) => {
    const { ownerId } = req.params;
    try {
        // Join requests with lands and users (buyers)
        // We only want requests for lands owned by this user
        const query = `
            SELECT r.*, 
                   l.location as land_location, l.price as land_price, l.area as land_area,
                   u.name as buyer_name, u.email as buyer_email
            FROM requests r
            JOIN lands l ON r.landId = l.id
            JOIN users u ON r.buyerId = u.id
            WHERE r.sellerId = ?
        `;
        const [rows] = await pool.query(query, [ownerId]);

        // Format response to match previous structure
        const enrichedRequests = rows.map(row => ({
            id: row.id,
            landId: row.landId,
            buyerId: row.buyerId,
            status: row.status,
            land: {
                id: row.landId,
                location: row.land_location,
                price: row.land_price,
                area: row.land_area,
                ownerId: ownerId // This is the seller viewing, so they are the owner (or were)
            },
            buyer: {
                id: row.buyerId,
                name: row.buyer_name,
                email: row.buyer_email
            }
        }));

        res.json(enrichedRequests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/buyer-requests/:buyerId', async (req, res) => {
    const { buyerId } = req.params;
    try {
        const query = `
            SELECT r.*, 
                   l.location as land_location, l.price as land_price, l.area as land_area,
                   u.name as seller_name, u.email as seller_email
            FROM requests r
            JOIN lands l ON r.landId = l.id
            LEFT JOIN users u ON r.sellerId = u.id
            WHERE r.buyerId = ?
        `;
        const [rows] = await pool.query(query, [buyerId]);

        const enrichedRequests = rows.map(row => ({
            id: row.id,
            landId: row.landId,
            buyerId: row.buyerId,
            sellerId: row.sellerId,
            status: row.status,
            land: {
                id: row.landId,
                location: row.land_location,
                price: row.land_price,
                area: row.land_area,
                ownerId: row.sellerId // Use sellerId as the owner from buyer's perspective during transaction
            },
            seller: {
                id: row.sellerId,
                name: row.seller_name,
                email: row.seller_email
            }
        }));

        res.json(enrichedRequests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/lands/approve', async (req, res) => {
    const { requestId } = req.body;
    try {
        const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
        if (requests.length === 0) return res.status(404).json({ message: 'Request not found' });
        const request = requests[0];

        const [lands] = await pool.query('SELECT * FROM lands WHERE id = ?', [request.landId]);
        if (lands.length === 0) return res.status(404).json({ message: 'Land not found' });

        // INTEGRITY CHECK
        const integrityReport = await blockchain.verifyLandIntegrity(lands[0].id, lands[0]);
        if (integrityReport && integrityReport.isTampered) {
            return res.status(403).json({ message: 'SECURITY ALERT: Land record is compromised/tampered. Transactions are blocked.' });
        }

        await pool.query('UPDATE requests SET status = ? WHERE id = ?', ['WAITING_PAYMENT', requestId]);

        res.json({ message: 'Request approved. Waiting for buyer payment.', request: { ...request, status: 'WAITING_PAYMENT' } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/lands/pay', async (req, res) => {
    const { requestId } = req.body;
    try {
        const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
        if (requests.length === 0) return res.status(404).json({ message: 'Request not found' });
        const request = requests[0];

        if (request.status !== 'WAITING_PAYMENT') {
            return res.status(400).json({ message: 'Request is not waiting for payment' });
        }

        const [lands] = await pool.query('SELECT * FROM lands WHERE id = ?', [request.landId]);
        if (lands.length === 0) return res.status(404).json({ message: 'Land not found' });
        const land = lands[0];

        // INTEGRITY CHECK  ← BUG FIX: was missing 'await', making check always pass
        const integrityReport = await blockchain.verifyLandIntegrity(land.id, land);
        if (integrityReport && integrityReport.isTampered) {
            return res.status(403).json({ message: 'SECURITY ALERT: Land record is compromised/tampered. Payment blocked.' });
        }

        // Insert payment record
        const paymentId = generateId();
        await pool.query('INSERT INTO payments (id, requestId, amount, status) VALUES (?, ?, ?, ?)',
            [paymentId, requestId, land.price, 'SUCCESS']);

        // Update request status
        await pool.query('UPDATE requests SET status = ? WHERE id = ?', ['COMPLETED', requestId]);

        // Transfer ownership
        await pool.query('UPDATE lands SET ownerId = ?, isForSale = ? WHERE id = ?', [request.buyerId, false, land.id]);

        // Record in blockchain via Smart Contract Service
        try {
            await smartContractService.transferOwnership(land.id, land.ownerId, request.buyerId, land.price, land.location);
        } catch (bcError) {
            console.error("Smart Contract execution failed:", bcError);
        }

        res.json({ message: 'Payment successful. Ownership transferred.', land: { ...land, ownerId: request.buyerId, isForSale: false } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/blockchain', async (req, res) => {
    const { userId } = req.query;
    try {
        if (userId) {
            // User specific view (My Lands history + Sold Lands history)
            // 1. Get all lands owned by user (current)
            const [ownedLands] = await pool.query('SELECT id FROM lands WHERE ownerId = ?', [userId]);

            // 2. Get all lands where user was buyer or seller
            const [transactionLands] = await pool.query('SELECT landId FROM requests WHERE buyerId = ? OR sellerId = ?', [userId, userId]);

            // Combine and unique
            const landIds = [...new Set([
                ...ownedLands.map(l => l.id),
                ...transactionLands.map(l => l.landId)
            ])];

            if (landIds.length === 0) {
                return res.json([]);
            }

            const events = await blockchain.getUserEvents(landIds, userId);

            // Resolve User IDs to Names
            const [users] = await pool.query('SELECT id, name FROM users');
            const userMap = {};
            users.forEach(u => userMap[u.id] = u.name);

            const enrichedEvents = events.map(event => {
                const newEvent = { ...event };
                if (event.type === 'Registration') {
                    newEvent.details.ownerName = userMap[event.details.ownerId] || 'Unknown';
                } else {
                    newEvent.details.oldOwnerName = userMap[event.details.oldOwner] || 'Unknown';
                    newEvent.details.newOwnerName = userMap[event.details.newOwner] || 'Unknown';
                }
                return newEvent;
            });

            res.json(enrichedEvents);
        } else {
            // Default: Show all blocks (Admin/Global view)
            const data = await blockchain.getBlockchainData();
            res.json(data);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- Tamper Detection & Simulation Routes ---

// Simulate a "Hack" (Direct DB Update without Blockchain)
app.post('/api/admin/tamper', async (req, res) => {
    const { landId, field, newValue } = req.body;

    // Allowed fields to tamper for demo
    if (!['price', 'ownerId'].includes(field)) {
        return res.status(400).json({ message: 'Invalid field for tamper simulation' });
    }

    try {
        await pool.query(`UPDATE lands SET ${field} = ? WHERE id = ?`, [newValue, landId]);
        res.json({
            success: true,
            message: `⚠️ SECURITY ALERT: Tampered ${field} for Land ${landId}. DB updated to ${newValue}, but Blockchain remains unchanged.`
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verify Integrity (Compare DB vs Blockchain)
app.get('/api/blockchain/integrity', async (req, res) => {
    const { userId } = req.query;
    try {
        let landsToCheck = [];

        if (userId) {
            // 1. Get lands the user OWNS in DB (might be hacked to include extra, or missing some)
            const [dbLands] = await pool.query('SELECT * FROM lands WHERE ownerId = ?', [userId]);

            // 2. Get lands the user SHOULD OWN according to Blockchain (Source of Truth)
            const chainLandIds = blockchain.getLandsOwnedBy(userId);

            // 3. Get DB records for the chain lands (even if currently owned by 'hacker' in DB)
            let chainLandsDetails = [];
            if (chainLandIds.length > 0) {
                // Format for SQL IN clause
                const placeholders = chainLandIds.map(() => '?').join(',');
                const [rows] = await pool.query(`SELECT * FROM lands WHERE id IN (${placeholders})`, chainLandIds);
                chainLandsDetails = rows;
            }

            // Union by ID to avoid duplicates
            const landMap = new Map();
            dbLands.forEach(l => landMap.set(l.id, l));
            chainLandsDetails.forEach(l => landMap.set(l.id, l));

            landsToCheck = Array.from(landMap.values());

        } else {
            // Check ALL lands (Admin view)
            const [allLands] = await pool.query('SELECT * FROM lands');
            landsToCheck = allLands;
        }

        const [users] = await pool.query('SELECT id, name FROM users');
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);

        const reports = [];

        for (const land of landsToCheck) {
            const report = await blockchain.verifyLandIntegrity(land.id, land);
            if (report && report.isTampered) {
                // Fetch land location for better UI
                report.location = land.location;

                // Resolve Owner IDs to Names
                report.discrepancies = report.discrepancies.map(d => {
                    if (d.field === 'ownerId') {
                        return {
                            ...d,
                            chainValue: userMap[d.chainValue] || `Unknown (${d.chainValue})`,
                            dbValue: userMap[d.dbValue] || `Unknown (${d.dbValue})`
                        };
                    }
                    return d;
                });

                reports.push(report);
            }
        }
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Revert Tampered Land (Restore from Blockchain)
app.post('/api/lands/revert', async (req, res) => {    const { landId } = req.body;
    try {
        const correctState = await blockchain.getLandStateFromChain(landId);
        if (!correctState) {
            return res.status(404).json({ message: 'No valid blockchain history found for this land.' });
        }

        // Restore DB
        await pool.query(
            'UPDATE lands SET ownerId = ?, price = ? WHERE id = ?',
            [correctState.ownerId, correctState.price, landId]
        );

        res.json({ message: 'Land restored successfully from blockchain.', state: correctState });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- EVM Health & Status Route ---
app.get('/api/evm/status', async (req, res) => {
    try {
        const status = await smartContractService.getStatus();
        res.json({
            evmConnected: status.evmConnected,
            rpcUrl: status.rpcUrl,
            chainId: status.chainId,
            currentBlock: status.currentBlock,
            contractAddress: status.contractAddress,
            jsLedgerBlocks: blockchain.chain.length,
            mode: status.evmConnected
                ? 'EVM + JS-Ledger (dual-layer)'
                : 'JS-Ledger simulation only'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});