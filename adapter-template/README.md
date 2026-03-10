# ImpactVault Adapter Template

Scaffold for creating new yield source adapters.

## Quick Start

1. Copy this directory: `cp -r adapter-template my-protocol-adapter`
2. Update `Cargo.toml` with your adapter name
3. Implement the `YieldAdapter` trait methods in `src/lib.rs`
4. Test: `cargo test`

## YieldAdapter Trait

Each adapter must implement:

| Method | Purpose |
|--------|---------|
| `name()` | Unique identifier for this adapter |
| `risk_position()` | Where on the risk spectrum (Sovereign, StablecoinSavings) |
| `deposit(amount)` | Generate unsigned deposit transaction |
| `withdraw(amount)` | Generate unsigned withdrawal transaction |
| `current_yield_apy()` | Current annualised yield percentage |
| `health_check()` | Protocol health assessment |
| `tvl()` | Total value locked in this adapter |

## Health Check Guidelines

Your `health_check()` should assess:
- Oracle freshness (is price data current?)
- Liquidity adequacy (can withdrawals be processed?)
- Utilisation rate (how much capacity is in use?)
- Protocol-specific risk indicators

Return a `HealthStatus` with `score` between 0.0 (critical) and 1.0 (healthy).

## Testing

Write tests that verify:
- Correct metadata (name, risk_position)
- Valid transaction encoding (deposit/withdraw)
- Health check returns sensible values
- Edge cases (zero amounts, error conditions)
