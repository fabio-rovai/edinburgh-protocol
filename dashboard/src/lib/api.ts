const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface AdapterInfo {
  name: string;
  adapter_type: string;
  risk_level: string;
  current_tvl: number;
  current_apy: number;
  is_active: boolean;
}

export interface AdapterHealth {
  adapter: string;
  health_score: number;
  status: string;
  last_check: string;
}

export interface VaultStatus {
  total_tvl: number;
  total_yield: number;
  total_disbursed: number;
  active_adapters: number;
  allocations: Record<string, number>;
}

export interface SentinelStatus {
  status: string;
  checks_completed: number;
  last_check: string;
  current_action: string;
}

export interface RiskAssessment {
  overall_health: number;
  adapter_scores: Record<string, number>;
  alerts: Alert[];
  enforcer_rules: EnforcerRule[];
}

export interface Alert {
  severity: string;
  message: string;
  timestamp: string;
}

export interface EnforcerRule {
  name: string;
  rule_type: string;
  enabled: boolean;
}

export interface Disbursement {
  date: string;
  recipient: string;
  amount: number;
  tx_hash: string;
}

export interface DisbursementsResponse {
  disbursements: Disbursement[];
  total_disbursed: number;
  total_recipients: number;
  total_transactions: number;
}

export interface YieldEvent {
  timestamp: string;
  adapter: string;
  amount: number;
  apy: number;
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  health: () => fetchApi<{ status: string }>('/health'),
  adapters: () => fetchApi<AdapterInfo[]>('/api/v1/adapters'),
  adapterHealth: (name: string) =>
    fetchApi<AdapterHealth>(`/api/v1/adapters/${name}/health`),
  vaultStatus: () => fetchApi<VaultStatus>('/api/v1/vault/status'),
  vaultRisk: () => fetchApi<RiskAssessment>('/api/v1/vault/risk'),
  sentinelStatus: () =>
    fetchApi<SentinelStatus>('/api/v1/sentinel/status'),
  riskAssessment: () =>
    fetchApi<RiskAssessment>('/api/v1/risk/assessment'),
  yieldHistory: () =>
    fetchApi<YieldEvent[]>('/api/v1/vault/yield/history'),
  disbursements: () =>
    fetchApi<DisbursementsResponse>('/api/v1/disbursements'),
};
