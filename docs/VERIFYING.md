# Contract Verification Guide

This guide explains how to verify your smart contracts on BSCScan using the custom verification script.

## Overview

The `scripts/verify-contract.js` script automates contract verification on BSCScan using the Etherscan V2 API. It handles:

- Multi-file contracts (with imports)
- ABI encoding of constructor arguments
- Automatic compiler version detection
- Complete source code submission

## Prerequisites

1. **Etherscan API Key** - Get one at https://etherscan.io/apidashboard
2. **Compiled Contract** - Run `npx hardhat compile` first
3. **Node.js** - v14+ required
4. **Dependencies** - `axios`, `ethers` (already installed)

## Setup

### 1. Get an Etherscan API Key

1. Visit https://etherscan.io/apidashboard
2. Sign up or log in
3. Create a new API token
4. Copy the API key

**Note:** This single Etherscan API key works for all chains (Ethereum, BSC, Polygon, etc.) thanks to Etherscan V2 API.

### 2. Compile Your Contract

Before verification, ensure your contract is compiled:

```bash
npx hardhat compile
```

## Usage

### Basic Usage

```bash
ETHERSCAN_API_KEY="your_api_key_here" node scripts/verify-contract.js
```

### Example

```bash
ETHERSCAN_API_KEY="Z80000000000000000000000000000005T" node scripts/verify-contract.js
```

### Output

Successful verification produces:

```
Starting contract verification...
Contract Address: 0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957
API Key: Z8FEE...Z80000000000000000000000000000005T
Constructor Args: 0x5ff808633f2c5a3349adf89be7f71a2f2fede06f, 0x644436697d5d2e4d1e96bfa567f645e0df74a246, ...
Compiler Version: v0.8.30+commit.73712a01
Optimization Used: 1, Runs: 1000
Encoded Constructor Args: 0x0000000000000000000000005ff808633f2c5a3349adf89be7f71a2f2fede06f...

Sending verification request to Etherscan V2 API...

Response from BSCScan:
{
  "status": "1",
  "message": "OK",
  "result": "zcdqkcvq7guthiuyzvgqpcliujmtdsvmujvwyg7shxgk4t21ir"
}

✓ Verification successful!
Transaction ID: zcdqkcvq7guthiuyzvgqpcliujmtdsvmujvwyg7shxgk4t21ir
View on BSCScan: https://bscscan.com/address/0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957#code
```

## Customizing the Script

### Change Contract Address

Edit `scripts/verify-contract.js` and modify the `CONTRACT_ADDRESS` constant:

```javascript
const CONTRACT_ADDRESS = '0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957';
```

### Change Network

Edit the `CHAIN_ID` constant:

```javascript
const CHAIN_ID = 56; // BSC Mainnet
// const CHAIN_ID = 97; // BSC Testnet
// const CHAIN_ID = 1;  // Ethereum Mainnet
// const CHAIN_ID = 11155111; // Ethereum Sepolia
```

### Change Constructor Arguments

Edit the `CONSTRUCTOR_ARGS` array:

```javascript
const CONSTRUCTOR_ARGS = [
  '0x5ff808633f2c5a3349adf89be7f71a2f2fede06f',
  '0x644436697d5d2e4d1e96bfa567f645e0df74a246',
  '0xa923e2c9cb21aec25ce204f4eeee62b6c8e77843',
  '0x3ae7780e7b7f7dfe86bc6ca8a308be9cbf9d1ff6',
  '0x98ea12a51536a771e1DaFe965F88a653F7B33b4F',
];
```

## How It Works

### 1. Source Code Collection

The script reads all Solidity files from the `contracts/` directory and packages them in Etherscan's standard JSON format.

### 2. Constructor Argument Encoding

Constructor arguments are ABI-encoded using `ethers.js` to match the bytecode used during deployment. For example:
- Raw addresses: `[0x5ff808633f2c5a3349adf89be7f71a2f2fede06f, ...]`
- ABI-encoded: `0x0000000000000000000000005ff808633f2c5a3349adf89be7f71a2f2fede06f...`

