use async_trait::async_trait;
use impactvault::domain::adapters::{TxRequest, YieldAdapter};
use impactvault::domain::engine::{HealthStatus, RiskSpectrum};

pub struct MyAdapter {
    contract_address: String,
    chain_id: u64,
    rpc_url: String,
}

impl MyAdapter {
    pub fn new(contract_address: String, chain_id: u64, rpc_url: String) -> Self {
        Self { contract_address, chain_id, rpc_url }
    }
}

#[async_trait]
impl YieldAdapter for MyAdapter {
    fn name(&self) -> &str {
        "my_adapter" // TODO: change to your adapter name
    }

    fn risk_position(&self) -> RiskSpectrum {
        RiskSpectrum::StablecoinSavings // TODO: set appropriate risk level
    }

    async fn deposit(&self, amount: u128) -> anyhow::Result<TxRequest> {
        // TODO: encode your protocol's deposit calldata
        todo!("implement deposit")
    }

    async fn withdraw(&self, amount: u128) -> anyhow::Result<TxRequest> {
        // TODO: encode your protocol's withdraw calldata
        todo!("implement withdraw")
    }

    async fn current_yield_apy(&self) -> anyhow::Result<f64> {
        // TODO: read current yield from your protocol
        todo!("implement current_yield_apy")
    }

    async fn health_check(&self) -> anyhow::Result<HealthStatus> {
        // TODO: check oracle freshness, liquidity, utilisation
        todo!("implement health_check")
    }

    async fn tvl(&self) -> anyhow::Result<u128> {
        // TODO: read total value locked from your protocol
        todo!("implement tvl")
    }
}
