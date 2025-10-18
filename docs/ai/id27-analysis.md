# Analysis of IndicesTotal Issue in MatrixTemplate.sol (Wallet i==27)

## Issue Summary

When wallet index 27 (`0x1003ff39d25f2ab16dbcc18ece05a9b6154f65f4`) registers in MatrixTemplate contract with `matrixIndex == 2`, both this wallet AND wallet id5 (`0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097`) are registered with the **same `IndicesTotal` value of 27**, even though each registration should increment `IndicesTotal`.

## Test Context

**Test:** test 6 in `test/Core.js` (lines 1551-1640)

**Test Flow:**
1. Deploy with id0-id4 registered
2. id5 registers under id4 for 0.01 BNB
3. id5 sends additional 0.02 BNB
4. id6 registers under id5 for 0.01 BNB
5. id6 sends additional 0.06 BNB
6. **Loop: id7 through id29 each send 0.07 BNB** (line 1610)

**Problematic Transaction:**
- Transaction from wallet i==27 sending 0.07 BNB
- Logged in `private/logs/node.txt` lines 3549-3716

## Detailed Transaction Flow Analysis

### Initial State
- MatrixTemplate (matrixIndex 2) has `IndicesTotal = 26`
- Wallet i==27 (`0x1003ff39d25f2ab16dbcc18ece05a9b6154f65f4`) sends 0.07 BNB
- Wallet id5 (`0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097`) has accumulated 0.04 BNB in claims

### Step-by-Step Execution

#### 1. Registration in Matrix 0 (matrixIndex: 0)
```
Line 3581: IndicesTotal = 27
Line 3588-3590: addUser() increments IndicesTotal: 27 → 28
Result: Wallet i==27 registered at index 27 in matrix 0 ✓
```

#### 2. Registration in Matrix 1 (matrixIndex: 1)
```
Line 3606: IndicesTotal = 27
Line 3613-3615: addUser() increments IndicesTotal: 27 → 28
Result: Wallet i==27 registered at index 27 in matrix 1 ✓
```

#### 3. Registration in Matrix 2 (matrixIndex: 2) - THE PROBLEM

**3a. Wallet i==27 starts registration:**
```
Line 3630: calcUserData() reads IndicesTotal = 26
Line 3631-3634: Calculates position:
  - parentIndex = 12
  - plateau = 5
  - mod = 0
```

**3b. Because mod == 0, goUp() is called (line 3636-3638):**
```
Line 3641: updateUser() called for 0xcd3b766ccdd6ae721141f452c550ca635964ce71
Line 3643: This triggers matricesRegistration for id5 (0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097)
```

**3c. NESTED: id5 registers in Matrix 2:**
```
Line 3656-3657: calcUserData() reads IndicesTotal = 26 (SAME VALUE!)
Line 3659-3660: Calculates position:
  - parentIndex = 12
  - plateau = 5
  - mod = 0
Line 3680-3682: addUser() increments IndicesTotal: 26 → 27
Result: id5 registered at IndicesTotal = 27 in matrix 2
```

**3d. Return to wallet i==27 registration:**
```
Line 3704-3706: addUser() increments IndicesTotal: 27 → 28
Result: Wallet i==27 registered at IndicesTotal = 28 in matrix 2
```

### The Critical Issue

**Both wallets calculated their positions using `IndicesTotal = 26`:**
- id5 calculated: parentIndex=12, plateau=5, mod=0
- Wallet i==27 calculated: parentIndex=12, plateau=5, mod=0

**But they were registered at different IndicesTotal values:**
- id5 registered at `IndicesTotal = 27`
- Wallet i==27 registered at `IndicesTotal = 28`

**Result:** Both wallets have the **same parent** and **same position** in the binary tree, which violates the matrix structure.

## Root Cause Analysis

### Code Flow in MatrixTemplate.sol::register()

```solidity
function register(address _wallet, Core.UserGlobal calldata _tmpUser) external {
    // Line 98: Calculate position BEFORE any state changes
    (parentIndex, plateau, mod) = calcUserData();

    // Line 99: Create user with calculated position
    User memory user = User(IndicesTotal, parentIndex, false, plateau, true);

    // Line 100-108: If mod == 0, call goUp() which can trigger nested calls
    if (mod == 0) {
        user.isRight = true;
        if (parentIndex > 0) {
            goUp(parentIndex, _wallet, _tmpUser);  // ← NESTED CALL HERE
        }
    }

    // Line 110: Store user
    Addresses[_wallet] = user;

    // Line 116: Increment IndicesTotal AFTER goUp()
    addUser(_wallet);
}
```

### The Reentrancy Pattern

