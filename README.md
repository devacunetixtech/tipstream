# TipStream

**Stream appreciation, one block at a time.**

TipStream is a programmable native-BOT payment streaming MVP for BOT Chain. A sender escrows BOT for a fixed duration, value unlocks linearly each second, the recipient can withdraw vested funds, and the sender can cancel an unfinished stream to recover the unvested balance.

## Stack

- Next.js, React, and TypeScript
- wagmi + viem for wallet and contract interactions
- Solidity 0.8.28 and Foundry
- BOT Chain mainnet (chain ID `677`)

## Local setup

Requirements: Node.js 20+ and [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
npm install
cp .env.example .env.local
npm run contracts:test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public landing page is available to everyone; `/app` requires a connected wallet on BOT Chain mainnet. There are no mock records or simulated transactions.

## Contract behavior

`contracts/src/TipStream.sol` accepts native BOT with `createStream(recipient, duration)`. Durations must be between one minute and 365 days. Vesting is calculated as:

```text
vested = deposit × elapsedSeconds ÷ durationSeconds
```

The contract follows checks-effects-interactions and protects value-moving methods from reentrancy. Cancellation freezes vesting at the cancellation timestamp, immediately refunds the sender's unvested BOT, and leaves the vested remainder available to the recipient.

## Test and deploy

Run the full contract suite:

```bash
npm run contracts:build
npm run contracts:test
```

The tests cover creation, boundary and midpoint calculations, incremental withdrawal, cancellation/refunds, rounding, authorization, and invalid parameters.

### GitHub Actions deployment (recommended)

Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `PRIVATE_KEY` — the funded deployer wallet private key, with or without the `0x` prefix
- `BLOCKSCOUT_API_KEY` — the API key used to verify on BOTScan

Then open **Actions → Deploy TipStream to BOT Chain Mainnet → Run workflow**. The workflow tests the contract, confirms that the RPC reports chain ID `677`, deploys, verifies through Blockscout, and writes the deployed address and explorer link to the workflow summary.

If deployment succeeds but verification needs to be retried, run **Verify TipStream on BOT Chain Mainnet** and enter the deployed contract address. This does not redeploy the contract.

### Local deployment

To deploy and verify locally:

```bash
export BOTCHAIN_RPC_URL=https://rpc.botchain.ai
export BOTCHAIN_VERIFIER_URL=https://scan.botchain.ai/api/
export PRIVATE_KEY=<private-key-as-hex-or-integer>
export BLOCKSCOUT_API_KEY=<blockscout-api-key>

cd contracts
forge script script/DeployBotchain.s.sol:DeployBotchain \
  --rpc-url "$BOTCHAIN_RPC_URL" \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url "$BOTCHAIN_VERIFIER_URL" \
  --verifier-api-key "$BLOCKSCOUT_API_KEY" \
  --slow
```

Copy the deployed address into `.env.local`:

```bash
NEXT_PUBLIC_TIPSTREAM_ADDRESS=0xYourDeployedAddress
```

Set the same variable in the hosting environment and redeploy the frontend. Restart the Next.js development server after changing public environment variables.

### Optional contract verification

BOT Chain uses a Blockscout-compatible verifier. Set the verifier URL supplied by BOT Chain, then run:

```bash
forge verify-contract <deployed-address> src/TipStream.sol:TipStream \
  --rpc-url "$BOTCHAIN_RPC_URL" \
  --verifier blockscout \
  --verifier-url "$BOTCHAIN_VERIFIER_URL" \
  --verifier-api-key "$BLOCKSCOUT_API_KEY"
```

## Environment variables

| Variable | Used by | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_TIPSTREAM_ADDRESS` | Web app | Deployed TipStream address on chain 677 |
| `NEXT_PUBLIC_SITE_URL` | Web app | Canonical public URL used for social metadata |
| `BOTCHAIN_RPC_URL` | Foundry | Mainnet RPC: `https://rpc.botchain.ai` |
| `PRIVATE_KEY` | Foundry | Deployment key; never expose it to the browser or commit it |
| `BLOCKSCOUT_API_KEY` | Foundry | API key supplied to the Blockscout verifier |
| `BOTCHAIN_VERIFIER_URL` | Foundry | Blockscout API URL used for verification |

## Network

| Setting | BOT Chain mainnet |
| --- | --- |
| Chain ID | `677` |
| Native token | `BOT` |
| RPC | `https://rpc.botchain.ai` |
| Explorer | `https://scan.botchain.ai` |

Only the integration parameters above were taken from the supplied BOT Chain integration guide; product behavior and implementation are defined by this project.
