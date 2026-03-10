# ImpactVault

Open-source risk-curated yield infrastructure for social impact organisations.

ImpactVault deploys and manages risk-curated yield vaults configured as sustainable funding engines for social impact programmes. Donors or organisations deposit crypto assets. The engine generates yield across a configurable risk spectrum. Yield gets automatically streamed to designated impact programmes. Principal stays untouched.

## Architecture

```
src/
├── domain/
│   ├── engine.rs      Core risk engine (types, evaluation, allocation, derisking)
│   ├── adapters/      Yield source adapters (trait + implementations)
│   └── sentinel.rs    Monitoring loop with auto-derisk
├── gateway/
│   ├── server.rs      MCP tool server
│   ├── router.rs      Tool routing
│   └── api.rs         REST API
├── orchestration/
│   ├── enforcer.rs    Risk rule engine
│   ├── lineage.rs     Audit trail
│   └── patterns.rs    Risk pattern discovery
└── store/
    └── state.rs       SQLite state management

contracts/
├── src/
│   ├── ImpactVault.sol     ERC-4626 vault with whitelisting + timelock
│   ├── YieldSplitter.sol   Yield distribution to impact recipients
│   └── mocks/
│       └── MockRWAVault.sol  Testnet sovereign bond simulation
└── test/
```

## Prerequisites

- Rust 1.80+
- Foundry (forge, cast, anvil)

## Build

```bash
# Rust
cargo build

# Contracts
cd contracts && forge build
```

## Test

```bash
# Rust tests
cargo test

# Solidity tests
cd contracts && forge test
```

## Configure

Copy and edit the example config:

```bash
cp config.toml.example config.toml
```

Key sections:
- `[vault]` — approved yield sources, concentration limits, derisking thresholds
- `[[adapters]]` — yield source adapter configurations
- `[sentinel]` — monitoring interval and auto-derisk toggle
- `[api]` — REST API port

## Run

```bash
# Initialize data directory
./target/release/impactvault init

# Start MCP server (for Claude Code integration)
./target/release/impactvault serve
```

## Adapters

ImpactVault ships with two adapters:

| Adapter | Yield Source | Risk Position |
|---------|-------------|---------------|
| Sovereign Bond | Tokenised government bonds (MockRWAVault on testnet) | Sovereign (safest) |
| Aave Savings | Aave V3 lending pool | StablecoinSavings |

To create a new adapter, see `adapter-template/`.

## Smart Contracts

| Contract | Purpose | Chain |
|----------|---------|-------|
| ImpactVault.sol | ERC-4626 vault with whitelisting and timelock | Sepolia |
| YieldSplitter.sol | Distributes yield to impact recipients | Sepolia |
| MockRWAVault.sol | Simulates sovereign bond yields on testnet | Sepolia |

## License

MIT
