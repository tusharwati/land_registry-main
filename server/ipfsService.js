const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const BUNDLED_LAND_PICS_DIR = path.resolve(__dirname, '..', '..', 'land_pics');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

class IPFSService {
    /** Restore bundled photos into the local CID-named upload store. */
    restoreBundledLandPhotos() {
        if (!fs.existsSync(BUNDLED_LAND_PICS_DIR)) return 0;

        let restored = 0;
        for (const entry of fs.readdirSync(BUNDLED_LAND_PICS_DIR, { withFileTypes: true })) {
            if (!entry.isFile()) continue;

            const sourcePath = path.join(BUNDLED_LAND_PICS_DIR, entry.name);
            const buffer = fs.readFileSync(sourcePath);
            const hex = crypto.createHash('sha256').update(buffer).digest('hex');
            const cid = 'Qm' + Buffer.from(hex).toString('base64').substring(0, 44).replace(/\//g, 'x').replace(/\+/g, 'y');
            const filename = `${cid}${path.extname(entry.name) || '.dat'}`;
            const destinationPath = path.join(UPLOAD_DIR, filename);

            if (!fs.existsSync(destinationPath)) {
                fs.copyFileSync(sourcePath, destinationPath);
                restored += 1;
            }
        }

        return restored;
    }

    /**
     * Simulates uploading a file to IPFS.
     * Calculates a file hash, generates a "CID", and saves the file with that CID.
     * @param {Object} file - The file object from multer (or buffer)
     * @returns {Object} - { cid, url }
     */
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            try {
                // 读取文件内容 (if it's a path from multer)
                let buffer;
                if (file.buffer) {
                    buffer = file.buffer;
                } else if (file.path) {
                    buffer = fs.readFileSync(file.path);
                } else {
                    throw new Error("Invalid file object");
                }

                // 1. Calculate SHA-256 Hash
                const hashSum = crypto.createHash('sha256');
                hashSum.update(buffer);
                const hex = hashSum.digest('hex');

                // 2. Generate Simulated CID (starts with Qm to look like IPFS)
                // We'll use Qm + first 44 chars of base64 encoding of the hex to make it look authentic
                const cid = 'Qm' + Buffer.from(hex).toString('base64').substring(0, 44).replace(/\//g, 'x').replace(/\+/g, 'y');

                // 3. Save file with CID as filename
                const extension = path.extname(file.originalname || '') || '.dat';
                const filename = `${cid}${extension}`;
                const filePath = path.join(UPLOAD_DIR, filename);

                // Check if already exists (deduplication, feature of IPFS!)
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, buffer);
                    console.log(`[IPFS Global] File stored: ${cid}`);
                } else {
                    console.log(`[IPFS Global] File already exists (deduplicated): ${cid}`);
                }

                // If it was a temp upload from multer, we might want to delete the temp file
                if (file.path && file.filename) { // It was saved by multer previously
                    // Check if we want to keep the original or not. 
                    // For this sim, let's keep the multer one as a fallback or delete it.
                    // Let's delete the original random-name file to be clean
                    fs.unlinkSync(file.path);
                }

                resolve({
                    cid: cid,
                    url: `/uploads/${filename}` // Server static path
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Simulates uploading JSON metadata to IPFS
     */
    async uploadJSON(data) {
        const buffer = Buffer.from(JSON.stringify(data));
        return this.uploadFile({ buffer: buffer, originalname: 'metadata.json' });
    }
}

module.exports = new IPFSService();
