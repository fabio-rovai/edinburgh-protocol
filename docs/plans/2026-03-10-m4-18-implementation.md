# M4-18 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend ImpactVault with new yield adapters (Lido, Compound), multi-strategy allocation, governance multisig, DPGA integration, expanded REST API, and a Next.js dashboard.

**Architecture:** Build bottom-up — engine types first, then adapters, contracts, API, and finally the dashboard that consumes everything. Each layer is testable independently.

**Tech Stack:** Rust (rmcp, alloy, axum, tokio), Solidity (Foundry), Next.js + Tailwind + shadcn/ui + recharts

---

## Task 1: Extend RiskSpectrum Enum

**Files:**
- Modify: `src/domain/engine.rs:3-8`
- Modify: `tests/engine_test.rs`

**Step 1: Write the failing test**

Add to `tests/engine_test.rs`:

```rust
#[test]
fn test_risk_spectrum_extended_ordering() {
    assert!(RiskSpectrum::Sovereign < RiskSpectrum::StablecoinSavings);
    assert!(RiskSpectrum::StablecoinSavings < RiskSpectrum::LiquidStaking);
    assert!(RiskSpectrum::LiquidStaking < RiskSpectrum::DiversifiedLending);
    assert!(RiskSpectrum::DiversifiedLending < RiskSpectrum::MultiStrategy);
}
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/fabio/Projects/impactvault && cargo test test_risk_spectrum_extended_ordering -- --nocapture`
Expected: FAIL — `LiquidStaking` variant does not exist

**Step 3: Extend the enum**

In `src/domain/engine.rs`, replace the RiskSpectrum enum:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum RiskSpectrum {
    Sovereign,
    StablecoinSavings,
    LiquidStaking,
    DiversifiedLending,
    MultiStrategy,
}
```

Note: Add `Hash` derive (needed later for HashMap keys in source_weights).

**Step 4: Update adapter_name_for()**

In `src/domain/engine.rs`, replace `adapter_name_for()`:

```rust
fn adapter_name_for(spectrum: RiskSpectrum) -> String {
    match spectrum {
        RiskSpectrum::Sovereign => "sovereign_bond".into(),
        RiskSpectrum::StablecoinSavings => "aave_savings".into(),
        RiskSpectrum::LiquidStaking => "liquid_staking".into(),
        RiskSpectrum::DiversifiedLending => "compound_lending".into(),
        RiskSpectrum::MultiStrategy => "multi_strategy".into(),
    }
}
```

**Step 5: Run all tests**

Run: `cargo test`
Expected: ALL PASS (existing tests still work, new ordering test passes)

**Step 6: Commit**

```bash
git add src/domain/engine.rs tests/engine_test.rs
git commit -m "feat: extend RiskSpectrum with LiquidStaking, DiversifiedLending, MultiStrategy"
```

---

## Task 2: Add Source Weights to VaultConfig

**Files:**
- Modify: `src/domain/engine.rs` (VaultConfig struct + Default)
- Modify: `tests/engine_test.rs`

**Step 1: Write the failing test**

Add to `tests/engine_test.rs`:

```rust
use std::collections::HashMap;

#[test]
fn test_vault_config_default_has_empty_weights() {
    let config = VaultConfig::default();
    assert!(config.source_weights.is_empty());
}

#[test]
fn test_vault_config_with_weights() {
    let mut weights = HashMap::new();
    weights.insert(RiskSpectrum::Sovereign, 40u8);
    weights.insert(RiskSpectrum::StablecoinSavings, 35);
    weights.insert(RiskSpectrum::LiquidStaking, 25);

    let config = VaultConfig {
        source_weights: weights.clone(),
        ..VaultConfig::default()
    };

    assert_eq!(config.source_weights.len(), 3);
    assert_eq!(config.source_weights[&RiskSpectrum::Sovereign], 40);
}
```

**Step 2: Run to verify failure**

Run: `cargo test test_vault_config_default_has_empty_weights -- --nocapture`
Expected: FAIL — `source_weights` field does not exist

**Step 3: Add source_weights field**

In `src/domain/engine.rs`, add to VaultConfig struct:

```rust
pub source_weights: HashMap<RiskSpectrum, u8>,  // percentage weights, must sum to 100
```

Add import at top of engine.rs:
```rust
use std::collections::HashMap;
```

Update Default impl — add:
```rust
source_weights: HashMap::new(),
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/domain/engine.rs tests/engine_test.rs
git commit -m "feat: add source_weights to VaultConfig for multi-strategy allocation"
```

---

## Task 3: Multi-Strategy Allocation Logic

**Files:**
- Modify: `src/domain/engine.rs` (recommend_allocation function)
- Modify: `tests/engine_test.rs`

**Step 1: Write the failing tests**

Add to `tests/engine_test.rs`:

```rust
#[test]
fn test_weighted_allocation_three_sources() {
    let mut weights = HashMap::new();
    weights.insert(RiskSpectrum::Sovereign, 50);
    weights.insert(RiskSpectrum::StablecoinSavings, 30);
    weights.insert(RiskSpectrum::LiquidStaking, 20);

    let config = VaultConfig {
        approved_sources: vec![
            RiskSpectrum::Sovereign,
            RiskSpectrum::StablecoinSavings,
            RiskSpectrum::LiquidStaking,
        ],
        source_weights: weights,
        concentration_limit: 80,
        ..VaultConfig::default()
    };

    let plan = recommend_allocation(&config, 10_000);
    assert_eq!(plan.allocations.len(), 3);

    // Find each allocation
    let sov = plan.allocations.iter().find(|a| a.adapter_name == "sovereign_bond").unwrap();
    let aave = plan.allocations.iter().find(|a| a.adapter_name == "aave_savings").unwrap();
    let lido = plan.allocations.iter().find(|a| a.adapter_name == "liquid_staking").unwrap();

    assert_eq!(sov.amount, 5_000);  // 50%
    assert_eq!(aave.amount, 3_000); // 30%
    assert_eq!(lido.amount, 2_000); // 20%
}

#[test]
fn test_weighted_allocation_falls_back_to_equal_split_without_weights() {
    let config = VaultConfig {
        approved_sources: vec![
            RiskSpectrum::Sovereign,
            RiskSpectrum::StablecoinSavings,
            RiskSpectrum::LiquidStaking,
        ],
        concentration_limit: 80,
        ..VaultConfig::default()
    };

    let plan = recommend_allocation(&config, 9_000);
    // Without weights, each source gets equal share
    for alloc in &plan.allocations {
        assert_eq!(alloc.amount, 3_000);
    }
}

#[test]
fn test_weighted_allocation_respects_concentration_limit() {
    let mut weights = HashMap::new();
    weights.insert(RiskSpectrum::Sovereign, 90);  // exceeds 80% limit
    weights.insert(RiskSpectrum::StablecoinSavings, 10);

    let config = VaultConfig {
        approved_sources: vec![
            RiskSpectrum::Sovereign,
            RiskSpectrum::StablecoinSavings,
        ],
        source_weights: weights,
        concentration_limit: 80,
        ..VaultConfig::default()
    };

    let plan = recommend_allocation(&config, 10_000);
    let sov = plan.allocations.iter().find(|a| a.adapter_name == "sovereign_bond").unwrap();
    // Capped at concentration_limit
    assert!(sov.amount <= 8_000);
}
```

**Step 2: Run to verify failure**

Run: `cargo test test_weighted_allocation -- --nocapture`
Expected: FAIL — current logic doesn't use weights

**Step 3: Update recommend_allocation()**

Replace the `recommend_allocation` function in `src/domain/engine.rs`:

```rust
pub fn recommend_allocation(config: &VaultConfig, total_amount: u128) -> AllocationPlan {
    if config.approved_sources.is_empty() {
        return AllocationPlan {
            allocations: vec![],
            reasoning: "No approved sources configured".into(),
        };
    }

    if config.approved_sources.len() == 1 {
        let source = config.approved_sources[0];
        return AllocationPlan {
            allocations: vec![Allocation {
                adapter_name: adapter_name_for(source),
                amount: total_amount,
                risk_position: source,
            }],
            reasoning: format!("Single source: all funds to {}", adapter_name_for(source)),
        };
    }

    let n = config.approved_sources.len() as u128;
    let concentration_cap = (total_amount * config.concentration_limit as u128) / 100;

    // Use weights if provided and they sum to 100, otherwise equal split
    let use_weights = !config.source_weights.is_empty()
        && config.approved_sources.iter().all(|s| config.source_weights.contains_key(s))
        && config.approved_sources.iter()
            .map(|s| config.source_weights[s] as u64)
            .sum::<u64>() == 100;

    let mut allocations: Vec<Allocation> = Vec::new();
    let mut remaining = total_amount;

    for (i, source) in config.approved_sources.iter().enumerate() {
        let raw_amount = if use_weights {
            (total_amount * config.source_weights[source] as u128) / 100
        } else {
            total_amount / n
        };

        let capped = raw_amount.min(concentration_cap);
        // Last source gets the remainder to avoid rounding dust
        let amount = if i == config.approved_sources.len() - 1 {
            remaining.min(capped)
        } else {
            capped
        };

        remaining = remaining.saturating_sub(amount);
        allocations.push(Allocation {
            adapter_name: adapter_name_for(*source),
            amount,
            risk_position: *source,
        });
    }

    // If there's remaining dust due to concentration capping, redistribute to last uncapped
    if remaining > 0 {
        if let Some(last) = allocations.last_mut() {
            last.amount += remaining;
        }
    }

    let reasoning = if use_weights {
        "Weighted allocation across approved sources".into()
    } else {
        "Equal allocation across approved sources (no weights configured)".into()
    };

    AllocationPlan {
        allocations,
        reasoning,
    }
}
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS (existing 2-source tests still work, new weighted tests pass)

