#!/usr/bin/env node

// Custom contract verification script for BSCScan using ethers.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957';
const API_KEY = process.env.ETHERSCAN_API_KEY;
// Etherscan V2 API endpoint with BSC chainid (56 for mainnet, 97 for testnet)
const CHAIN_ID = 56; // BSC Mainnet
const ETHERSCAN_V2_API_URL = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}`;

const CONSTRUCTOR_ARGS = [
  '0x5ff808633f2c5a3349adf89be7f71a2f2fede06f',
  '0x644436697d5d2e4d1e96bfa567f645e0df74a246',
  '0xa923e2c9cb21aec25ce204f4eeee62b6c8e77843',
  '0x3ae7780e7b7f7dfe86bc6ca8a308be9cbf9d1ff6',
  '0x98ea12a51536a771e1DaFe965F88a653F7B33b4F',
];

async function verifyContract() {
  if (!API_KEY) {
    console.error('Error: ETHERSCAN_API_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('Starting contract verification...');
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`API Key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(-5)}`);
  console.log(`Constructor Args: ${CONSTRUCTOR_ARGS.join(', ')}`);

  // Read compiled contract source
  const artifactPath = path.join(__dirname, '../artifacts/contracts/Core.sol/Core.json');

  if (!fs.existsSync(artifactPath)) {
    console.error(`Error: Artifact not found at ${artifactPath}`);
    console.log('Please compile the contract first with: npx hardhat compile');
    process.exit(1);
  }

  // Read all source files for multi-file verification
  const coreSolPath = path.join(__dirname, '../contracts/Core.sol');
  const matrixTemplatePath = path.join(__dirname, '../contracts/MatrixTemplate.sol');

  const coreSource = fs.readFileSync(coreSolPath, 'utf8');
  const matrixTemplateSource = fs.readFileSync(matrixTemplatePath, 'utf8');

  // Create JSON source code format - Etherscan expects the full Hardhat compilation input
  // Get the actual build input for complete metadata
  const buildInfoPath = path.join(__dirname, '../artifacts/build-info');
  const buildInfoFiles = fs.readdirSync(buildInfoPath);
  const buildInfoFile = buildInfoFiles.find(f => f.endsWith('.json'));

  let sourceCodeObject;
  if (buildInfoFile) {
    const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoPath, buildInfoFile), 'utf8'));
    sourceCodeObject = buildInfo.input;
  } else {
    // Fallback to minimal format
    sourceCodeObject = {
      sources: {
        'contracts/Core.sol': {
          content: coreSource
        },
        'contracts/MatrixTemplate.sol': {
          content: matrixTemplateSource
        }
      }
    };
  }

  let compilerVersion = 'v0.8.30';
  let optimizationUsed = 1;
  let runs = 1000;

  // Get compiler details from build info
  const buildInfoPath2 = path.join(__dirname, '../artifacts/build-info');
  const buildInfoFiles2 = fs.readdirSync(buildInfoPath2);
  const buildInfoFile2 = buildInfoFiles2.find(f => f.endsWith('.json'));

  if (buildInfoFile2) {
    const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoPath2, buildInfoFile2), 'utf8'));
    if (buildInfo.solcLongVersion) {
      // Add 'v' prefix if not present
      compilerVersion = buildInfo.solcLongVersion.startsWith('v')
        ? buildInfo.solcLongVersion
        : 'v' + buildInfo.solcLongVersion;
    }
    if (buildInfo.input && buildInfo.input.settings) {
      optimizationUsed = buildInfo.input.settings.optimizer?.enabled ? 1 : 0;
      runs = buildInfo.input.settings.optimizer?.runs || 1000;
    }
  }

  console.log(`Compiler Version: ${compilerVersion}`);
  console.log(`Optimization Used: ${optimizationUsed}, Runs: ${runs}`);

  const sourceCode = JSON.stringify(sourceCodeObject);
  const contractName = 'Core';

  // Encode constructor arguments using ethers.js (v5)
  const types = ['address[5]'];
  const encodedConstructorArgs = ethers.utils.defaultAbiCoder.encode(types, [CONSTRUCTOR_ARGS]).substring(2); // Remove '0x' prefix

  console.log(`Encoded Constructor Args: 0x${encodedConstructorArgs}`);

  // Prepare verification data
  const verificationData = {
    apikey: API_KEY,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: CONTRACT_ADDRESS,
    sourceCode: sourceCode,
    codeformat: 'solidity-standard-json-input',
    contractname: 'contracts/Core.sol:Core',
    compilerversion: compilerVersion,
    optimizationUsed: optimizationUsed,
    runs: runs,
    constructorArguements: encodedConstructorArgs,
  };

  try {
    console.log('\nSending verification request to Etherscan V2 API...');
    const response = await axios.post(ETHERSCAN_V2_API_URL, new URLSearchParams(verificationData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('\nResponse from BSCScan:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.status === '1') {
      console.log(`\n✓ Verification successful!`);
      console.log(`Transaction ID: ${response.data.result}`);
      console.log(`View on BSCScan: https://bscscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else if (response.data.status === '0' && response.data.result.includes('Already Verified')) {
      console.log(`\n✓ Contract is already verified on BSCScan`);
      console.log(`View on BSCScan: https://bscscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.error(`\n✗ Verification failed!`);
      console.error(`Message: ${response.data.message}`);
      console.error(`Details: ${response.data.result}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\nError during verification:');
    console.error(error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

verifyContract();
