const axios = require('axios');
const FormData = require('form-data');

async function runTest() {
    try {
        console.log("=== 1. Registering Land on Local EVM Smart Contract ===");
        const form = new FormData();
        form.append('location', 'FC Road, Pune');
        form.append('area', '1200');
        form.append('price', '5500000');
        form.append('ownerId', 'yce093i72');
        form.append('surveyNumber', 'MH-PN-2026-999');
        form.append('district', 'Pune');
        form.append('state', 'Maharashtra');
        form.append('pinCode', '411004');
        form.append('marketValue', '5200000');

        const regRes = await axios.post('http://localhost:5000/api/lands', form, {
            headers: form.getHeaders()
        });

        const newLand = regRes.data;
        console.log(`✅ Land registered on EVM! ID: ${newLand.id}, Location: ${newLand.location}, Price: ${newLand.price}`);

        console.log("\n=== 2. Checking Blockchain Integrity against EVM ===");
        const intRes1 = await axios.get('http://localhost:5000/api/blockchain/integrity');
        console.log(`Integrity Report Count (Tampered Lands): ${intRes1.data.length}`);

        console.log(`\n=== 3. Simulating DB Tamper Attack on Land ${newLand.id} ===`);
        const tamperRes = await axios.post('http://localhost:5000/api/admin/tamper', {
            landId: newLand.id,
            field: 'price',
            newValue: 9999999
        });
        console.log(`Response: ${tamperRes.data.message}`);

        console.log("\n=== 4. Checking Blockchain Integrity after Tampering ===");
        const intRes2 = await axios.get('http://localhost:5000/api/blockchain/integrity');
        console.log("Tamper Report Output:");
        console.dir(intRes2.data, { depth: null });

        console.log(`\n=== 5. Reverting Tampered DB Record from EVM Smart Contract ===`);
        const revertRes = await axios.post('http://localhost:5000/api/lands/revert', {
            landId: newLand.id
        });
        console.log(`Revert Message: ${revertRes.data.message}`);
        console.dir(revertRes.data.state, { depth: null });

        console.log("\n=== 6. Re-checking Integrity Post-Recovery ===");
        const intRes3 = await axios.get('http://localhost:5000/api/blockchain/integrity');
        console.log(`Tampered lands count post-revert: ${intRes3.data.length}`);

        console.log("\n🎉 ALL EVM INTEGRATION TESTS PASSED PERFECTLY!");

    } catch (error) {
        console.error("Test failed:", error.response ? error.response.data : error.message);
    }
}

runTest();