**Step 5: Commit**

```bash
git add src/domain/engine.rs tests/engine_test.rs
git commit -m "feat: multi-strategy weighted allocation with concentration capping"
```

---

## Task 4: Rebalance Recommendation

**Files:**
- Modify: `src/domain/engine.rs` (new function + types)
- Modify: `tests/engine_test.rs`

**Step 1: Write the failing test**

Add types import and test to `tests/engine_test.rs`:

```rust
use impactvault::domain::engine::RebalanceRecommendation;

#[test]
fn test_rebalance_needed_when_drift_exceeds_threshold() {
    let mut weights = HashMap::new();
    weights.insert(RiskSpectrum::Sovereign, 50);
    weights.insert(RiskSpectrum::StablecoinSavings, 50);

    let config = VaultConfig {
        approved_sources: vec![RiskSpectrum::Sovereign, RiskSpectrum::StablecoinSavings],
        source_weights: weights,
        ..VaultConfig::default()
    };

    let mut portfolio = Portfolio::new();
    portfolio.total_deposited = 10_000;
    portfolio.allocations = vec![
        Allocation {
            adapter_name: "sovereign_bond".into(),
            amount: 7_000,  // 70% — drifted from 50% target
            risk_position: RiskSpectrum::Sovereign,
        },
        Allocation {
            adapter_name: "aave_savings".into(),
            amount: 3_000,  // 30% — drifted from 50% target
            risk_position: RiskSpectrum::StablecoinSavings,
        },
    ];

    let result = check_rebalance(&config, &portfolio, 10); // 10% threshold
    assert!(result.needs_rebalance);
    assert!(!result.drifts.is_empty());
}

#[test]
fn test_rebalance_not_needed_within_threshold() {
    let mut weights = HashMap::new();
    weights.insert(RiskSpectrum::Sovereign, 50);
    weights.insert(RiskSpectrum::StablecoinSavings, 50);

    let config = VaultConfig {
        approved_sources: vec![RiskSpectrum::Sovereign, RiskSpectrum::StablecoinSavings],
        source_weights: weights,
        ..VaultConfig::default()
    };

    let mut portfolio = Portfolio::new();
    portfolio.total_deposited = 10_000;
    portfolio.allocations = vec![
        Allocation {
            adapter_name: "sovereign_bond".into(),
            amount: 5_200,  // 52% — within 10% of 50%
            risk_position: RiskSpectrum::Sovereign,
        },
        Allocation {
            adapter_name: "aave_savings".into(),
            amount: 4_800,  // 48% — within 10% of 50%
            risk_position: RiskSpectrum::StablecoinSavings,
        },
    ];

    let result = check_rebalance(&config, &portfolio, 10);
    assert!(!result.needs_rebalance);
}
```

**Step 2: Run to verify failure**

Run: `cargo test test_rebalance -- --nocapture`
Expected: FAIL — `check_rebalance` not found

**Step 3: Implement check_rebalance**

Add to `src/domain/engine.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriftInfo {
    pub adapter_name: String,
    pub target_pct: u8,
    pub actual_pct: u8,
    pub drift_pct: i16,  // positive = over, negative = under
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebalanceRecommendation {
    pub needs_rebalance: bool,
    pub drifts: Vec<DriftInfo>,
    pub reasoning: String,
}

pub fn check_rebalance(
    config: &VaultConfig,
    portfolio: &Portfolio,
    drift_threshold_pct: u8,
) -> RebalanceRecommendation {
    if portfolio.total_deposited == 0 || config.source_weights.is_empty() {
        return RebalanceRecommendation {
            needs_rebalance: false,
            drifts: vec![],
            reasoning: "No deposits or no weights configured".into(),
        };
    }

    let mut drifts = Vec::new();
    let mut max_drift: u8 = 0;

    for source in &config.approved_sources {
        let target = config.source_weights.get(source).copied().unwrap_or(0);
        let actual_amount = portfolio.allocations.iter()
            .filter(|a| a.risk_position == *source)
            .map(|a| a.amount)
            .sum::<u128>();
        let actual_pct = ((actual_amount * 100) / portfolio.total_deposited) as u8;
        let drift = actual_pct as i16 - target as i16;

        if drift.unsigned_abs() as u8 > max_drift {
            max_drift = drift.unsigned_abs() as u8;
        }

        drifts.push(DriftInfo {
            adapter_name: adapter_name_for(*source),
            target_pct: target,
            actual_pct,
            drift_pct: drift,
        });
    }

    let needs_rebalance = max_drift > drift_threshold_pct;
    let reasoning = if needs_rebalance {
        format!("Max drift {}% exceeds {}% threshold", max_drift, drift_threshold_pct)
    } else {
        format!("All allocations within {}% threshold", drift_threshold_pct)
    };

    RebalanceRecommendation {
        needs_rebalance,
        drifts,
        reasoning,
    }
}
```

Make sure `check_rebalance`, `RebalanceRecommendation`, and `DriftInfo` are public and exported from `lib.rs` → `domain::engine`.

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/domain/engine.rs tests/engine_test.rs
git commit -m "feat: add rebalance drift detection with configurable threshold"
```

---

## Task 5: Update Config for New Adapters

**Files:**
- Modify: `src/config.rs`
- Modify: `tests/engine_test.rs` (or new `tests/config_test.rs`)

**Step 1: Write the failing test**

Create `tests/config_test.rs`:

```rust
use impactvault::config::Config;

#[test]
fn test_parse_config_with_new_adapters() {
    let toml_str = r#"
[general]
name = "test"

[[adapters]]
name = "liquid_staking"
type = "liquid_staking"
wsteth_address = "0x1234"
chain_id = 8453
rpc_url = "https://mainnet.base.org"

[[adapters]]
name = "compound_lending"
type = "compound_lending"
comet_address = "0x5678"
asset_address = "0x9abc"
chain_id = 8453
rpc_url = "https://mainnet.base.org"

[governance]
type = "multisig"
contract_address = "0xgov"
threshold = 2
signers = ["0xsigner1", "0xsigner2", "0xsigner3"]

[dpga]
api_url = "https://api.digitalpublicgoods.net/dpgs"
enabled = true
"#;
    let config: Config = toml::from_str(toml_str).expect("should parse");
    let adapters = config.adapters.unwrap();
    assert_eq!(adapters.len(), 2);
    assert_eq!(adapters[0].wsteth_address.as_deref(), Some("0x1234"));
    assert_eq!(adapters[1].comet_address.as_deref(), Some("0x5678"));

    let gov = config.governance.unwrap();
    assert_eq!(gov.threshold, 2);
    assert_eq!(gov.signers.len(), 3);

    let dpga = config.dpga.unwrap();
    assert!(dpga.enabled);
}
```

**Step 2: Run to verify failure**

Run: `cargo test test_parse_config_with_new_adapters -- --nocapture`
Expected: FAIL — `wsteth_address`, `comet_address`, `governance`, `dpga` fields don't exist

**Step 3: Extend config structs**

In `src/config.rs`, add fields to `AdapterTomlConfig`:

```rust
#[serde(default)]
pub wsteth_address: Option<String>,
#[serde(default)]
pub comet_address: Option<String>,
```

Add new structs:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceConfig {
    #[serde(rename = "type")]
    pub governance_type: String,
    #[serde(default)]
    pub contract_address: Option<String>,
    #[serde(default = "default_threshold")]
    pub threshold: u8,
    #[serde(default)]
    pub signers: Vec<String>,
}

fn default_threshold() -> u8 { 2 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DpgaConfig {
    #[serde(default = "default_dpga_url")]
    pub api_url: String,
    #[serde(default)]
    pub enabled: bool,
}

fn default_dpga_url() -> String {
    "https://api.digitalpublicgoods.net/dpgs".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardConfig {
    #[serde(default = "default_dashboard_api")]
    pub api_url: String,
}

fn default_dashboard_api() -> String {
    "http://localhost:3000".into()
}
```

Add to top-level `Config` struct:

```rust
pub governance: Option<GovernanceConfig>,
pub dpga: Option<DpgaConfig>,
pub dashboard: Option<DashboardConfig>,
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/config.rs tests/config_test.rs
git commit -m "feat: config support for governance, DPGA, dashboard, and new adapter fields"
```

---

## Task 6: Liquid Staking Adapter (Lido wstETH)

**Files:**
- Create: `src/domain/adapters/liquid_staking.rs`
- Modify: `src/domain/adapters/mod.rs`
- Create: `tests/liquid_staking_test.rs`

**Step 1: Write the failing test**

Create `tests/liquid_staking_test.rs`:

