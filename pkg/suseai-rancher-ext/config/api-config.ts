/**
 * API Configuration for SUSE AI Rancher Extension
 * Centralizes all API endpoints and base URLs
 */

import { reactive, ref } from 'vue';

// Base URLs for different services
export const getApiBaseUrls = (serviceUrl?: string, useHttps: boolean = false) => {
  const protocol = useHttps ? 'https' : 'http';
  const mcpPort = useHttps ? 38911 : 8911;
  const discoveryPort = useHttps ? 38911 : 8911;
  const proxyPort = useHttps ? 38911 : 8911;

  if (serviceUrl) {
    // Extract IP from serviceUrl (e.g., http://192.168.1.100:8911 -> 192.168.1.100)
    const url = new URL(serviceUrl);
    const ip = url.hostname;
    return {
      MCP_GATEWAY: `${protocol}://${ip}:${mcpPort}`,
      DISCOVERY: `${protocol}://${ip}:${discoveryPort}`,
      PROXY: `${protocol}://${ip}:${proxyPort}`,
      REGISTRY: `http://${ip}:8911`,
      PLUGINS: `http://${ip}:8914`,
      VIRTUAL_MCP: `http://${ip}:8911/api/v1`,
      SMART_AGENTS: `http://${ip}:8910`,
      RANCHER: window.location.origin
    };
  }

  // Use current hostname as default instead of hardcoded IP
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return {
    MCP_GATEWAY: `${protocol}://${currentHost}:${mcpPort}`,
    DISCOVERY: `${protocol}://${currentHost}:${discoveryPort}`,
    PROXY: `${protocol}://${currentHost}:${proxyPort}`,
    REGISTRY: `http://${currentHost}:8911`,
    PLUGINS: `http://${currentHost}:8914`,
    VIRTUAL_MCP: `http://${currentHost}:8911/api/v1`,
    SMART_AGENTS: `http://${currentHost}:8910`,
    RANCHER: window.location.origin
  };
};

// HTTPS configuration
export const useHttps = ref(false);

// Initialize with default localhost as reactive object
export const API_BASE_URLS = reactive(getApiBaseUrls());

// Function to update API base URLs dynamically
export const updateApiBaseUrls = (serviceUrl?: string, httpsOverride?: boolean) => {
  const useHttpsFlag = httpsOverride !== undefined ? httpsOverride : useHttps.value;
  const newApiBaseUrls = getApiBaseUrls(serviceUrl, useHttpsFlag);
  // Update the reactive object properties
  Object.assign(API_BASE_URLS, newApiBaseUrls);
  return newApiBaseUrls;
};

// Function to toggle HTTPS mode
export const setHttpsMode = (enabled: boolean) => {
  useHttps.value = enabled;
  updateApiBaseUrls();
};

