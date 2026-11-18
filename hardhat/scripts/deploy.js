const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=".repeat(60));
    console.log("  Deploying LandRegistry Smart Contract");
    console.log("  Network: Local Hardhat EVM (http://127.0.0.1:8545)");
    console.log("=".repeat(60));

    // Print the deploying account
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`\nDeployer address : ${deployer.address}`);
    console.log(`Deployer balance : ${hre.ethers.formatEther(balance)} ETH\n`);

    // Deploy contract
    const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
    const landRegistry = await LandRegistry.deploy();
    await landRegistry.waitForDeployment();

    const contractAddress = await landRegistry.getAddress();
    console.log(`✅ LandRegistry deployed at: ${contractAddress}`);

    // Verify by calling getLandCount (should return 0)
    const count = await landRegistry.getLandCount();
    console.log(`   Initial land count on chain: ${count.toString()}`);

    // Save ABI + address so the backend server can connect
    const artifact = await hre.artifacts.readArtifact("LandRegistry");

    const contractInfo = {
        address: contractAddress,
        network: "localhost",
        rpcUrl: "http://127.0.0.1:8545",
        chainId: 31337,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        abi: artifact.abi
    };

    const outputPath = path.join(__dirname, "../../server/contractInfo.json");
    fs.writeFileSync(outputPath, JSON.stringify(contractInfo, null, 2));
    console.log(`\n📄 Contract info (ABI + address) saved to:\n   ${outputPath}`);
    console.log("\n🚀 You can now start the backend server.\n");
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