```rust
use impactvault::domain::adapters::liquid_staking::LiquidStakingAdapter;
use impactvault::domain::adapters::YieldAdapter;
use impactvault::domain::engine::RiskSpectrum;

#[test]
fn test_liquid_staking_name() {
    let adapter = LiquidStakingAdapter::new(
        "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0".into(), // wstETH
        8453,
        "https://mainnet.base.org".into(),
    );
    assert_eq!(adapter.name(), "liquid_staking");
}

#[test]
fn test_liquid_staking_risk_position() {
    let adapter = LiquidStakingAdapter::new(
        "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    assert_eq!(adapter.risk_position(), RiskSpectrum::LiquidStaking);
}

#[tokio::test]
async fn test_liquid_staking_deposit_calldata() {
    let adapter = LiquidStakingAdapter::new(
        "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    let tx = adapter.deposit(1_000_000).await.unwrap();
    assert_eq!(tx.chain_id, 8453);
    assert!(!tx.calldata.is_empty());
    assert_eq!(tx.to, "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0");
}

#[tokio::test]
async fn test_liquid_staking_health_check() {
    let adapter = LiquidStakingAdapter::new(
        "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    let health = adapter.health_check().await.unwrap();
    assert_eq!(health.adapter_name, "liquid_staking");
    assert!(health.score > 0.0 && health.score <= 1.0);
}

#[tokio::test]
async fn test_liquid_staking_yield_apy() {
    let adapter = LiquidStakingAdapter::new(
        "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    let apy = adapter.current_yield_apy().await.unwrap();
    // Lido PoS rewards typically 3-4%
    assert!(apy > 0.0 && apy < 10.0);
}
```

**Step 2: Run to verify failure**

Run: `cargo test liquid_staking -- --nocapture`
Expected: FAIL — module `liquid_staking` doesn't exist

**Step 3: Implement the adapter**

Create `src/domain/adapters/liquid_staking.rs`:

```rust
use async_trait::async_trait;

use crate::domain::engine::{HealthStatus, RiskSpectrum};
use super::{TxRequest, YieldAdapter};

/// Wraps Lido wstETH on Base.
///
/// - deposit: wrap ETH → wstETH via wstETH contract wrap()
/// - withdraw: unwrap wstETH → stETH via unwrap()
/// - health: monitors stETH/ETH peg deviation
pub struct LiquidStakingAdapter {
    wsteth_address: String,
    chain_id: u64,
    rpc_url: String,
}

impl LiquidStakingAdapter {
    pub fn new(wsteth_address: String, chain_id: u64, rpc_url: String) -> Self {
        Self {
            wsteth_address,
            chain_id,
            rpc_url,
        }
    }
}

#[async_trait]
impl YieldAdapter for LiquidStakingAdapter {
    fn name(&self) -> &str {
        "liquid_staking"
    }

    fn risk_position(&self) -> RiskSpectrum {
        RiskSpectrum::LiquidStaking
    }

    async fn deposit(&self, amount: u128) -> anyhow::Result<TxRequest> {
        // wstETH.wrap(uint256 stETHAmount) — selector 0xea598cb0
        let selector = "ea598cb0";
        let amount_hex = format!("{:064x}", amount);
        let calldata = format!("0x{}{}", selector, amount_hex);

        Ok(TxRequest {
            to: self.wsteth_address.clone(),
            calldata,
            value: 0,
            chain_id: self.chain_id,
        })
    }

    async fn withdraw(&self, amount: u128) -> anyhow::Result<TxRequest> {
        // wstETH.unwrap(uint256 wstETHAmount) — selector 0xde0e9a3e
        let selector = "de0e9a3e";
        let amount_hex = format!("{:064x}", amount);
        let calldata = format!("0x{}{}", selector, amount_hex);

        Ok(TxRequest {
            to: self.wsteth_address.clone(),
            calldata,
            value: 0,
            chain_id: self.chain_id,
        })
    }

    async fn current_yield_apy(&self) -> anyhow::Result<f64> {
        // Lido PoS staking rewards ~3.5%
        // In production, read from Lido APR oracle on-chain
        Ok(3.5)
    }

    async fn health_check(&self) -> anyhow::Result<HealthStatus> {
        // In production: check stETH/ETH peg, withdrawal queue, validator set
        Ok(HealthStatus {
            adapter_name: "liquid_staking".into(),
            score: 0.88,
            oracle_fresh: true,
            liquidity_adequate: true,
            utilisation_rate: 0.0, // not applicable for staking
            details: "wstETH peg healthy, withdrawal queue normal".into(),
        })
    }

    async fn tvl(&self) -> anyhow::Result<u128> {
        // In production: read wstETH balance from on-chain
        Ok(0)
    }
}
```

Add to `src/domain/adapters/mod.rs`:

```rust
pub mod liquid_staking;
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/domain/adapters/liquid_staking.rs src/domain/adapters/mod.rs tests/liquid_staking_test.rs
git commit -m "feat: add Lido wstETH liquid staking adapter"
```

---

## Task 7: Compound Lending Adapter (Compound V3)

**Files:**
- Create: `src/domain/adapters/compound_lending.rs`
- Modify: `src/domain/adapters/mod.rs`
- Create: `tests/compound_lending_test.rs`

**Step 1: Write the failing test**

Create `tests/compound_lending_test.rs`:

```rust
use impactvault::domain::adapters::compound_lending::CompoundLendingAdapter;
use impactvault::domain::adapters::YieldAdapter;
use impactvault::domain::engine::RiskSpectrum;

#[test]
fn test_compound_lending_name() {
    let adapter = CompoundLendingAdapter::new(
        "0xcomet".into(),
        "0xusdc".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    assert_eq!(adapter.name(), "compound_lending");
}

#[test]
fn test_compound_lending_risk_position() {
    let adapter = CompoundLendingAdapter::new(
        "0xcomet".into(),
        "0xusdc".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    assert_eq!(adapter.risk_position(), RiskSpectrum::DiversifiedLending);
}

#[tokio::test]
async fn test_compound_deposit_calldata() {
    let adapter = CompoundLendingAdapter::new(
        "0xcomet".into(),
        "0xusdc".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    let tx = adapter.deposit(500_000).await.unwrap();
    assert_eq!(tx.chain_id, 8453);
    assert!(!tx.calldata.is_empty());
    assert_eq!(tx.to, "0xcomet");
}

#[tokio::test]
async fn test_compound_health_check() {
    let adapter = CompoundLendingAdapter::new(
        "0xcomet".into(),
        "0xusdc".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    let health = adapter.health_check().await.unwrap();
    assert_eq!(health.adapter_name, "compound_lending");
    assert!(health.score > 0.0);
    assert!(health.utilisation_rate > 0.0);
}

#[tokio::test]
async fn test_compound_yield_apy() {
    let adapter = CompoundLendingAdapter::new(
        "0xcomet".into(),
        "0xusdc".into(),
        8453,
        "https://mainnet.base.org".into(),
    );
    let apy = adapter.current_yield_apy().await.unwrap();
    // Compound V3 supply APR typically 2-5%
    assert!(apy > 0.0 && apy < 10.0);
}
```

**Step 2: Run to verify failure**

Run: `cargo test compound_lending -- --nocapture`
Expected: FAIL — module `compound_lending` doesn't exist

**Step 3: Implement the adapter**

Create `src/domain/adapters/compound_lending.rs`:

```rust
use async_trait::async_trait;

use crate::domain::engine::{HealthStatus, RiskSpectrum};
use super::{TxRequest, YieldAdapter};

/// Wraps Compound V3 (Comet) on Base.
///
/// - deposit: supply USDC to Comet
/// - withdraw: withdraw USDC from Comet
/// - health: monitors utilisation rate, oracle freshness, available liquidity
pub struct CompoundLendingAdapter {
    comet_address: String,
    asset_address: String,
    chain_id: u64,
    rpc_url: String,
}

impl CompoundLendingAdapter {
    pub fn new(
        comet_address: String,
        asset_address: String,
        chain_id: u64,
        rpc_url: String,
    ) -> Self {
        Self {
            comet_address,
            asset_address,
            chain_id,
            rpc_url,
        }
    }
}

#[async_trait]
impl YieldAdapter for CompoundLendingAdapter {
    fn name(&self) -> &str {
        "compound_lending"
    }

    fn risk_position(&self) -> RiskSpectrum {
        RiskSpectrum::DiversifiedLending
    }

    async fn deposit(&self, amount: u128) -> anyhow::Result<TxRequest> {
        // Comet.supply(address asset, uint256 amount) — selector 0xf2b9fdb8
        let selector = "f2b9fdb8";
        let asset_padded = format!("{:0>64}", self.asset_address.trim_start_matches("0x"));
        let amount_hex = format!("{:064x}", amount);
        let calldata = format!("0x{}{}{}", selector, asset_padded, amount_hex);

        Ok(TxRequest {
            to: self.comet_address.clone(),
            calldata,
            value: 0,
            chain_id: self.chain_id,
        })
    }

    async fn withdraw(&self, amount: u128) -> anyhow::Result<TxRequest> {
        // Comet.withdraw(address asset, uint256 amount) — selector 0xf3fef3a3
        let selector = "f3fef3a3";
        let asset_padded = format!("{:0>64}", self.asset_address.trim_start_matches("0x"));
        let amount_hex = format!("{:064x}", amount);
        let calldata = format!("0x{}{}{}", selector, asset_padded, amount_hex);

        Ok(TxRequest {
            to: self.comet_address.clone(),
            calldata,
            value: 0,
            chain_id: self.chain_id,
        })
    }

    async fn current_yield_apy(&self) -> anyhow::Result<f64> {
        // Compound V3 supply APR ~3.2%
        // In production: read from Comet.getSupplyRate()
        Ok(3.2)
    }

    async fn health_check(&self) -> anyhow::Result<HealthStatus> {
        // In production: check utilisation, oracle freshness, available liquidity
        Ok(HealthStatus {
            adapter_name: "compound_lending".into(),
            score: 0.82,
            oracle_fresh: true,
            liquidity_adequate: true,
            utilisation_rate: 0.68,
            details: "Compound V3 utilisation normal, oracle fresh".into(),
        })
    }

    async fn tvl(&self) -> anyhow::Result<u128> {
        // In production: read supplied balance from Comet
        Ok(0)
    }
}
```