// API Endpoints for MCP Gateway
export const MCP_ENDPOINTS = {
  // Adapter Management
  ADAPTERS: '/api/v1/adapters',
  ADAPTER_DETAILS: (name: string) => `/api/v1/adapters/${name}`,
  ADAPTER_STATUS: (name: string) => `/api/v1/adapters/${name}/status`,
  ADAPTER_LOGS: (name: string) => `/api/v1/adapters/${name}/logs`,
   ADAPTER_UPDATE: (name: string) => `/api/v1/adapters/${name}`,
   ADAPTER_DELETE: (name: string) => `/api/v1/adapters/${name}`,
   ADAPTER_HEALTH: (name: string) => `/api/v1/adapters/${name}/health`,

  // Session Management
  SESSIONS: (name: string) => `/api/v1/adapters/${name}/sessions`,
  SESSIONS_REINITIALIZE: (name: string) => `/api/v1/adapters/${name}/sessions`,

  // Token Management
  ADAPTER_TOKEN: (name: string) => `/api/v1/adapters/${name}/token`,
  ADAPTER_TOKEN_REFRESH: (name: string) => `/api/v1/adapters/${name}/token/refresh`,
  ADAPTER_TOKEN_VALIDATE: (name: string) => `/api/v1/adapters/${name}/token/validate`,
  ADAPTER_CLIENT_TOKEN: (name: string) => `/api/v1/adapters/${name}/client-token`,
  ADAPTER_TEST_AUTH: (name: string) => `/api/v1/adapters/${name}/test-auth`,
  ADAPTER_VALIDATE_AUTH: (name: string) => `/api/v1/adapters/${name}/validate-auth`,

  // MCP Communication
  ADAPTER_SSE: (name: string) => `/api/v1/adapters/${name}/sse`,
  ADAPTER_MESSAGES: (name: string) => `/api/v1/adapters/${name}/messages`,
  ADAPTER_MCP: (name: string) => `/api/v1/adapters/${name}/mcp`,
  ADAPTER_WEBSOCKET: (name: string) => `/api/v1/adapters/${name}/ws`,

  // Network Discovery
  DISCOVERY_SCAN: '/api/v1/discovery/scan',
  DISCOVERY_SERVERS: '/api/v1/discovery/servers',
  DISCOVERY_RESULTS: '/api/v1/discovery/results',
  DISCOVERY_SERVER_DETAILS: (id: string) => `/api/v1/discovery/results/${id}`,
  DISCOVERY_REGISTER: '/api/v1/discovery/register',

  // Legacy endpoints (for backward compatibility)
   SCAN_START: '/api/v1/discovery/scan',
   SCAN_STATUS: (scanId: string) => `/api/v1/discovery/scan/${scanId}`,
  SERVERS: '/api/v1/servers',
  REGISTER_SERVER: '/api/v1/registry/upload',

  // Registry Management
  REGISTRY_BROWSE: '/api/v1/registry/browse',
  REGISTRY_PUBLIC: '/api/v1/registry/browse',
  REGISTRY_SYNC_OFFICIAL: '/api/v1/registry/reload',
  REGISTRY_UPLOAD: '/api/v1/registry/upload',
  REGISTRY_UPLOAD_BULK: '/api/v1/registry/upload',
  REGISTRY_UPLOAD_LOCAL_MCP: '/api/v1/registry/upload',
  REGISTRY_DETAILS: (id: string) => `/api/v1/registry/${id}`,
  REGISTRY_CREATE_ADAPTER: (id: string) => `/api/v1/registry/${id}/create-adapter`,

  // Deployment Management
  DEPLOYMENT_CONFIG: (serverId: string) => `/api/v1/deployment/config/${serverId}`,
  DEPLOYMENT_DEPLOY: '/api/v1/deployment/deploy',

  // Plugin Services
  PLUGIN_SERVICES: '/api/v1/plugins',
  PLUGIN_REGISTER: '/api/v1/plugins',
  PLUGIN_HEALTH: (serviceId: string) => `/api/v1/plugins/${serviceId}/health`,
  PLUGIN_UNREGISTER: (serviceId: string) => `/api/v1/plugins/${serviceId}`,
  PLUGIN_SERVICES_BY_TYPE: (serviceType: string) => `/api/v1/plugins/type/${serviceType}`,

  // System
  HEALTH: '/health',
  METRICS: '/metrics',
  DOCS: '/docs',
  SWAGGER_JSON: '/swagger.json'
} as const;

// API Endpoints for Smart Agents
export const SMART_AGENTS_ENDPOINTS = {
  AGENTS: '/agents',
  AGENT_DETAILS: (id: string) => `/agents/${id}`,
  AGENT_CREATE: '/agents',
  AGENT_UPDATE: (id: string) => `/agents/${id}`,
  AGENT_DELETE: (id: string) => `/agents/${id}`
} as const;

// API Configuration
export const API_CONFIG = {
  // Default timeout for requests (in milliseconds)
  DEFAULT_TIMEOUT: 10000,
  
  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Rate limiting
  RATE_LIMITS: {
    MANAGEMENT: 100, // requests per minute
    COMMUNICATION: 1000, // requests per minute
    HEALTH_CHECK: Infinity // unlimited
  },
  
  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // SSE Headers
  SSE_HEADERS: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  },
  
  // WebSocket configuration
  WS_CONFIG: {
    protocols: ['mcp-v1'],
    reconnectAttempts: 5,
    reconnectDelay: 2000
  }
} as const;

// Environment-specific configuration
export const getApiConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    baseURL: API_BASE_URLS.MCP_GATEWAY,
    timeout: API_CONFIG.DEFAULT_TIMEOUT,
    headers: API_CONFIG.DEFAULT_HEADERS,
    retryAttempts: isDevelopment ? 1 : API_CONFIG.RETRY_ATTEMPTS,
    enableLogging: isDevelopment,
    validateStatus: (status: number) => status >= 200 && status < 300
  };
};

// Helper function to build full URLs
export const buildUrl = (base: string, endpoint: string): string => {
  return `${base.replace(/\/$/, '')}${endpoint}`;
};

// Helper function to get MCP Gateway URLs
export const getMcpUrl = (endpoint: string): string => {
  return buildUrl(API_BASE_URLS.MCP_GATEWAY, endpoint);
};

// Helper function to get Smart Agents URLs
export const getSmartAgentsUrl = (endpoint: string): string => {
  return buildUrl(API_BASE_URLS.SMART_AGENTS, endpoint);
};

export default {
  API_BASE_URLS,
  MCP_ENDPOINTS,
  SMART_AGENTS_ENDPOINTS,
  API_CONFIG,
  getApiConfig,
  buildUrl,
  getMcpUrl,
  getSmartAgentsUrl,
  useHttps,
  setHttpsMode
};