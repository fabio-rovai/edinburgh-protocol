CREATE TABLE IF NOT EXISTS vaults (
    id TEXT PRIMARY KEY,
    config_json TEXT NOT NULL,
    portfolio_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adapter_health_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adapter_name TEXT NOT NULL,
    score REAL NOT NULL,
    oracle_fresh INTEGER NOT NULL,
    liquidity_adequate INTEGER NOT NULL,
    utilisation_rate REAL NOT NULL,
    details TEXT,
    checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disbursements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT,
    recipient TEXT NOT NULL,
    amount TEXT NOT NULL,
    token TEXT NOT NULL,
    block_number INTEGER,
    recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    adapter_name TEXT,
    action_taken TEXT NOT NULL,
    details_json TEXT,
    occurred_at TEXT NOT NULL
);