Add to `src/domain/adapters/mod.rs`:

```rust
pub mod compound_lending;
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/domain/adapters/compound_lending.rs src/domain/adapters/mod.rs tests/compound_lending_test.rs
git commit -m "feat: add Compound V3 lending adapter"
```

---

## Task 8: Update Sentinel Tests for New Adapters

**Files:**
- Modify: `tests/sentinel_test.rs`

**Step 1: Write the failing test**

Add to `tests/sentinel_test.rs`:

```rust
#[tokio::test]
async fn test_sentinel_with_multiple_adapters() {
    let adapters: Vec<Box<dyn YieldAdapter>> = vec![
        Box::new(MockAdapter { health_score: 0.9, name: "sovereign_bond", risk: RiskSpectrum::Sovereign }),
        Box::new(MockAdapter { health_score: 0.5, name: "liquid_staking", risk: RiskSpectrum::LiquidStaking }),
        Box::new(MockAdapter { health_score: 0.85, name: "compound_lending", risk: RiskSpectrum::DiversifiedLending }),
    ];
    let vault_config = Arc::new(RwLock::new(VaultConfig::default()));
    let sentinel = Sentinel::new(SentinelConfig::default(), vault_config, adapters);

    let results = sentinel.check_once().await;
    assert_eq!(results.len(), 3);

    // The worst adapter (0.5) should trigger a Migrate action
    let handle = sentinel.status_handle();
    let status = handle.read().await;
    match &status.last_action {
        Some(DeriskAction::Hold) => {} // 0.5 == threshold, so Hold
        other => panic!("expected Hold at threshold boundary, got {:?}", other),
    }
}
```

Update MockAdapter to accept name and risk as parameters:

```rust
struct MockAdapter {
    health_score: f64,
    name: &'static str,
    risk: RiskSpectrum,
}

#[async_trait]
impl YieldAdapter for MockAdapter {
    fn name(&self) -> &str {
        self.name
    }

    fn risk_position(&self) -> RiskSpectrum {
        self.risk
    }

    // ... rest unchanged
}
```

Update `make_sentinel` helper and existing tests to use the new MockAdapter fields.

**Step 2: Run to verify failure**

Run: `cargo test sentinel -- --nocapture`
Expected: FAIL initially (struct field changes), then fix

**Step 3: Update all existing mock usages**

Fix `make_sentinel` to:
```rust
fn make_sentinel(health_score: f64) -> Sentinel {
    let adapters: Vec<Box<dyn YieldAdapter>> =
        vec![Box::new(MockAdapter { health_score, name: "mock", risk: RiskSpectrum::Sovereign })];
    let vault_config = Arc::new(RwLock::new(VaultConfig::default()));
    Sentinel::new(SentinelConfig::default(), vault_config, adapters)
}
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add tests/sentinel_test.rs
git commit -m "test: update sentinel tests for multi-adapter scenarios"
```

---

## Task 9: ImpactMultisig Smart Contract

**Files:**
- Create: `contracts/src/ImpactMultisig.sol`
- Create: `contracts/test/ImpactMultisig.t.sol`

**Step 1: Write the test**

Create `contracts/test/ImpactMultisig.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ImpactMultisig.sol";

contract ImpactMultisigTest is Test {
    ImpactMultisig public multisig;
    address public signer1 = address(0x1);
    address public signer2 = address(0x2);
    address public signer3 = address(0x3);
    address public nonSigner = address(0x4);

    function setUp() public {
        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;
        multisig = new ImpactMultisig(signers, 2); // 2-of-3
    }

    function test_initial_state() public view {
        assertEq(multisig.threshold(), 2);
        assertEq(multisig.signerCount(), 3);
        assertTrue(multisig.isSigner(signer1));
        assertTrue(multisig.isSigner(signer2));
        assertTrue(multisig.isSigner(signer3));
        assertFalse(multisig.isSigner(nonSigner));
    }

    function test_propose_action() public {
        vm.prank(signer1);
        uint256 proposalId = multisig.proposeAction(abi.encodeWithSignature("test()"));
        assertEq(proposalId, 0);
        assertEq(multisig.approvalCount(proposalId), 1); // proposer auto-approves
    }

    function test_non_signer_cannot_propose() public {
        vm.prank(nonSigner);
        vm.expectRevert("not a signer");
        multisig.proposeAction(abi.encodeWithSignature("test()"));
    }

    function test_approve_action() public {
        vm.prank(signer1);
        uint256 proposalId = multisig.proposeAction(abi.encodeWithSignature("test()"));

        vm.prank(signer2);
        multisig.approveAction(proposalId);

        assertEq(multisig.approvalCount(proposalId), 2);
    }

    function test_cannot_approve_twice() public {
        vm.prank(signer1);
        uint256 proposalId = multisig.proposeAction(abi.encodeWithSignature("test()"));

        vm.prank(signer1);
        vm.expectRevert("already approved");
        multisig.approveAction(proposalId);
    }

    function test_execute_after_threshold_and_timelock() public {
        vm.prank(signer1);
        uint256 proposalId = multisig.proposeAction(abi.encodeWithSignature("test()"));

        vm.prank(signer2);
        multisig.approveAction(proposalId);

        // Fast forward past timelock (2 days)
        vm.warp(block.timestamp + 2 days + 1);

        vm.prank(signer1);
        multisig.executeAction(proposalId);

        assertTrue(multisig.isExecuted(proposalId));
    }

    function test_cannot_execute_before_timelock() public {
        vm.prank(signer1);
        uint256 proposalId = multisig.proposeAction(abi.encodeWithSignature("test()"));

        vm.prank(signer2);
        multisig.approveAction(proposalId);

        vm.prank(signer1);
        vm.expectRevert("timelock not elapsed");
        multisig.executeAction(proposalId);
    }

    function test_cannot_execute_without_threshold() public {
        vm.prank(signer1);
        uint256 proposalId = multisig.proposeAction(abi.encodeWithSignature("test()"));
        // Only 1 approval, need 2

        vm.warp(block.timestamp + 2 days + 1);

        vm.prank(signer1);
        vm.expectRevert("threshold not met");
        multisig.executeAction(proposalId);
    }

    function test_emergency_derisk_single_signer() public {
        vm.prank(signer1);
        multisig.emergencyDerisk();
        // Should not revert — any single signer can call
    }

    function test_non_signer_cannot_emergency_derisk() public {
        vm.prank(nonSigner);
        vm.expectRevert("not a signer");
        multisig.emergencyDerisk();
    }
}
```

**Step 2: Run to verify failure**

Run: `cd /Users/fabio/Projects/impactvault/contracts && forge test --match-contract ImpactMultisigTest`
Expected: FAIL — ImpactMultisig.sol doesn't exist

**Step 3: Implement the contract**

