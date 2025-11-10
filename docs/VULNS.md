# Security Analysis: Core.sol & MatrixTemplate.sol

## CRITICAL Issues

### 1. Constructor Bug - AddressesGlobalTotal (Core.sol:85)

```solidity
for (uint i = 0; i < 5; i++) {
    // ...
    AddressesGlobalTotal = i;  // ❌ BUG!
}
```

After loop, `i=4` but 5 users were registered. Should be:

```solidity
AddressesGlobalTotal = AddressesGlobalTotal + 1;  // or = 5 after loop
```

**Impact:** AddressesGlobalTotal is off by 1, corrupting the user count.

---

### 2. Insufficient Time Lock - getTenPercentOnceYear (Core.sol:399)

```solidity
uint daysDiff = ((block.timestamp - lastUpdated) / 60) / 60 / 24;
if (daysDiff < 1) revert YearNotPassed();  // ❌ Only checks 1 day!
```

**Impact:** Treasury can be withdrawn EVERY DAY instead of annually. Only needs to wait ~86400 seconds. Should be:

```solidity
if (daysDiff < 365) revert YearNotPassed();
```

---

## HIGH Issues

### 3. No Validation of _userAddress in updateUser() (Core.sol:327)

```solidity
function updateUser(
    address _userAddress,
    uint _matrixIndex,
    uint _field,
    UserGlobal calldata _tmpUser
) external {
    if (!isMatrix(msg.sender)) revert MatrixAccessDenied();
    // No check: is _userAddress registered?
    AddressesGlobal[_userAddress].gifts += levelPayUnit;  // Updates any address
}
```

**Impact:** While protected by access control (only MatrixTemplate calls this), there's no internal validation. If MatrixTemplate is compromised, gifts/claims could be added to arbitrary addresses.

---

### 4. Redundant/Dead Code Logic (Core.sol:130-140)

```solidity
if (!AddressesGlobal[_whose].isValue) revert WhoseUserNotRegistered();  // Line 131

// ... then later:
if (AddressesGlobal[_whose].isValue) {  // Line 135 - always true!
    whoseAddr = _whose;
} else {  // Line 137 - unreachable
    whoseAddr = zeroWallet;
}
```

The `else` block is dead code.

---

## MEDIUM Issues

### 5. Uninitialized User in updateUser (Core.sol:348-356)

In field 2 case:

```solidity
address whose = AddressesGlobal[_userAddress].whose;
AddressesGlobal[whose].claims = ...
```

No check that `whose` is not address(0). If `_userAddress` hasn't been properly initialized, `whose` could be zero address.

---

### 6. MatrixTemplate.getUserAddressByIndex() - No Bounds Check

```solidity
function getUserAddressByIndex(uint _index) view public returns(address) {
    return Indices[_index];  // Returns address(0) for unset indices
}
```

Not necessarily a bug, but caller must handle address(0) case.

---

### 7. Year Calculation Error (Core.sol:398)

```solidity
uint daysDiff = ((block.timestamp - lastUpdated) / 60) / 60 / 24;
```

This truncates due to integer division. Better to check seconds directly:

```solidity
if (block.timestamp - lastUpdated < 365 days) revert YearNotPassed();
```

---

## LOW Issues

### 8. Complex Assembly log2() (MatrixTemplate.sol:199-228)

The log2 calculation uses raw assembly with magic numbers. Hard to audit, recommend testing edge cases thoroughly.

---

## Summary Table

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Constructor count bug | **CRITICAL** | Core.sol:85 | User count corrupted |
| Annual withdrawal time lock | **CRITICAL** | Core.sol:399 | 365-day check broken (allows daily withdrawal) |
| No _userAddress validation | **HIGH** | Core.sol:327 | Potential state corruption |
| Uninitialized whose pointer | **MEDIUM** | Core.sol:348-356 | Possible zero-address operations |
| Dead code logic | **LOW** | Core.sol:130-140 | Code clarity issue |

---

## Recommendations

1. **FIX IMMEDIATELY** - The two CRITICAL issues before any deployment
2. Fix the HIGH issue by adding user existence validation
3. Remove dead code path in register()
4. Improve time calculation logic with Solidity time units
