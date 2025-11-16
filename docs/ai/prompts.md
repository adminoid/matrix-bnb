# Fix double registration on the same matrix with the same counter

We have two solidity contracts source files:
- `contracts/MatrixTemplate.sol`
- `contracts/Core.sol`

We have test in `test/Core.js` named `test 6` that starts with line 1551 and ends with the file end.

We have local hardhat node in that ran test. Output of this node in file `private/logs/node.txt`, in both *.sol files exists console.log() commands that represents in that log.

You should deeply analyze the following and make conclusion.

Transaction where registered wallet with `i == 27` has issue.
Why in test loop: `for (let i = 7; i <= 29; i++) {` wallet with index 27 registered in contract MatrixTemplate with `matrixIndex == 2` registered with `IndicesTotal == 27` then wallet with `i == 5` registered in same contract with same `IndicesTotal == 27` value, although in each wallet registration in this contract `IndicesTotal` should be incremented.

My thoughts: 
1) there is error in contract and some registration not increments as `IndicesTotal` value as it should. 
2) maybe storage variable `IndicesTotal` saved only after whole transaction and because of it throughout transaction `IndicesTotal` value is not updates.

Write whole analysis and your conclusions in file `docs/ai/id27-analysis.md` very detailed. We should save all information between your sessions in that file.

# Splitting `Core.sol` contract (finally not needed)

Now there is an error `ProviderError: tx size is too large` for deploying contract to testnet. 
I think so code of Core.sol contract is overflow max contract size limit.
Can you split Core.sol to two contracts to bypass the restriction?
What do you think? Can you propose a solutions, some ways how we can split Core contract to two?
It can help, there discussed the same problem:
https://forum.soliditylang.org/t/mechanism-to-split-large-contracts/91

# ProviderError: tx size is too large

We have a huge contract `contracts/Core.sol` that is causes an error: `ProviderError: tx size is too large`.
Can you analyze it and propose some ways to fix this?

# getTenPercentOnceYear

Recently I tested getTenPercentOnceYear (GTPO) method calling for testnet binance smart chain network (tbsc network) and found a strange issue:
before calling GTPO on contract address balance was 0.0845 tbnb (testnet bnb). After calling GTPO to id0 wallet come 0.0184 (21,7% of a previous contract balance). After withdrawing (calling GTPO) on contract balance left 0.07605.
0.0184 + 0.07605=0.09445, this seems like a fucking mess... Can you explain to me what is happened?