### 3. Compiler Metadata

The script automatically extracts from `artifacts/build-info/`:
- Exact compiler version (e.g., `v0.8.30+commit.73712a01`)
- Optimization settings (enabled: yes/no, runs: number)

### 4. API Submission

Uses Etherscan V2 API endpoint with chainid parameter:
```
https://api.etherscan.io/v2/api?chainid=56
```

## Troubleshooting

### "Invalid constructor arguments provided"

**Cause:** Constructor arguments are not ABI-encoded properly.

**Solution:** Verify the arguments match the contract's constructor signature in the order they appear.

### "Invalid compiler version"

**Cause:** Compiler version format is incorrect.

**Solution:** Ensure version includes the `v` prefix and commit hash, e.g., `v0.8.30+commit.73712a01`

### "Contract source code not verified"

**Cause:** The submission was accepted but hasn't been processed yet.

**Solution:** Wait a few minutes and check BSCScan again. API processing can take time.

### "You are using a deprecated V1 endpoint"

**Cause:** The script is using old Etherscan endpoints.

**Solution:** Ensure you're using the latest `scripts/verify-contract.js` which uses V2 API.

### "ETHERSCAN_API_KEY not set"

**Cause:** API key environment variable not provided.

**Solution:** Include the key in the command:
```bash
ETHERSCAN_API_KEY="your_key" node scripts/verify-contract.js
```

## Verification Status

After submission, check verification status:

```bash
curl "https://api.etherscan.io/v2/api?chainid=56&module=contract&action=getsourcecode&address=0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957&apikey=YOUR_API_KEY"
```

The response will show:
- `ContractName` - Contract name (empty if not verified yet)
- `CompilerVersion` - Version used
- `OptimizationUsed` - 0 or 1
- `ABI` - Contract ABI (or "Contract source code not verified" if pending)

## Real World Example: Core Contract Verification

Our **Core** contract was successfully verified on BSC Mainnet using this script.

**Contract Details:**
- **Contract Address:** `0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957`
- **Network:** BSC Mainnet (Chain ID: 56)
- **Compiler:** Solidity v0.8.30+commit.73712a01
- **Optimization:** Enabled (1000 runs)
- **Status:** ✅ Verified

**Verification Command Used:**
```bash
ETHERSCAN_API_KEY="Z80000000000000000000000000000005T" node scripts/verify-contract.js
```

**View the Verified Contract:**
https://bscscan.com/address/0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957#code

On the BSCScan page, you can now:
- ✅ Read the complete source code
- ✅ View the contract ABI
- ✅ Interact with contract functions
- ✅ See constructor arguments
- ✅ Verify bytecode matches source code

## Supported Chains

Thanks to Etherscan V2 API, a single API key works across all supported chains:

| Network | Chain ID | Example |
|---------|----------|---------|
| BSC Mainnet | 56 | 0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957 |
| BSC Testnet | 97 | - |
| Ethereum Mainnet | 1 | - |
| Ethereum Sepolia | 11155111 | - |
| Polygon Mainnet | 137 | - |
| Polygon Mumbai | 80001 | - |

## Advanced: Multi-File Contracts

The script automatically detects and handles contracts with imports:

```solidity
// Core.sol
import "./MatrixTemplate.sol";

contract Core {
  // ...
}
```

The script packages all files from `contracts/` directory in the correct format:

```json
{
  "sources": {
    "contracts/Core.sol": { "content": "..." },
    "contracts/MatrixTemplate.sol": { "content": "..." }
  },
  "settings": { ... }
}
```

## References

- [Etherscan API Documentation](https://docs.etherscan.io/)
- [Etherscan V2 Migration Guide](https://docs.etherscan.io/v2-migration)
- [Hardhat Verification](https://hardhat.org/docs/guides/smart-contract-verification)
- [BSCScan](https://bscscan.com)
