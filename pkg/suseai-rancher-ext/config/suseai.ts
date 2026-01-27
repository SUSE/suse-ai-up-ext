/**
 * Main SUSE AI Product Configuration
 * Following standard patterns for product configuration
 * Centralizes product-specific constants and configurations
 */

import { PRODUCT_NAME, PRODUCT_SLUG, EXTENSION_VERSION } from '../utils/constants';

// === Product Constants ===
export const PRODUCT = PRODUCT_SLUG;
export const BLANK_CLUSTER = '_';

// === Product Definition ===
export interface ProductConfig {
  name: string;
  slug: string;
  version: string;
  category: string;
  weight: number;
  icon: string;
  svg?: string;
  inStore: string;
  supportRoute?: string;
  docsRoute?: string;
}

export const SUSEAI_PRODUCT: ProductConfig = {
  name: PRODUCT_NAME,
  slug: PRODUCT_SLUG,
  version: EXTENSION_VERSION,
  category: 'global',
  weight: 80,
  icon: 'fork',
  inStore: 'management',
  supportRoute: 'https://www.suse.com/support/',
  docsRoute: 'https://documentation.suse.com/'
};

// === Navigation Configuration ===
export interface NavItem {
  name: string;
  label: string;
  route: {
    name: string;
    params: Record<string, string>;
    meta: Record<string, string>;
  };
  exact?: boolean;
  icon?: string;
}



// === Page Definitions ===
export const PAGE_TYPES = {

  SETTINGS: 'settings',
   UP: "SUSE AI Universal Proxy",
  HOME: "Home",
  MCPGATEWAY: "mcp-gateway",
  MCPREGISTRY: "mcp-registry",
  VIRTUALMCP: "virtual-mcp",
  SMARTAGENTS: "smart-agents",
  QUICKSTARTS: "quickstarts"

} as const;

export type PageType = typeof PAGE_TYPES[keyof typeof PAGE_TYPES];

// === Virtual Type Configuration ===
export interface VirtualTypeConfig {
  name: string;
  label: string;
  route: NavItem['route'];
  children?: NavItem[];
}

export const VIRTUAL_TYPES: VirtualTypeConfig[] = [

  {
    name: PAGE_TYPES.UP,
    label: 'SUSE AI Universal Proxy',
    route: {
      name: `c-cluster-${PRODUCT}-universal-adapter`,
      params: { product: PRODUCT, cluster: BLANK_CLUSTER },
      meta: { product: PRODUCT }
    }
  },
  {
    name: PAGE_TYPES.MCPGATEWAY,
    label: 'MCP Gateway',
    route: {
      name: `c-cluster-${PRODUCT}-mcp-gateway`,
      params: { product: PRODUCT, cluster: BLANK_CLUSTER },
      meta: { product: PRODUCT }
      }
  },
  {
    name: PAGE_TYPES.MCPREGISTRY,
    label: 'MCP Registry',
    route: {
      name: `c-cluster-${PRODUCT}-mcp-registry`,
      params: { product: PRODUCT, cluster: BLANK_CLUSTER },
      meta: { product: PRODUCT }
      }
  },
  {
    name: PAGE_TYPES.VIRTUALMCP,
    label: 'Virtual MCP',
    route: {
      name: `c-cluster-${PRODUCT}-virtual-mcp`,
      params: { product: PRODUCT, cluster: BLANK_CLUSTER },
      meta: { product: PRODUCT }
    }
  },
   {
     name: PAGE_TYPES.SMARTAGENTS,
     label: 'SmartAgents',
     route: {
       name: `c-cluster-${PRODUCT}-smart-agents`,
       params: { product: PRODUCT, cluster: BLANK_CLUSTER },
       meta: { product: PRODUCT }
     }
   },
    {
      name: PAGE_TYPES.SETTINGS,
      label: 'Global Settings',
      route: {
        name: `c-cluster-${PRODUCT}-settings`,
        params: { product: PRODUCT, cluster: BLANK_CLUSTER },
        meta: { product: PRODUCT }
      }
    }
 ];





// === Product Metadata ===
export const PRODUCT_METADATA = {
  displayName: PRODUCT_NAME,
  description: 'Enterprise AI/ML application management for Kubernetes',
  vendor: 'SUSE',
  homepage: 'https://www.suse.com/',
  repository: 'https://github.com/suse/suseai-rancher-ext',
  license: 'Apache-2.0',
  keywords: ['ai', 'ml', 'kubernetes', 'helm', 'applications'],
  categories: ['AI/ML', 'Applications', 'Management'],
  maturity: 'stable',
  support: {
    level: 'enterprise',
    contact: 'support@suse.com',
    documentation: 'https://documentation.suse.com/',
    community: 'https://community.suse.com/'
  }
};

// === Feature Categories ===
export const FEATURE_CATEGORIES = {
  CORE: 'core',
  ADVANCED: 'advanced',
  EXPERIMENTAL: 'experimental',
  ENTERPRISE: 'enterprise'
} as const;

export type FeatureCategory = typeof FEATURE_CATEGORIES[keyof typeof FEATURE_CATEGORIES];

// === SUSE AI Proxy Configuration ===
export interface SUSEAIProxyConfig {
  allowedNamespaces?: string[];  // Optional: limit search to these namespaces
  selectedServer?: {
    clusterId: string;
    namespace: string;
    podName: string;
    serviceUrl: string;
  };
}

// === Export defaults ===
export default SUSEAI_PRODUCT;