// Constants for SUSE AI Rancher Extension

export const PRODUCT_NAME = 'SUSE AI Rancher Extension';
export const PRODUCT_SLUG = 'suseai';
export const EXTENSION_VERSION = '0.1.0';

export const FEATURE_FLAGS = {
  BULK_OPERATIONS: 'bulk-operations',
  ADVANCED_FILTERING: 'advanced-filtering',
  CUSTOM_REPOSITORIES: 'custom-repositories',
  HEALTH_MONITORING: 'health-monitoring',
  AUTO_UPDATES: 'auto-updates',
  ROLLBACK_SUPPORT: 'rollback-support',
  MULTI_CLUSTER: 'multi-cluster',
  OFFLINE_MODE: 'offline-mode',
  BACKUP_RESTORE: 'backup-restore',
  SECURITY_SCANNING: 'security-scanning',
  // Service-specific features
  MCP_GATEWAY: 'mcp-gateway',
  MCP_REGISTRY: 'mcp-registry',
  VIRTUAL_MCP: 'virtual-mcp',
  SMART_AGENTS: 'smart-agents'
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

export const DEFAULT_VALUES = {
  NAMESPACE: 'default',
  MAX_CONCURRENT_OPERATIONS: 3
};

export const TIMEOUT_VALUES = {
  SHORT: 5000,
  EXTENDED: 30000
};

export const STORAGE_KEYS = {
  SETTINGS: 'suseai-settings'
};

export const HELM_CONSTANTS = {
  RELEASE_NAME: 'release-name',
  CHART_VERSION: 'chart-version'
};