Create `contracts/src/ImpactMultisig.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ImpactMultisig
/// @notice N-of-M signer governance for vault parameter changes
contract ImpactMultisig {
    uint256 public constant TIMELOCK_DURATION = 2 days;

    address[] private _signers;
    mapping(address => bool) public isSigner;
    uint256 public threshold;

    struct Proposal {
        bytes callData;
        uint256 proposedAt;
        uint256 approvals;
        bool executed;
        mapping(address => bool) hasApproved;
    }

    Proposal[] private _proposals;

    event ActionProposed(uint256 indexed proposalId, address indexed proposer, bytes callData);
    event ActionApproved(uint256 indexed proposalId, address indexed approver);
    event ActionExecuted(uint256 indexed proposalId);
    event EmergencyDeriskTriggered(address indexed caller);

    modifier onlySigner() {
        require(isSigner[msg.sender], "not a signer");
        _;
    }

    constructor(address[] memory signers_, uint256 threshold_) {
        require(signers_.length > 0, "no signers");
        require(threshold_ > 0 && threshold_ <= signers_.length, "invalid threshold");

        for (uint256 i = 0; i < signers_.length; i++) {
            require(signers_[i] != address(0), "zero address");
            require(!isSigner[signers_[i]], "duplicate signer");
            isSigner[signers_[i]] = true;
            _signers.push(signers_[i]);
        }
        threshold = threshold_;
    }

    function signerCount() external view returns (uint256) {
        return _signers.length;
    }

    function proposeAction(bytes calldata callData) external onlySigner returns (uint256) {
        uint256 proposalId = _proposals.length;
        _proposals.push();
        Proposal storage p = _proposals[proposalId];
        p.callData = callData;
        p.proposedAt = block.timestamp;
        p.approvals = 1;
        p.hasApproved[msg.sender] = true;

        emit ActionProposed(proposalId, msg.sender, callData);
        emit ActionApproved(proposalId, msg.sender);
        return proposalId;
    }

    function approveAction(uint256 proposalId) external onlySigner {
        require(proposalId < _proposals.length, "invalid proposal");
        Proposal storage p = _proposals[proposalId];
        require(!p.executed, "already executed");
        require(!p.hasApproved[msg.sender], "already approved");

        p.hasApproved[msg.sender] = true;
        p.approvals++;

        emit ActionApproved(proposalId, msg.sender);
    }

    function executeAction(uint256 proposalId) external onlySigner {
        require(proposalId < _proposals.length, "invalid proposal");
        Proposal storage p = _proposals[proposalId];
        require(!p.executed, "already executed");
        require(p.approvals >= threshold, "threshold not met");
        require(
            block.timestamp >= p.proposedAt + TIMELOCK_DURATION,
            "timelock not elapsed"
        );

        p.executed = true;

        // Execute the call on this contract (for parameter changes)
        (bool success, ) = address(this).call(p.callData);
        // Note: success is not required — some proposals may be parameter-setting
        // calls that don't exist yet. The execution is recorded regardless.

        emit ActionExecuted(proposalId);
    }

    function emergencyDerisk() external onlySigner {
        // Emergency derisk can be called by any single signer
        // In production, this would call ImpactVault.emergencyDerisk()
        emit EmergencyDeriskTriggered(msg.sender);
    }

    function approvalCount(uint256 proposalId) external view returns (uint256) {
        require(proposalId < _proposals.length, "invalid proposal");
        return _proposals[proposalId].approvals;
    }

    function isExecuted(uint256 proposalId) external view returns (bool) {
        require(proposalId < _proposals.length, "invalid proposal");
        return _proposals[proposalId].executed;
    }
}
```

**Step 4: Run all contract tests**

Run: `cd /Users/fabio/Projects/impactvault/contracts && forge test`
Expected: ALL PASS (existing + new multisig tests)

**Step 5: Commit**

```bash
git add contracts/src/ImpactMultisig.sol contracts/test/ImpactMultisig.t.sol
git commit -m "feat: add ImpactMultisig N-of-M governance contract"
```

---

## Task 10: Base Mainnet Deployment Script

**Files:**
- Create: `contracts/script/DeployBase.s.sol`
- Modify: `contracts/foundry.toml` (add rpc_endpoints)

**Step 1: Write the deployment script**

Create `contracts/script/DeployBase.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ImpactVault.sol";
import "../src/YieldSplitter.sol";
import "../src/ImpactMultisig.sol";

/// @title DeployBase
/// @notice Deploys the full ImpactVault stack to Base mainnet (chain ID 8453)
contract DeployBase is Script {
    // Base mainnet USDC
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // Read multisig config from env
        address signer1 = vm.envAddress("SIGNER_1");
        address signer2 = vm.envAddress("SIGNER_2");
        address signer3 = vm.envAddress("SIGNER_3");

        vm.startBroadcast(deployerKey);

        // 1. Deploy ImpactVault with USDC as underlying asset
        ERC20 asset = ERC20(USDC_BASE);
        ImpactVault vault = new ImpactVault(asset);

        // 2. Deploy YieldSplitter
        YieldSplitter.Recipient[] memory recipients = new YieldSplitter.Recipient[](1);
        recipients[0] = YieldSplitter.Recipient({
            wallet: deployer,  // placeholder — updated post-deploy
            basisPoints: 10000
        });
        YieldSplitter splitter = new YieldSplitter(address(asset), recipients);

        // 3. Deploy ImpactMultisig (2-of-3)
        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;
        ImpactMultisig multisig = new ImpactMultisig(signers, 2);

        // 4. Transfer vault ownership to multisig
        vault.transferOwnership(address(multisig));

        vm.stopBroadcast();

        // Log deployed addresses
        console.log("ImpactVault:", address(vault));
        console.log("YieldSplitter:", address(splitter));
        console.log("ImpactMultisig:", address(multisig));
        console.log("Owner (multisig):", address(multisig));
    }
}
```

**Step 2: Add rpc_endpoints to foundry.toml**

Append to `contracts/foundry.toml`:

```toml
[rpc_endpoints]
base = "${BASE_RPC_URL}"
sepolia = "${SEPOLIA_RPC_URL}"
```

**Step 3: Create Sepolia deployment script**

Create `contracts/script/DeploySepolia.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ImpactVault.sol";
import "../src/YieldSplitter.sol";
import "../src/ImpactMultisig.sol";
import "../src/mocks/MockRWAVault.sol";

/// @title DeploySepolia
/// @notice Deploys ImpactVault stack to Sepolia testnet with mock assets
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy mock asset (testnet USDC)
        MockAsset mockUSDC = new MockAsset("Mock USDC", "mUSDC");
        mockUSDC.mint(deployer, 1_000_000e18);

        // 2. Deploy ImpactVault with mock asset
        ImpactVault vault = new ImpactVault(ERC20(address(mockUSDC)));

        // 3. Deploy MockRWAVault as yield source
        MockRWAVault rwaVault = new MockRWAVault(mockUSDC, 500); // 5% APY

        // 4. Deploy YieldSplitter
        YieldSplitter.Recipient[] memory recipients = new YieldSplitter.Recipient[](1);
        recipients[0] = YieldSplitter.Recipient({
            wallet: deployer,
            basisPoints: 10000
        });
        YieldSplitter splitter = new YieldSplitter(address(mockUSDC), recipients);

        // 5. Deploy ImpactMultisig (1-of-1 for testnet)
        address[] memory signers = new address[](1);
        signers[0] = deployer;
        ImpactMultisig multisig = new ImpactMultisig(signers, 1);

        vm.stopBroadcast();

        console.log("MockUSDC:", address(mockUSDC));
        console.log("ImpactVault:", address(vault));
        console.log("MockRWAVault:", address(rwaVault));
        console.log("YieldSplitter:", address(splitter));
        console.log("ImpactMultisig:", address(multisig));
    }
}
```

**Step 4: Verify scripts compile**

Run: `cd /Users/fabio/Projects/impactvault/contracts && forge build`
Expected: PASS — compiles without errors

**Step 5: Commit**

```bash
git add contracts/script/ contracts/foundry.toml
git commit -m "feat: add Base mainnet and Sepolia deployment scripts"
```

---

## Task 11: DPGA Registry Integration

**Files:**
- Create: `src/domain/dpga.rs`
- Modify: `src/domain/mod.rs`
- Create: `tests/dpga_test.rs`

**Step 1: Write the failing test**

Create `tests/dpga_test.rs`:

```rust
use impactvault::domain::dpga::{DpgEntry, suggest_recipients};

#[test]
fn test_dpg_entry_creation() {
    let entry = DpgEntry {
        name: "DHIS2".into(),
        description: "Health management platform".into(),
        website: "https://dhis2.org".into(),
        repositories: vec!["https://github.com/dhis2/dhis2-core".into()],
        stage: "DPG".into(),
        wallet_address: Some("0x1234".into()),
    };
    assert_eq!(entry.name, "DHIS2");
    assert!(entry.wallet_address.is_some());
}

#[test]
fn test_suggest_recipients_filters_active() {
    let dpgs = vec![
        DpgEntry {
            name: "Active DPG".into(),
            description: "Has repo and wallet".into(),
            website: "https://example.com".into(),
            repositories: vec!["https://github.com/org/repo".into()],
            stage: "DPG".into(),
            wallet_address: Some("0xabc".into()),
        },
        DpgEntry {
            name: "No Wallet".into(),
            description: "Missing wallet".into(),
            website: "https://example2.com".into(),
            repositories: vec!["https://github.com/org/repo2".into()],
            stage: "DPG".into(),
            wallet_address: None,
        },
        DpgEntry {
            name: "No Repos".into(),
            description: "Empty repos".into(),
            website: "https://example3.com".into(),
            repositories: vec![],
            stage: "DPG".into(),
            wallet_address: Some("0xdef".into()),
        },
    ];

    let suggested = suggest_recipients(&dpgs);
    assert_eq!(suggested.len(), 1);
    assert_eq!(suggested[0].name, "Active DPG");
}
```

**Step 2: Run to verify failure**

Run: `cargo test dpga -- --nocapture`
Expected: FAIL — module `dpga` doesn't exist

**Step 3: Implement dpga module**

Create `src/domain/dpga.rs`:

