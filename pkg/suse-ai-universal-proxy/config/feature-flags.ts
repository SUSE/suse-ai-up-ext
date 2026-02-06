/**
 * Feature Flags Configuration
 * Following standard patterns for feature flag management
 * Defines feature flags and their default states
 */

import { FEATURE_FLAGS } from '../utils/constants';
import type { FeatureCategory } from './suseai';
import { FEATURE_CATEGORIES } from './suseai';

// === Feature Definition ===
export interface FeatureFlagDefinition {
  flag: FeatureFlag;
  name: string;
  description: string;
  category: FeatureCategory;
  defaultEnabled: boolean;
  experimental?: boolean;
  deprecated?: boolean;
  dependsOn?: FeatureFlag[];
  conflictsWith?: FeatureFlag[];
  minVersion?: {
    rancher?: string;
    kubernetes?: string;
    helm?: string;
  };
  documentation?: string;
}

// === Feature Flag Definitions ===
export const FEATURE_DEFINITIONS: Record<FeatureFlag, FeatureFlagDefinition> = {
  [FEATURE_FLAGS.BULK_OPERATIONS]: {
    flag: FEATURE_FLAGS.BULK_OPERATIONS,
    name: 'Bulk Operations',
    description: 'Install, upgrade, or uninstall multiple applications simultaneously',
    category: FEATURE_CATEGORIES.CORE,
    defaultEnabled: true,
    minVersion: {
      rancher: '2.6.0',
      kubernetes: '1.20.0'
    },
    documentation: '/docs/features/bulk-operations'
  },

  [FEATURE_FLAGS.ADVANCED_FILTERING]: {
    flag: FEATURE_FLAGS.ADVANCED_FILTERING,
    name: 'Advanced Filtering',
    description: 'Enhanced search and filter capabilities for applications',
    category: FEATURE_CATEGORIES.CORE,
    defaultEnabled: true,
    documentation: '/docs/features/advanced-filtering'
  },

  [FEATURE_FLAGS.CUSTOM_REPOSITORIES]: {
    flag: FEATURE_FLAGS.CUSTOM_REPOSITORIES,
    name: 'Custom Repositories',
    description: 'Add and manage custom Helm chart repositories',
    category: FEATURE_CATEGORIES.ADVANCED,
    defaultEnabled: true,
    minVersion: {
      rancher: '2.6.0',
      helm: '3.8.0'
    },
    documentation: '/docs/features/custom-repositories'
  },

  [FEATURE_FLAGS.HEALTH_MONITORING]: {
    flag: FEATURE_FLAGS.HEALTH_MONITORING,
    name: 'Health Monitoring',
    description: 'Real-time health monitoring and alerting for installed applications',
    category: FEATURE_CATEGORIES.ADVANCED,
    defaultEnabled: false,
    experimental: true,
    minVersion: {
      rancher: '2.6.0',
      kubernetes: '1.21.0'
    },
    documentation: '/docs/features/health-monitoring'
  },

  [FEATURE_FLAGS.AUTO_UPDATES]: {
    flag: FEATURE_FLAGS.AUTO_UPDATES,
    name: 'Automatic Updates',
    description: 'Automatically update applications to latest compatible versions',
    category: FEATURE_CATEGORIES.ADVANCED,
    defaultEnabled: false,
    experimental: true,
    minVersion: {
      rancher: '2.7.0',
      kubernetes: '1.22.0'
    },
    dependsOn: [FEATURE_FLAGS.HEALTH_MONITORING],
    documentation: '/docs/features/auto-updates'
  },

  [FEATURE_FLAGS.ROLLBACK_SUPPORT]: {
    flag: FEATURE_FLAGS.ROLLBACK_SUPPORT,
    name: 'Application Rollback',
    description: 'Rollback applications to previous versions',
    category: FEATURE_CATEGORIES.ADVANCED,
    defaultEnabled: true,
    minVersion: {
      helm: '3.8.0'
    },
    documentation: '/docs/features/rollback-support'
  },

  [FEATURE_FLAGS.MULTI_CLUSTER]: {
    flag: FEATURE_FLAGS.MULTI_CLUSTER,
    name: 'Multi-Cluster Management',
    description: 'Manage applications across multiple Kubernetes clusters',
    category: FEATURE_CATEGORIES.ENTERPRISE,
    defaultEnabled: true,
    minVersion: {
      rancher: '2.6.0'
    },
    documentation: '/docs/features/multi-cluster'
  },

  [FEATURE_FLAGS.OFFLINE_MODE]: {
    flag: FEATURE_FLAGS.OFFLINE_MODE,
    name: 'Offline Mode',
    description: 'Support for air-gapped environments without internet access',
    category: FEATURE_CATEGORIES.ENTERPRISE,
    defaultEnabled: false,
    experimental: true,
    conflictsWith: [FEATURE_FLAGS.AUTO_UPDATES],
    documentation: '/docs/features/offline-mode'
  },

  [FEATURE_FLAGS.BACKUP_RESTORE]: {
    flag: FEATURE_FLAGS.BACKUP_RESTORE,
    name: 'Backup & Restore',
    description: 'Backup and restore application configurations and data',
    category: FEATURE_CATEGORIES.ENTERPRISE,
    defaultEnabled: false,
    experimental: true,
    minVersion: {
      rancher: '2.7.0',
      kubernetes: '1.22.0'
    },
    documentation: '/docs/features/backup-restore'
  },

  [FEATURE_FLAGS.SECURITY_SCANNING]: {
    flag: FEATURE_FLAGS.SECURITY_SCANNING,
    name: 'Security Scanning',
    description: 'Automated security vulnerability scanning for applications',
    category: FEATURE_CATEGORIES.ENTERPRISE,
    defaultEnabled: false,
    experimental: true,
    minVersion: {
      rancher: '2.7.0',
      kubernetes: '1.21.0'
    },
    documentation: '/docs/features/security-scanning'
  },

  // Service-specific features (dynamically enabled based on user selection)
  [FEATURE_FLAGS.MCP_GATEWAY]: {
    flag: FEATURE_FLAGS.MCP_GATEWAY,
    name: 'MCP Gateway',
    description: 'Model Context Protocol gateway for AI interactions',
    category: FEATURE_CATEGORIES.CORE,
    defaultEnabled: false,
    documentation: '/docs/services/mcp-gateway'
  },

  [FEATURE_FLAGS.MCP_REGISTRY]: {
    flag: FEATURE_FLAGS.MCP_REGISTRY,
    name: 'MCP Registry',
    description: 'Registry for managing MCP connections and installations',
    category: FEATURE_CATEGORIES.CORE,
    defaultEnabled: false,
    documentation: '/docs/services/mcp-registry'
  },

  [FEATURE_FLAGS.VIRTUAL_MCP]: {
    flag: FEATURE_FLAGS.VIRTUAL_MCP,
    name: 'Virtual MCP',
    description: 'Virtual Model Context Protocol servers',
    category: FEATURE_CATEGORIES.CORE,
    defaultEnabled: false,
    documentation: '/docs/services/virtual-mcp'
  },

  [FEATURE_FLAGS.SMART_AGENTS]: {
    flag: FEATURE_FLAGS.SMART_AGENTS,
    name: 'SmartAgents',
    description: 'Intelligent agents for automated tasks and workflows',
    category: FEATURE_CATEGORIES.CORE,
    defaultEnabled: false,
    documentation: '/docs/services/smart-agents'
  }
};

