# Grant Allocator Deployment

This upgrade introduces a split deployment:

- **GenLayer Studionet** for AI screening, committee governance, milestone state
- **Arc testnet** for USDC treasury payout execution

## Expected Environment

Source credentials from:

```bash
source /home/sudodave/buildenv/.env
```

Required values to add if missing:

- `GENLAYER_ACCOUNT_NAME`
- `VITE_GRANT_ALLOCATOR_ADDRESS`
- `VITE_ARC_TREASURY_ADDRESS`
- `VITE_ARC_USDC_TOKEN_ADDRESS`
- `VITE_CRYPTORANK_PROXY_URL`
- `VITE_TEAM_DD_PROXY_URL`
- Arc deployer private key / RPC values used by your Arc deployment toolchain

## GenLayer Contract Deploy

```bash
genlayer network set studionet
genlayer account use "$GENLAYER_ACCOUNT_NAME"
genlayer deploy \
  --contract contract.py \
  --args \
  "Fund high-impact web3 public goods." \
  72 \
  2 \
  72 \
  100000000 \
  "$VITE_ARC_TREASURY_ADDRESS" \
  "$VITE_ARC_USDC_TOKEN_ADDRESS"
```

After deployment, update:

```bash
export VITE_GRANT_ALLOCATOR_ADDRESS=<new_genlayer_contract_address>
```

## Arc Treasury Deploy

Deploy [arc/contracts/GrantTreasury.sol](/home/sudodave/grantallocator/arc/contracts/GrantTreasury.sol) with your Arc testnet EVM workflow, passing the USDC token address to the constructor.

After deployment, update:

```bash
export VITE_ARC_TREASURY_ADDRESS=<new_arc_treasury_contract_address>
```

## Frontend Build

```bash
npm install
npm run build
```