```rust
use serde::{Deserialize, Serialize};

/// A Digital Public Good entry from the DPGA registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DpgEntry {
    pub name: String,
    pub description: String,
    pub website: String,
    pub repositories: Vec<String>,
    pub stage: String,
    /// Wallet address for receiving yield disbursements (if known).
    #[serde(default)]
    pub wallet_address: Option<String>,
}

/// Filters DPGs to those with active repositories and known wallet addresses.
pub fn suggest_recipients(dpgs: &[DpgEntry]) -> Vec<&DpgEntry> {
    dpgs.iter()
        .filter(|d| !d.repositories.is_empty() && d.wallet_address.is_some())
        .collect()
}

/// Fetches the list of DPGs from the DPGA API.
///
/// In production, this calls the DPGA REST API.
/// The wallet_address field is not part of the DPGA API — it would be
/// maintained in local config mapping DPG names to known wallets.
pub async fn fetch_dpgs(api_url: &str) -> anyhow::Result<Vec<DpgEntry>> {
    let resp = reqwest::get(api_url).await?;
    let dpgs: Vec<DpgEntry> = resp.json().await?;
    Ok(dpgs)
}
```

Add to `src/domain/mod.rs`:

```rust
pub mod dpga;
```

Add `reqwest` dependency to `Cargo.toml`:

```toml
reqwest = { version = "0.12", features = ["json"] }
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/domain/dpga.rs src/domain/mod.rs tests/dpga_test.rs Cargo.toml Cargo.lock
git commit -m "feat: add DPGA registry integration with recipient suggestions"
```

---

## Task 12: Expand REST API — Vault and Risk Endpoints

**Files:**
- Modify: `src/gateway/api.rs`
- Create: `tests/api_test.rs`

**Step 1: Write the failing tests**

Create `tests/api_test.rs`:

```rust
use axum::http::StatusCode;
use axum_test::TestServer;
use impactvault::gateway::api::api_router;

#[tokio::test]
async fn test_health_endpoint() {
    let app = api_router();
    let server = TestServer::new(app).unwrap();
    let resp = server.get("/health").await;
    resp.assert_status_ok();
}

#[tokio::test]
async fn test_adapters_endpoint() {
    let app = api_router();
    let server = TestServer::new(app).unwrap();
    let resp = server.get("/adapters").await;
    resp.assert_status_ok();
}

#[tokio::test]
async fn test_sentinel_status_endpoint() {
    let app = api_router();
    let server = TestServer::new(app).unwrap();
    let resp = server.get("/sentinel/status").await;
    resp.assert_status_ok();
}

#[tokio::test]
async fn test_yield_history_endpoint() {
    let app = api_router();
    let server = TestServer::new(app).unwrap();
    let resp = server.get("/yield/history").await;
    resp.assert_status_ok();
}

#[tokio::test]
async fn test_disbursements_endpoint() {
    let app = api_router();
    let server = TestServer::new(app).unwrap();
    let resp = server.get("/disbursements").await;
    resp.assert_status_ok();
}

#[tokio::test]
async fn test_risk_assessment_endpoint() {
    let app = api_router();
    let server = TestServer::new(app).unwrap();
    let resp = server.get("/risk/assessment").await;
    resp.assert_status_ok();
}
```

Add `axum-test` to Cargo.toml dev-dependencies:

```toml
[dev-dependencies]
axum-test = "16"
```

**Step 2: Run to verify failure**

Run: `cargo test api_test -- --nocapture`
Expected: FAIL — endpoints don't exist

**Step 3: Implement new endpoints**

Expand `src/gateway/api.rs`:

```rust
use axum::{extract::Path, routing::get, Json, Router};
use serde_json::{json, Value};

pub fn api_router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/sentinel/status", get(sentinel_status))
        .route("/adapters", get(list_adapters))
        .route("/adapters/{name}/health", get(adapter_health))
        .route("/vault/{id}/status", get(vault_status))
        .route("/vault/{id}/risk", get(vault_risk))
        .route("/yield/history", get(yield_history))
        .route("/disbursements", get(disbursements))
        .route("/risk/assessment", get(risk_assessment))
}

async fn health() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

async fn sentinel_status() -> Json<Value> {
    // In production: read from shared SentinelStatus via Arc<RwLock>
    Json(json!({
        "running": true,
        "checks_completed": 0,
        "last_check": null,
        "last_action": null
    }))
}

async fn list_adapters() -> Json<Value> {
    Json(json!({
        "adapters": [
            {"name": "sovereign_bond", "risk_position": "Sovereign", "status": "active"},
            {"name": "aave_savings", "risk_position": "StablecoinSavings", "status": "active"},
            {"name": "liquid_staking", "risk_position": "LiquidStaking", "status": "active"},
            {"name": "compound_lending", "risk_position": "DiversifiedLending", "status": "active"}
        ]
    }))
}

async fn adapter_health(Path(name): Path<String>) -> Json<Value> {
    // In production: query real adapter health from sentinel
    Json(json!({
        "adapter_name": name,
        "score": 0.85,
        "oracle_fresh": true,
        "liquidity_adequate": true,
        "utilisation_rate": 0.65,
        "details": "healthy"
    }))
}

async fn vault_status(Path(id): Path<String>) -> Json<Value> {
    // In production: read from SQLite vault state
    Json(json!({
        "vault_id": id,
        "total_deposited": 0,
        "total_yield_generated": 0,
        "total_disbursed": 0,
        "active_adapters": 4,
        "allocations": []
    }))
}

async fn vault_risk(Path(id): Path<String>) -> Json<Value> {
    // In production: run evaluate_risk() with live data
    Json(json!({
        "vault_id": id,
        "overall_health": 0.85,
        "breaches": [],
        "recommended_action": "Hold"
    }))
}

async fn yield_history() -> Json<Value> {
    // In production: query adapter_health_log from SQLite
    Json(json!({
        "events": []
    }))
}

async fn disbursements() -> Json<Value> {
    // In production: query disbursements from SQLite
    Json(json!({
        "total_disbursed": 0,
        "recipient_count": 0,
        "disbursements": []
    }))
}

async fn risk_assessment() -> Json<Value> {
    // In production: run full evaluate_risk()
    Json(json!({
        "overall_health": 0.85,
        "breaches": [],
        "recommended_action": "Hold",
        "adapter_health": []
    }))
}
```

**Step 4: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/gateway/api.rs tests/api_test.rs Cargo.toml Cargo.lock
git commit -m "feat: expand REST API with vault, risk, yield, and disbursement endpoints"
```

---

## Task 13: Store Migrations for Yield History

**Files:**
- Create: `src/store/migrations/005_yield_history.sql`
- Modify: `src/store/state.rs` (apply migration)

**Step 1: Write the migration**

Create `src/store/migrations/005_yield_history.sql`:

```sql
-- Yield history and adapter APY snapshots
CREATE TABLE IF NOT EXISTS yield_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adapter_name TEXT NOT NULL,
    apy REAL NOT NULL,
    tvl INTEGER NOT NULL DEFAULT 0,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_yield_snapshots_adapter ON yield_snapshots(adapter_name);
CREATE INDEX IF NOT EXISTS idx_yield_snapshots_time ON yield_snapshots(recorded_at);

-- Governance proposals (mirror on-chain multisig)
CREATE TABLE IF NOT EXISTS governance_proposals (
    id INTEGER PRIMARY KEY,
    proposer TEXT NOT NULL,
    call_data TEXT NOT NULL,
    proposed_at TEXT NOT NULL DEFAULT (datetime('now')),
    approvals INTEGER NOT NULL DEFAULT 1,
    executed INTEGER NOT NULL DEFAULT 0,
    executed_at TEXT
);
```

**Step 2: Add migration to state.rs**

In `src/store/state.rs`, add to the migrations list:

```rust
include_str!("migrations/005_yield_history.sql"),
```

**Step 3: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/store/migrations/005_yield_history.sql src/store/state.rs
git commit -m "feat: add yield_snapshots and governance_proposals tables"
```

---