1. **Read** `IndicesTotal` via `calcUserData()` (line 98)
2. **Calculate** position based on current `IndicesTotal`
3. **External call** via `goUp()` → `updateUser()` → `matricesRegistration()` → `register()` (line 107)
4. **Nested execution** increments `IndicesTotal` (via nested `addUser()`)
5. **Original execution** continues with **stale position data**
6. **Original execution** increments `IndicesTotal` again (line 116)

### Why This is a Reentrancy Issue

This is a **read-modify-write reentrancy** vulnerability:

```
Outer Call:                    Nested Call:
├─ Read IndicesTotal (26)
├─ Calculate position
├─ Call goUp() ────────────────┐
│                              ├─ Read IndicesTotal (26)
│                              ├─ Calculate position
│                              ├─ Modify IndicesTotal → 27
│                              └─ Return
├─ Use stale position! ←──────┘
└─ Modify IndicesTotal → 28
```

## Evaluation of User's Thoughts

### Thought #1: Error in contract, some registration doesn't increment IndicesTotal
**Status:** ❌ Incorrect

**Analysis:** Both registrations DO increment `IndicesTotal`:
- id5 registration: 26 → 27 (line 3682)
- Wallet i==27 registration: 27 → 28 (line 3706)

The problem is not that increment doesn't happen, but that **both registrations calculate their position using the same `IndicesTotal` value (26)**.

### Thought #2: Storage variable `IndicesTotal` saved only after whole transaction
**Status:** ✅ Partially Correct

**Analysis:** The user is on the right track. The issue is:
- `IndicesTotal` IS updated immediately in storage when `addUser()` is called
- However, the **position calculation happens BEFORE the increment**
- When a nested call occurs via `goUp()`, it reads the same `IndicesTotal` value that the outer call read
- Both calls calculate their position based on this value
- Then both calls increment `IndicesTotal`, but the damage is done - they already calculated the same position

More accurately: The problem is the **order of operations**:
1. Calculate position (uses current `IndicesTotal`)
2. Call `goUp()` which can trigger nested registration
3. Nested registration increments `IndicesTotal`
4. Original registration uses **pre-calculated position** (stale)
5. Original registration increments `IndicesTotal` again

## Impact

### Immediate Impact
- Two wallets occupy the same logical position in the binary tree
- Parent-child relationships are corrupted
- Reward distribution may be incorrect

### Affected Wallets in Test 6
- **id5** (`0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097`): Registered at `IndicesTotal = 27` with position calculated from 26
- **Wallet i==27** (`0x1003ff39d25f2ab16dbcc18ece05a9b6154f65f4`): Registered at `IndicesTotal = 28` with position calculated from 26

Both have:
- parentIndex: 12
- plateau: 5
- mod: 0
- parent wallet: 0x08135da0a343e492fa2d4282f2ae34c6c5cc1bbe

## Recommended Solutions

### Solution 1: Move addUser() Before goUp() (Simple but may break logic)

```solidity
function register(address _wallet, Core.UserGlobal calldata _tmpUser) external {
    (parentIndex, plateau, mod) = calcUserData();
    User memory user = User(IndicesTotal, parentIndex, false, plateau, true);

    // Store and increment BEFORE external calls
    Addresses[_wallet] = user;
    addUser(_wallet);  // ← Move here

    if (mod == 0) {
        user.isRight = true;
        if (parentIndex > 0) {
            goUp(parentIndex, _wallet, _tmpUser);
        }
    }
}
```

**Problem:** The user object stored in `Addresses[_wallet]` won't have `isRight = true` set if needed.

### Solution 2: Use Reentrancy Guard (Recommended)

