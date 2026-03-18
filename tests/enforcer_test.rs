use edinburgh_protocol::orchestration::enforcer::*;

// -- 1. Built-in rules --

#[test]
fn test_new_has_builtin_rules() {
    let enforcer = Enforcer::new();
    let rules = enforcer.rules();
    assert_eq!(rules.len(), 4);

    let names: Vec<&str> = rules.iter().map(|r| r.name.as_str()).collect();
    assert!(names.contains(&"health_gate"));
    assert!(names.contains(&"derisk_on_health_breach"));
    assert!(names.contains(&"oracle_staleness"));
    assert!(names.contains(&"concentration_limit"));
}

// -- 2. Unrelated tool -> Allow --

#[test]
fn test_pre_check_allows_normal_call() {
    let mut enforcer = Enforcer::new();
    let verdict = enforcer.pre_check("some_random_tool");
    assert_eq!(verdict.action, Action::Allow);
    assert!(verdict.rule.is_none());
}

// -- 3. Derisk on health breach blocks --

#[test]
fn test_derisk_on_health_breach_blocks() {
    let mut enforcer = Enforcer::new();

    // sentinel_check without a preceding health_ok should Block.
    let verdict = enforcer.pre_check("sentinel_check");
    assert_eq!(verdict.action, Action::Block);
    assert_eq!(verdict.rule.as_deref(), Some("derisk_on_health_breach"));
}

// -- 4. Derisk allows when health_ok present --

#[test]
fn test_derisk_allows_with_health_ok() {
    let mut enforcer = Enforcer::new();
    enforcer.post_check("health_ok");

    let verdict = enforcer.pre_check("sentinel_check");
    assert_eq!(verdict.action, Action::Allow);
}

// -- 5. Oracle staleness warns --

#[test]
fn test_oracle_staleness_warns() {
    let mut enforcer = Enforcer::new();

    // adapter_query without oracle_fresh should Warn.
    let verdict = enforcer.pre_check("adapter_query");
    assert_eq!(verdict.action, Action::Warn);
    assert_eq!(verdict.rule.as_deref(), Some("oracle_staleness"));
}

// -- 6. Oracle allows when fresh --

#[test]
fn test_oracle_allows_when_fresh() {
    let mut enforcer = Enforcer::new();
    enforcer.post_check("oracle_fresh");

    let verdict = enforcer.pre_check("adapter_query");
    assert_eq!(verdict.action, Action::Allow);
}

// -- 7. Concentration limit blocks --

#[test]
fn test_concentration_limit_blocks() {
    let mut enforcer = Enforcer::new();
    enforcer.post_check("deposit_usdc");
    enforcer.post_check("deposit_usdc");
    enforcer.post_check("deposit_usdc");

    // 3+ deposits without a rebalance -> Block
    let verdict = enforcer.pre_check("deposit_usdc");
    assert_eq!(verdict.action, Action::Block);
    assert_eq!(verdict.rule.as_deref(), Some("concentration_limit"));
}

// -- 8. Concentration allows after rebalance --

#[test]
fn test_concentration_allows_after_rebalance() {
    let mut enforcer = Enforcer::new();
    enforcer.post_check("deposit_usdc");
    enforcer.post_check("deposit_usdc");
    enforcer.post_check("deposit_usdc");
    enforcer.post_check("rebalance");

    let verdict = enforcer.pre_check("deposit_usdc");
    assert_eq!(verdict.action, Action::Allow);
}

// -- 9. Post check maintains window --

#[test]
fn test_post_check_maintains_window() {
    let mut enforcer = Enforcer::new();

    // Push more than max_history calls
    for i in 0..150 {
        enforcer.post_check(&format!("tool_{i}"));
    }

    // The enforcer's max_history is 100, so only the last 100 should remain.
    // We can verify indirectly: add oracle_fresh early, then fill to push it
    // out, and oracle_staleness should fire on adapter_query.
    let mut enforcer2 = Enforcer::new();
    enforcer2.post_check("oracle_fresh");
    for i in 0..100 {
        enforcer2.post_check(&format!("filler_{i}"));
    }
    // oracle_fresh was evicted so warn fires
    let verdict = enforcer2.pre_check("adapter_query");
    assert_eq!(verdict.action, Action::Warn);
}

// -- 10. Set rule enabled --

#[test]
fn test_set_rule_enabled() {
    let mut enforcer = Enforcer::new();

    // Disable derisk_on_health_breach
    let found = enforcer.set_rule_enabled("derisk_on_health_breach", false);
    assert!(found);

    // Now sentinel_check without health_ok should not block from that rule
    let verdict = enforcer.pre_check("sentinel_check");
    assert_eq!(verdict.action, Action::Allow);

    // Disabling a nonexistent rule returns false
    let not_found = enforcer.set_rule_enabled("nonexistent_rule", false);
    assert!(!not_found);
}

// -- 11. Log verdict and get log --

#[test]
fn test_log_verdict_and_get_log() {
    let tmp = tempfile::NamedTempFile::new().unwrap();
    let db = edinburgh_protocol::store::state::StateDb::open(tmp.path()).unwrap();
    let session_id = db.create_session(Some("test-project")).unwrap();

    let verdict = Verdict {
        action: Action::Block,
        rule: Some("derisk_on_health_breach".into()),
        reason: Some("Health checks failing".into()),
    };

    Enforcer::log_verdict(&db, &session_id, &verdict, "sentinel_check").unwrap();

    let log = Enforcer::get_log(&db, Some(&session_id), 10);
    assert_eq!(log.len(), 1);

    let entry = &log[0];
    assert_eq!(entry.session_id.as_deref(), Some(session_id.as_str()));
    assert_eq!(entry.rule, "derisk_on_health_breach");
    assert_eq!(entry.action, "block");
    assert_eq!(entry.tool_call.as_deref(), Some("sentinel_check"));
    assert_eq!(
        entry.reason.as_deref(),
        Some("Health checks failing")
    );
}

// -- 12. Get log empty --

#[test]
fn test_get_log_empty() {
    let tmp = tempfile::NamedTempFile::new().unwrap();
    let db = edinburgh_protocol::store::state::StateDb::open(tmp.path()).unwrap();

    let log = Enforcer::get_log(&db, Some("nonexistent-session"), 10);
    assert!(log.is_empty());
}
