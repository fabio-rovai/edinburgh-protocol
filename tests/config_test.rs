use std::io::Write;
use tempfile::NamedTempFile;

#[test]
fn test_load_config_from_file() {
    let mut f = NamedTempFile::new().unwrap();
    writeln!(f, r#"
[general]
data_dir = "/tmp/impactvault-test"

[enforcer]
enabled = true
default_action = "block"
"#).unwrap();

    let config = impactvault::config::Config::load(f.path()).unwrap();
    assert_eq!(config.general.data_dir, "/tmp/impactvault-test");
    assert!(config.enforcer.enabled);
}

#[test]
fn test_config_defaults() {
    let config = impactvault::config::Config::default();
    assert!(config.enforcer.enabled);
    assert_eq!(config.enforcer.default_action, "block");
    assert_eq!(config.general.data_dir, "~/.impactvault");
    assert!(config.vault.is_none());
    assert!(config.adapters.is_none());
    assert!(config.sentinel.is_none());
    assert!(config.api.is_none());
}

#[test]
fn test_vault_config_defaults() {
    let mut f = NamedTempFile::new().unwrap();
    writeln!(f, r#"
[vault]
"#).unwrap();

    let config = impactvault::config::Config::load(f.path()).unwrap();
    let vault = config.vault.expect("vault section should be present");
    assert!(vault.approved_sources.is_empty());
    assert_eq!(vault.concentration_limit, 80);
    assert!((vault.derisking_health_threshold - 0.5).abs() < f64::EPSILON);
}

#[test]
fn test_adapter_config_parsing() {
    let mut f = NamedTempFile::new().unwrap();
    writeln!(f, r#"
[[adapters]]
name = "sovereign_bond"
type = "sovereign_bond"
contract_address = "0xABC"
chain_id = 1

[[adapters]]
name = "aave_savings"
type = "aave_savings"
pool_address = "0xDEF"
asset_address = "0x123"
"#).unwrap();

    let config = impactvault::config::Config::load(f.path()).unwrap();
    let adapters = config.adapters.expect("adapters should be present");
    assert_eq!(adapters.len(), 2);

    assert_eq!(adapters[0].name, "sovereign_bond");
    assert_eq!(adapters[0].adapter_type, "sovereign_bond");
    assert_eq!(adapters[0].contract_address.as_deref(), Some("0xABC"));
    assert_eq!(adapters[0].chain_id, 1);

    assert_eq!(adapters[1].name, "aave_savings");
    assert_eq!(adapters[1].adapter_type, "aave_savings");
    assert_eq!(adapters[1].pool_address.as_deref(), Some("0xDEF"));
    assert_eq!(adapters[1].asset_address.as_deref(), Some("0x123"));
    // Defaults
    assert_eq!(adapters[1].chain_id, 11155111);
    assert_eq!(adapters[1].rpc_url, "https://rpc.sepolia.org");
}

#[test]
fn test_sentinel_config_parsing() {
    let mut f = NamedTempFile::new().unwrap();
    writeln!(f, r#"
[sentinel]
poll_interval_secs = 30
auto_derisk_enabled = false
"#).unwrap();

    let config = impactvault::config::Config::load(f.path()).unwrap();
    let sentinel = config.sentinel.expect("sentinel section should be present");
    assert_eq!(sentinel.poll_interval_secs, 30);
    assert!(!sentinel.auto_derisk_enabled);
}

#[test]
fn test_api_config_parsing() {
    let mut f = NamedTempFile::new().unwrap();
    writeln!(f, r#"
[api]
port = 8080
"#).unwrap();

    let config = impactvault::config::Config::load(f.path()).unwrap();
    let api = config.api.expect("api section should be present");
    assert_eq!(api.port, 8080);
}