// === Feature Categories Configuration ===
export const CATEGORY_CONFIGS = {
  [FEATURE_CATEGORIES.CORE]: {
    name: 'Core Features',
    description: 'Essential features available to all users',
    priority: 1,
    defaultEnabled: true
  },
  [FEATURE_CATEGORIES.ADVANCED]: {
    name: 'Advanced Features',
    description: 'Advanced functionality for power users',
    priority: 2,
    defaultEnabled: false
  },
  [FEATURE_CATEGORIES.EXPERIMENTAL]: {
    name: 'Experimental Features',
    description: 'Early preview features (may be unstable)',
    priority: 3,
    defaultEnabled: false
  },
  [FEATURE_CATEGORIES.ENTERPRISE]: {
    name: 'Enterprise Features',
    description: 'Enterprise-grade features for production environments',
    priority: 4,
    defaultEnabled: false
  }
};

// === Helper Functions ===

/**
 * Get all features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureFlagDefinition[] {
  return Object.values(FEATURE_DEFINITIONS).filter(feature => feature.category === category);
}

/**
 * Get feature definition by flag
 */
export function getFeatureDefinition(flag: FeatureFlag): FeatureFlagDefinition | null {
  return FEATURE_DEFINITIONS[flag] || null;
}

/**
 * Check if feature has dependencies
 */
export function hasFeatureDependencies(flag: FeatureFlag): boolean {
  const feature = FEATURE_DEFINITIONS[flag];
  return !!(feature?.dependsOn && feature.dependsOn.length > 0);
}

/**
 * Get feature dependencies
 */
export function getFeatureDependencies(flag: FeatureFlag): FeatureFlag[] {
  const feature = FEATURE_DEFINITIONS[flag];
  return feature?.dependsOn || [];
}

/**
 * Check if features conflict
 */
export function hasFeatureConflicts(flag: FeatureFlag): boolean {
  const feature = FEATURE_DEFINITIONS[flag];
  return !!(feature?.conflictsWith && feature.conflictsWith.length > 0);
}

/**
 * Get conflicting features
 */
export function getFeatureConflicts(flag: FeatureFlag): FeatureFlag[] {
  const feature = FEATURE_DEFINITIONS[flag];
  return feature?.conflictsWith || [];
}

// === Feature Flag Utility Functions ===

export function featureEnabled(feature: FeatureFlag, clusterVersion?: string, store?: any): boolean {
  const definition = FEATURE_DEFINITIONS[feature];
  if (!definition) return false;

  // Check service-specific features based on selected services in store
  const serviceFeatureMap: Record<string, string> = {
    [FEATURE_FLAGS.MCP_GATEWAY]: 'mcp-gateway',
    [FEATURE_FLAGS.MCP_REGISTRY]: 'mcp-registry',
    [FEATURE_FLAGS.VIRTUAL_MCP]: 'virtual-mcp',
    [FEATURE_FLAGS.SMART_AGENTS]: 'smart-agents'
  };

  if (feature in serviceFeatureMap) {
    if (!store) return false;
    const selectedServices = (store.state as any).suseai?.settings?.selectedServices || [];
    const serviceId = serviceFeatureMap[feature];
    return selectedServices.includes(serviceId);
  }

  // For other features, use default enabled state
  return definition.defaultEnabled;
}

export function getClusterVersion(): string {
  return 'v1.0.0'; // Stub
}

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

export default FEATURE_DEFINITIONS;