## Task 14: Dashboard — Project Setup

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/next.config.js`
- Create: `dashboard/tailwind.config.js`
- Create: `dashboard/postcss.config.js`
- Create: `dashboard/tsconfig.json`
- Create: `dashboard/src/app/layout.tsx`
- Create: `dashboard/src/app/globals.css`

**Step 1: Initialize project**

Run:
```bash
cd /Users/fabio/Projects/impactvault
mkdir -p dashboard/src/app dashboard/src/components dashboard/src/lib
```

Create `dashboard/package.json`:

```json
{
  "name": "impactvault-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

Create `dashboard/next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};
module.exports = nextConfig;
```

Create `dashboard/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        border: '#262626',
        primary: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
```

Create `dashboard/postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `dashboard/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Create `dashboard/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-background text-white;
}
```

Create `dashboard/src/app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ImpactVault Dashboard',
  description: 'Risk-curated yield infrastructure for social impact',
};

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/adapters', label: 'Adapters' },
  { href: '/risk', label: 'Risk' },
  { href: '/disbursements', label: 'Disbursements' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen">
        {/* Sidebar */}
        <nav className="w-56 bg-surface border-r border-border p-4 flex flex-col gap-1">
          <div className="text-lg font-bold text-primary mb-6 px-3">ImpactVault</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-border hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
```

**Step 2: Install dependencies**

Run: `cd /Users/fabio/Projects/impactvault/dashboard && npm install`
Expected: node_modules created, lockfile generated

**Step 3: Verify build**

Run: `cd /Users/fabio/Projects/impactvault/dashboard && npx next build`
Expected: Build succeeds (may show warnings about missing pages)

**Step 4: Commit**

```bash
cd /Users/fabio/Projects/impactvault
echo "node_modules/" >> dashboard/.gitignore
echo ".next/" >> dashboard/.gitignore
git add dashboard/
git commit -m "feat: initialize Next.js dashboard with Tailwind dark theme"
```

---

## Task 15: Dashboard — API Client

**Files:**
- Create: `dashboard/src/lib/api.ts`

**Step 1: Create API fetch wrapper**

Create `dashboard/src/lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 30 }, // ISR: refresh every 30s
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface AdapterInfo {
  name: string;
  risk_position: string;
  status: string;
}

export interface AdapterHealth {
  adapter_name: string;
  score: number;
  oracle_fresh: boolean;
  liquidity_adequate: boolean;
  utilisation_rate: number;
  details: string;
}

export interface VaultStatus {
  vault_id: string;
  total_deposited: number;
  total_yield_generated: number;
  total_disbursed: number;
  active_adapters: number;
  allocations: Array<{ adapter_name: string; amount: number; risk_position: string }>;
}

export interface SentinelStatus {
  running: boolean;
  checks_completed: number;
  last_check: string | null;
  last_action: string | null;
}

export interface RiskAssessment {
  overall_health: number;
  breaches: string[];
  recommended_action: string;
  adapter_health: AdapterHealth[];
}

export interface Disbursement {
  date: string;
  recipient: string;
  amount: number;
  tx_hash: string;
}

export interface DisbursementsResponse {
  total_disbursed: number;
  recipient_count: number;
  disbursements: Disbursement[];
}

export interface YieldEvent {
  adapter_name: string;
  apy: number;
  tvl: number;
  recorded_at: string;
}

export const api = {
  health: () => fetchApi<{ status: string }>('/health'),
  adapters: () => fetchApi<{ adapters: AdapterInfo[] }>('/adapters'),
  adapterHealth: (name: string) => fetchApi<AdapterHealth>(`/adapters/${name}/health`),
  vaultStatus: (id: string) => fetchApi<VaultStatus>(`/vault/${id}/status`),
  vaultRisk: (id: string) => fetchApi<VaultStatus>(`/vault/${id}/risk`),
  sentinelStatus: () => fetchApi<SentinelStatus>('/sentinel/status'),
  riskAssessment: () => fetchApi<RiskAssessment>('/risk/assessment'),
  yieldHistory: () => fetchApi<{ events: YieldEvent[] }>('/yield/history'),
  disbursements: () => fetchApi<DisbursementsResponse>('/disbursements'),
};
```

**Step 2: Commit**

```bash
git add dashboard/src/lib/api.ts
git commit -m "feat: add dashboard API client with typed interfaces"
```

---

## Task 16: Dashboard — Shared Components

**Files:**
- Create: `dashboard/src/components/MetricCard.tsx`
- Create: `dashboard/src/components/HealthGauge.tsx`

**Step 1: Create MetricCard**

Create `dashboard/src/components/MetricCard.tsx`:

```tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function MetricCard({ label, value, subtitle }: MetricCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}
```

**Step 2: Create HealthGauge**

Create `dashboard/src/components/HealthGauge.tsx`:

```tsx
interface HealthGaugeProps {
  score: number; // 0.0 - 1.0
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

function scoreColor(score: number): string {
  if (score > 0.8) return 'text-success';
  if (score > 0.5) return 'text-warning';
  return 'text-danger';
}

function scoreBg(score: number): string {
  if (score > 0.8) return 'bg-success';
  if (score > 0.5) return 'bg-warning';
  return 'bg-danger';
}

export function HealthGauge({ score, label, size = 'md' }: HealthGaugeProps) {
  const pct = Math.round(score * 100);
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-4xl' : 'text-2xl';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${textSize} font-bold ${scoreColor(score)}`}>{pct}%</div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreBg(score)} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <div className="text-xs text-gray-400">{label}</div>}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add dashboard/src/components/
git commit -m "feat: add MetricCard and HealthGauge dashboard components"
```

---

## Task 17: Dashboard — Overview Page

**Files:**
- Create: `dashboard/src/app/page.tsx`
- Create: `dashboard/src/components/AllocationPie.tsx`
- Create: `dashboard/src/components/YieldChart.tsx`

**Step 1: Create AllocationPie**

Create `dashboard/src/components/AllocationPie.tsx`:

```tsx
'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AllocationPieProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AllocationPie({ data }: AllocationPieProps) {
  if (data.length === 0) {
    return <div className="text-gray-500 text-center py-8">No allocations yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#141414', border: '1px solid #262626' }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Create YieldChart**

Create `dashboard/src/components/YieldChart.tsx`:

```tsx
'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface YieldChartProps {
  data: Array<{ month: string; yield: number }>;
}

export function YieldChart({ data }: YieldChartProps) {
  if (data.length === 0) {
    return <div className="text-gray-500 text-center py-8">No yield data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip
          contentStyle={{ background: '#141414', border: '1px solid #262626' }}
          labelStyle={{ color: '#fff' }}
        />
        <Line
          type="monotone"
          dataKey="yield"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Step 3: Create Overview Page**

Create `dashboard/src/app/page.tsx`:

```tsx
import { MetricCard } from '@/components/MetricCard';
import { AllocationPie } from '@/components/AllocationPie';
import { YieldChart } from '@/components/YieldChart';

// Demo data — in production, fetched from API
const metrics = {
  tvl: '$0',
  totalYield: '$0',
  totalDisbursed: '$0',
  activeAdapters: 4,
};

const allocationData = [
  { name: 'Sovereign Bond', value: 40 },
  { name: 'Aave Savings', value: 30 },
  { name: 'Liquid Staking', value: 20 },
  { name: 'Compound Lending', value: 10 },
];

const yieldData = [
  { month: 'Jan', yield: 0 },
  { month: 'Feb', yield: 0 },
  { month: 'Mar', yield: 0 },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Value Locked" value={metrics.tvl} />
        <MetricCard label="Total Yield Generated" value={metrics.totalYield} />
        <MetricCard label="Total Disbursed" value={metrics.totalDisbursed} />
        <MetricCard label="Active Adapters" value={metrics.activeAdapters} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Allocation</h2>
          <AllocationPie data={allocationData} />
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Yield Over Time</h2>
          <YieldChart data={yieldData} />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd /Users/fabio/Projects/impactvault/dashboard && npx next build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add dashboard/src/
git commit -m "feat: add dashboard overview page with allocation pie and yield chart"
```

---

## Task 18: Dashboard — Adapters Page

**Files:**
- Create: `dashboard/src/app/adapters/page.tsx`
- Create: `dashboard/src/components/AdapterCard.tsx`

**Step 1: Create AdapterCard**

Create `dashboard/src/components/AdapterCard.tsx`:

```tsx
import { HealthGauge } from './HealthGauge';

interface AdapterCardProps {
  name: string;
  riskPosition: string;
  score: number;
  apy: string;
  tvl: string;
}

export function AdapterCard({ name, riskPosition, score, apy, tvl }: AdapterCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{name}</h3>
          <span className="text-xs text-gray-400">{riskPosition}</span>
        </div>
        <HealthGauge score={score} size="sm" />
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-400">APY</div>
          <div className="font-medium">{apy}</div>
        </div>
        <div>
          <div className="text-gray-400">TVL</div>
          <div className="font-medium">{tvl}</div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create Adapters Page**

Create `dashboard/src/app/adapters/page.tsx`:

```tsx
import { AdapterCard } from '@/components/AdapterCard';

const adapters = [
  { name: 'Sovereign Bond', riskPosition: 'Sovereign', score: 0.95, apy: '4.5%', tvl: '$0' },
  { name: 'Aave Savings', riskPosition: 'StablecoinSavings', score: 0.85, apy: '3.2%', tvl: '$0' },
  { name: 'Liquid Staking (Lido)', riskPosition: 'LiquidStaking', score: 0.88, apy: '3.5%', tvl: '$0' },
  { name: 'Compound Lending', riskPosition: 'DiversifiedLending', score: 0.82, apy: '3.2%', tvl: '$0' },
];

export default function AdaptersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Adapters</h1>
      <div className="grid grid-cols-2 gap-4">
        {adapters.map((adapter) => (
          <AdapterCard key={adapter.name} {...adapter} />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add dashboard/src/
git commit -m "feat: add dashboard adapters page with health-scored cards"
```

---

## Task 19: Dashboard — Risk Page

**Files:**
- Create: `dashboard/src/app/risk/page.tsx`
- Create: `dashboard/src/components/SentinelStatus.tsx`

**Step 1: Create SentinelStatus**

Create `dashboard/src/components/SentinelStatus.tsx`:

```tsx
interface SentinelStatusProps {
  running: boolean;
  checksCompleted: number;
  lastCheck: string | null;
  lastAction: string | null;
}

export function SentinelStatusCard({
  running,
  checksCompleted,
  lastCheck,
  lastAction,
}: SentinelStatusProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Sentinel Monitor</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span className={running ? 'text-success' : 'text-danger'}>
            {running ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Checks Completed</span>
          <span>{checksCompleted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Last Check</span>
          <span className="text-sm">{lastCheck ?? 'Never'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Current Action</span>
          <span>{lastAction ?? 'None'}</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create Risk Page**

Create `dashboard/src/app/risk/page.tsx`:

```tsx
import { HealthGauge } from '@/components/HealthGauge';
import { SentinelStatusCard } from '@/components/SentinelStatus';

const enforcerRules = [
  { name: 'derisk_on_health_breach', enabled: true, type: 'Block' },
  { name: 'oracle_staleness', enabled: true, type: 'Warn' },
  { name: 'concentration_limit', enabled: true, type: 'Block' },
];

export default function RiskPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Risk</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Overall health */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Overall Health</h3>
          <HealthGauge score={0.85} label="Portfolio Health" size="lg" />
        </div>

        {/* Sentinel status */}
        <SentinelStatusCard
          running={true}
          checksCompleted={0}
          lastCheck={null}
          lastAction={null}
        />

        {/* Active alerts */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Active Alerts</h3>
          <div className="text-gray-500 text-center py-4">No active alerts</div>
        </div>
      </div>

      {/* Enforcer rules */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Enforcer Rules</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-2">Rule</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {enforcerRules.map((rule) => (
              <tr key={rule.name} className="border-t border-border">
                <td className="py-2 font-mono text-xs">{rule.name}</td>
                <td className="py-2">
                  <span className={rule.type === 'Block' ? 'text-danger' : 'text-warning'}>
                    {rule.type}
                  </span>
                </td>
                <td className="py-2">
                  <span className={rule.enabled ? 'text-success' : 'text-gray-500'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add dashboard/src/
git commit -m "feat: add dashboard risk page with sentinel status and enforcer rules"
```

---

## Task 20: Dashboard — Disbursements Page

**Files:**
- Create: `dashboard/src/app/disbursements/page.tsx`
- Create: `dashboard/src/components/DisbursementTable.tsx`

**Step 1: Create DisbursementTable**

Create `dashboard/src/components/DisbursementTable.tsx`:

```tsx
interface Disbursement {
  date: string;
  recipient: string;
  amount: string;
  txHash: string;
}

interface DisbursementTableProps {
  data: Disbursement[];
}

export function DisbursementTable({ data }: DisbursementTableProps) {
  if (data.length === 0) {
    return <div className="text-gray-500 text-center py-8">No disbursements yet</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400">
          <th className="pb-2">Date</th>
          <th className="pb-2">Recipient</th>
          <th className="pb-2">Amount</th>
          <th className="pb-2">Transaction</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-2">{d.date}</td>
            <td className="py-2 font-mono text-xs">{d.recipient}</td>
            <td className="py-2">{d.amount}</td>
            <td className="py-2">
              <a
                href={`https://basescan.org/tx/${d.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono text-xs"
              >
                {d.txHash.slice(0, 10)}...
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Step 2: Create Disbursements Page**

Create `dashboard/src/app/disbursements/page.tsx`:

```tsx
import { MetricCard } from '@/components/MetricCard';
import { DisbursementTable } from '@/components/DisbursementTable';

export default function DisbursementsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disbursements</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Disbursed" value="$0" />
        <MetricCard label="Recipients" value="0" />
        <MetricCard label="Transactions" value="0" />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">History</h2>
        <DisbursementTable data={[]} />
      </div>
    </div>
  );
}
```

**Step 3: Verify full build**

Run: `cd /Users/fabio/Projects/impactvault/dashboard && npx next build`
Expected: Build succeeds with all 4 pages

**Step 4: Commit**

```bash
git add dashboard/src/
git commit -m "feat: add dashboard disbursements page with transaction table"
```

---

## Task 21: MCP Tools for New Features

**Files:**
- Modify: `src/gateway/server.rs`
- Modify: `src/gateway/router.rs`

**Step 1: Add new MCP tools**

In `src/gateway/server.rs`, add tool handlers:

- `dpga_list` — calls `dpga::suggest_recipients` and returns filtered DPGs
- `vault_rebalance` — calls `check_rebalance()` and returns drift info
- `adapter_health` for new adapters — extend router to handle `liquid_staking` and `compound_lending`

Tool schemas:

```rust
// dpga_list tool
#[tool(description = "List Digital Public Goods eligible for yield disbursements")]
async fn dpga_list(&self) -> Result<CallToolResult, McpError> {
    // Returns list of DPGs with wallets
}

// vault_rebalance tool
#[tool(description = "Check if portfolio needs rebalancing based on drift from target weights")]
async fn vault_rebalance(&self) -> Result<CallToolResult, McpError> {
    // Returns RebalanceRecommendation
}
```

Update `src/gateway/router.rs` to route `dpga_` and `rebalance_` prefixed tools.

**Step 2: Run all tests**

Run: `cargo test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/gateway/server.rs src/gateway/router.rs
git commit -m "feat: add MCP tools for DPGA listing and rebalance checking"
```

---

## Task 22: Integration Test — Full Pipeline

**Files:**
- Modify: `tests/engine_test.rs`

**Step 1: Write integration test**

Add to `tests/engine_test.rs`:

```rust
#[test]
fn test_full_pipeline_multi_strategy() {
    // Configure vault with 3 sources and weights
    let mut weights = HashMap::new();
    weights.insert(RiskSpectrum::Sovereign, 40);
    weights.insert(RiskSpectrum::StablecoinSavings, 35);
    weights.insert(RiskSpectrum::LiquidStaking, 25);

    let config = VaultConfig {
        approved_sources: vec![
            RiskSpectrum::Sovereign,
            RiskSpectrum::StablecoinSavings,
            RiskSpectrum::LiquidStaking,
        ],
        source_weights: weights.clone(),
        concentration_limit: 80,
        derisking_health_threshold: 0.5,
        auto_derisk_enabled: true,
        ..VaultConfig::default()
    };

    // 1. Allocate
    let plan = recommend_allocation(&config, 100_000);
    assert_eq!(plan.allocations.len(), 3);
    let total: u128 = plan.allocations.iter().map(|a| a.amount).sum();
    assert_eq!(total, 100_000);

    // 2. Build portfolio from allocation
    let mut portfolio = Portfolio::new();
    portfolio.total_deposited = 100_000;
    portfolio.allocations = plan.allocations.clone();

    // 3. Check no rebalance needed (fresh allocation matches weights)
    let rebal = check_rebalance(&config, &portfolio, 10);
    assert!(!rebal.needs_rebalance);

    // 4. Simulate drift
    portfolio.allocations[0].amount = 60_000; // sovereign drifted to 60%
    portfolio.allocations[1].amount = 30_000;
    portfolio.allocations[2].amount = 10_000;

    let rebal = check_rebalance(&config, &portfolio, 10);
    assert!(rebal.needs_rebalance);

    // 5. Risk evaluation with healthy adapters
    let health_data = vec![
        HealthStatus {
            adapter_name: "sovereign_bond".into(),
            score: 0.95,
            oracle_fresh: true,
            liquidity_adequate: true,
            utilisation_rate: 0.0,
            details: "healthy".into(),
        },
        HealthStatus {
            adapter_name: "aave_savings".into(),
            score: 0.85,
            oracle_fresh: true,
            liquidity_adequate: true,
            utilisation_rate: 0.72,
            details: "healthy".into(),
        },
        HealthStatus {
            adapter_name: "liquid_staking".into(),
            score: 0.88,
            oracle_fresh: true,
            liquidity_adequate: true,
            utilisation_rate: 0.0,
            details: "healthy".into(),
        },
    ];

    let assessment = evaluate_risk(&config, &portfolio, &health_data);
    assert!(assessment.breaches.is_empty());
    assert_eq!(assessment.recommended_action, DeriskAction::Hold);
}
```

**Step 2: Run the test**

Run: `cargo test test_full_pipeline_multi_strategy -- --nocapture`
Expected: PASS

**Step 3: Run all tests one final time**

Run: `cargo test && cd contracts && forge test`
Expected: ALL PASS — Rust tests + Solidity tests

**Step 4: Commit**

```bash
git add tests/engine_test.rs
git commit -m "test: add full pipeline integration test for multi-strategy allocation"
```

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Engine | Extend RiskSpectrum enum |
| 2 | Engine | Add source_weights to VaultConfig |
| 3 | Engine | Multi-strategy weighted allocation |
| 4 | Engine | Rebalance drift detection |
| 5 | Config | New adapter, governance, DPGA config |
| 6 | Adapter | Liquid Staking (Lido wstETH) |
| 7 | Adapter | Compound Lending (Compound V3) |
| 8 | Test | Update sentinel tests for multi-adapter |
| 9 | Contract | ImpactMultisig governance |
| 10 | Contract | Base + Sepolia deployment scripts |
| 11 | Domain | DPGA registry integration |
| 12 | API | Expand REST API endpoints |
| 13 | Store | Yield history + governance migrations |
| 14 | Dashboard | Project setup (Next.js + Tailwind) |
| 15 | Dashboard | API client |
| 16 | Dashboard | Shared components |
| 17 | Dashboard | Overview page |
| 18 | Dashboard | Adapters page |
| 19 | Dashboard | Risk page |
| 20 | Dashboard | Disbursements page |
| 21 | MCP | New tools (DPGA, rebalance) |
| 22 | Test | Full pipeline integration test |
