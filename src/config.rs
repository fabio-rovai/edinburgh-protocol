use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Top-level configuration for ImpactVault.
#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct Config {
    pub general: GeneralConfig,
    pub enforcer: EnforcerConfig,
    pub lineage: LineageConfig,
    pub vault: Option<VaultTomlConfig>,
    pub adapters: Option<Vec<AdapterTomlConfig>>,
    pub sentinel: Option<SentinelTomlConfig>,
    pub api: Option<ApiConfig>,
    pub governance: Option<GovernanceConfig>,
    pub dpga: Option<DpgaConfig>,
    pub dashboard: Option<DashboardConfig>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            enforcer: EnforcerConfig::default(),
            lineage: LineageConfig::default(),
            vault: None,
            adapters: None,
            sentinel: None,
            api: None,
            governance: None,
            dpga: None,
            dashboard: None,
        }
    }
}

impl Config {
    /// Load configuration from a TOML file.
    ///
    /// Missing sections/fields fall back to defaults via `#[serde(default)]`.
    pub fn load(path: &Path) -> Result<Self> {
        let contents = std::fs::read_to_string(path)
            .with_context(|| format!("failed to read config file: {}", path.display()))?;
        let config: Config = toml::from_str(&contents)
            .with_context(|| format!("failed to parse config file: {}", path.display()))?;
        Ok(config)
    }
}

/// General paths and directories.
#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct GeneralConfig {
    pub data_dir: String,
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            data_dir: "~/.edinburgh-protocol".into(),
        }
    }
}

/// Policy enforcer settings.
#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct EnforcerConfig {
    pub enabled: bool,
    pub default_action: String,
    #[serde(default)]
    pub rules: Vec<RuleConfig>,
}

impl Default for EnforcerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_action: "block".into(),
            rules: Vec::new(),
        }
    }
}

/// A single enforcer rule defined in TOML config.
#[derive(Debug, Deserialize, Clone)]
pub struct RuleConfig {
    pub name: String,
    pub description: Option<String>,
    pub action: String,
    pub enabled: Option<bool>,
    pub condition: RuleConditionConfig,
}

/// Flat TOML representation of a rule condition.
#[derive(Debug, Deserialize, Clone)]
pub struct RuleConditionConfig {
    /// "MissingInWindow" or "RepeatWithout"
    #[serde(rename = "type")]
    pub kind: String,
    pub trigger: Option<String>,
    pub required: Option<String>,
    pub window: Option<usize>,
    pub category: Option<String>,
    pub count: Option<usize>,
}

/// Lineage tracking HTTP API settings.
#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct LineageConfig {
    pub http_port: u16,
}

impl Default for LineageConfig {
    fn default() -> Self {
        Self { http_port: 0 }
    }
}

/// Vault risk and allocation settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultTomlConfig {
    #[serde(default)]
    pub approved_sources: Vec<String>,
    #[serde(default = "default_concentration_limit")]
    pub concentration_limit: u8,
    #[serde(default = "default_health_threshold")]
    pub derisking_health_threshold: f64,
}

fn default_concentration_limit() -> u8 {
    80
}

fn default_health_threshold() -> f64 {
    0.5
}

/// Configuration for a single yield adapter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterTomlConfig {
    pub name: String,
    #[serde(rename = "type")]
    pub adapter_type: String,
    #[serde(default)]
    pub contract_address: Option<String>,
    #[serde(default)]
    pub pool_address: Option<String>,
    #[serde(default)]
    pub asset_address: Option<String>,
    #[serde(default)]
    pub wsteth_address: Option<String>,
    #[serde(default)]
    pub comet_address: Option<String>,
    #[serde(default = "default_chain_id")]
    pub chain_id: u64,
    #[serde(default = "default_rpc_url")]
    pub rpc_url: String,
}

fn default_chain_id() -> u64 {
    11155111 // Sepolia
}

fn default_rpc_url() -> String {
    "https://rpc.sepolia.org".into()
}

/// Sentinel health-monitoring settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelTomlConfig {
    #[serde(default = "default_poll_interval")]
    pub poll_interval_secs: u64,
    #[serde(default = "default_auto_derisk")]
    pub auto_derisk_enabled: bool,
}

fn default_poll_interval() -> u64 {
    60
}

fn default_auto_derisk() -> bool {
    true
}

/// REST API configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    #[serde(default = "default_api_port")]
    pub port: u16,
}

fn default_api_port() -> u16 {
    3000
}

/// Governance configuration (multisig, DAO, etc.).
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

fn default_threshold() -> u8 {
    2
}

/// DPGA (Digital Public Goods Alliance) integration settings.
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

/// Dashboard UI configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardConfig {
    #[serde(default = "default_dashboard_api")]
    pub api_url: String,
}

fn default_dashboard_api() -> String {
    "http://localhost:3000".into()
}

/// Expand a leading `~` or `~/` in a path to the user's home directory.
pub fn expand_tilde(path: &str) -> String {
    if path.starts_with("~/") || path == "~" {
        if let Some(home) = std::env::var_os("HOME") {
            return path.replacen("~", &home.to_string_lossy(), 1);
        }
    }
    path.to_string()
}
