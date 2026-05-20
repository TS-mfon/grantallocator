# Arc Treasury Rail

This folder contains the Arc testnet USDC payout rail for milestone-based grant releases.

`GrantTreasury.sol` is intentionally owner-operated:

- GenLayer approves grant applications and milestone releases.
- Arc executes the actual `$USDC` transfer.
- The owner registers each tranche from the approved GenLayer schedule.
- The owner pays the tranche and records the payout reference used by the frontend and GenLayer history.

Expected deployment inputs:

- `USDC_TOKEN_ADDRESS`
- `ARC_TREASURY_OWNER`
- optional multisig owner for production-like control