Add OpenZeppelin's ReentrancyGuard to MatrixTemplate:

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MatrixTemplate is ReentrancyGuard {
    function register(address _wallet, Core.UserGlobal calldata _tmpUser)
        external
        nonReentrant  // ← Add this modifier
    {
        // existing code
    }
}
```

**Advantage:** Prevents nested calls entirely, solving the root cause.

### Solution 3: Check and Recalculate After goUp()

```solidity
function register(address _wallet, Core.UserGlobal calldata _tmpUser) external {
    uint256 initialIndicesTotal = IndicesTotal;
    (parentIndex, plateau, mod) = calcUserData();
    User memory user = User(IndicesTotal, parentIndex, false, plateau, true);

    if (mod == 0) {
        user.isRight = true;
        if (parentIndex > 0) {
            goUp(parentIndex, _wallet, _tmpUser);
        }
    }

    // Recalculate if IndicesTotal changed
    if (IndicesTotal != initialIndicesTotal) {
        (parentIndex, plateau, mod) = calcUserData();
        user = User(IndicesTotal, parentIndex, false, plateau, true);
        if (mod == 0) {
            user.isRight = true;
        }
    }

    Addresses[_wallet] = user;
    addUser(_wallet);
}
```

**Advantage:** Handles the race condition explicitly.

### Solution 4: Defer updateUser Calls (Complex but clean)

Queue the updateUser calls and process them after the current registration completes, avoiding nested registrations entirely.

## Conclusion

The issue is a **reentrancy vulnerability** where:
1. Position calculation happens with `IndicesTotal = N`
2. A nested call increments `IndicesTotal` to N+1
3. The original call continues with stale position data
4. Both registrations end up with the same calculated position

**Your Thought #2 was closest to the truth** - the storage variable IS updated, but the timing of when it's read vs. when it's written creates a race condition when nested calls occur.

---

## IMPLEMENTED FIX (2025-10-11)

### Solution Chosen: Increment IndicesTotal BEFORE goUp()

After testing Solution 2 (ReentrancyGuard), we discovered it blocks legitimate nested calls that are required for the contract logic. Instead, we implemented a **Check-Effects-Interactions** pattern by moving the state changes before external calls.

### Implementation in contracts/MatrixTemplate.sol:87-124

```solidity
function register(address _wallet, Core.UserGlobal calldata _tmpUser) external {
    // make it protected (available calls only from Core contract)
    require(msg.sender == CoreAddress, "access denied 02");

    // Calculate position based on current IndicesTotal
    (parentIndex, plateau, mod) = calcUserData();
    User memory user = User(IndicesTotal, parentIndex, false, plateau, true);

    if (mod == 0) {
        user.isRight = true;
    }

    // CRITICAL FIX: Store user and increment IndicesTotal BEFORE calling goUp()
    // This ensures nested registrations see the updated IndicesTotal value
    Addresses[_wallet] = user;
    addUser(_wallet);  // Increments IndicesTotal

    // Call goUp() AFTER incrementing IndicesTotal
    // Now nested calls will see the correct value and won't cause conflicts
    if (mod == 0 && parentIndex > 0) {
        goUp(parentIndex, _wallet, _tmpUser);
    }

    // Rest of function...
}
```

### How This Fix Solves the Problem

**Before Fix:**
```
Outer Call:                    Nested Call:
├─ Read IndicesTotal (26)
├─ Calculate position
├─ Call goUp() ────────────────┐
│                              ├─ Read IndicesTotal (26) ← STALE!
│                              ├─ Calculate same position
│                              ├─ Modify IndicesTotal → 27
│                              └─ Return
├─ Use stale position! ←──────┘
└─ Modify IndicesTotal → 28
```

**After Fix:**
```
Outer Call:                    Nested Call:
├─ Read IndicesTotal (26)
├─ Calculate position
├─ Store user
├─ Modify IndicesTotal → 27  ← UPDATED BEFORE EXTERNAL CALL
├─ Call goUp() ────────────────┐
│                              ├─ Read IndicesTotal (27) ← CORRECT!
│                              ├─ Calculate different position
│                              ├─ Modify IndicesTotal → 28
│                              └─ Return
└─ Continue normally ←─────────┘
```

### Benefits of This Solution

1. **Follows Check-Effects-Interactions Pattern**: State changes happen before external calls
2. **Preserves Business Logic**: Doesn't block legitimate nested registrations
3. **Simple & Clean**: Minimal code changes, easy to understand
4. **No Additional Dependencies**: Doesn't require ReentrancyGuard
5. **Gas Efficient**: No extra storage variables or checks

### How This Works with Core's Reentrancy Protection

**Important:** Core.sol has its own reentrancy guard on external entry points (`receive()` and `register()`), but this **does not conflict** with our fix because:

1. The `noReentrancy` modifier in Core.sol only protects external entry points
2. Internal functions like `matricesRegistration()` and `updateUser()` are NOT protected
3. This allows legitimate nested calls within the same transaction:
   - User → receive() [sets locked=true]
   - → matricesRegistration() [internal, no guard]
   - → MatrixTemplate.register() [external but to different contract]
   - → goUp() [internal]
   - → Core.updateUser() [external but NOT protected by noReentrancy]
   - → matricesRegistration() [internal, no guard]
   - → MatrixTemplate.register() [works because IndicesTotal was incremented]

4. The guard is released when receive() completes [sets locked=false]

**Why We Don't Use ReentrancyGuard on MatrixTemplate:**
- It would block legitimate nested registrations that are required for the business logic
- The real protection comes from Core.sol's guard on entry points
- Our fix (incrementing IndicesTotal before goUp) prevents the data race without blocking calls

### Verification

After cleaning and recompiling:
```bash
npx hardhat clean
npx hardhat compile
npx hardhat test --grep "test 6" --network hardhat
```

The test should now pass without any IndicesTotal conflicts and without reentrancy errors.

---

**Analysis Date:** 2025-10-11
**Fix Implemented:** 2025-10-11
**Analyzed Files:**
- `contracts/Core.sol`
- `contracts/MatrixTemplate.sol`
- `test/Core.js` (test 6, lines 1551-1640)
- `private/logs/node.txt` (lines 3549-3716)
