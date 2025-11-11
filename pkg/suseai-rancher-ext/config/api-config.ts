/**
 * API Configuration for SUSE AI Rancher Extension
 * Centralizes all API endpoints and base URLs
 */

// Base URLs for different services
export const API_BASE_URLS = {
  MCP_GATEWAY: 'http://localhost:8911/api/v1',
  SMART_AGENTS: 'http://localhost:8910',
  RANCHER: window.location.origin
} as const;

// API Endpoints for MCP Gateway
export const MCP_ENDPOINTS = {
  // Adapter Management
  ADAPTERS: '/adapters',
  ADAPTER_DETAILS: (name: string) => `/adapters/${name}`,
  ADAPTER_STATUS: (name: string) => `/adapters/${name}/status`,
  ADAPTER_LOGS: (name: string) => `/adapters/${name}/logs`,
  ADAPTER_UPDATE: (name: string) => `/adapters/${name}`,
  ADAPTER_DELETE: (name: string) => `/adapters/${name}`,
  
  // Session Management
  SESSIONS: (name: string) => `/adapters/${name}/sessions`,
  SESSION_DETAILS: (name: string, sessionId: string) => `/adapters/${name}/sessions/${sessionId}`,
  SESSION_CREATE: (name: string) => `/adapters/${name}/sessions`,
  SESSION_DELETE: (name: string, sessionId: string) => `/adapters/${name}/sessions/${sessionId}`,
  SESSION_DELETE_ALL: (name: string) => `/adapters/${name}/sessions`,
  
  // Token Management
  ADAPTER_TOKEN: (name: string) => `/adapters/${name}/token`,
  ADAPTER_TOKEN_REFRESH: (name: string) => `/adapters/${name}/token/refresh`,
  ADAPTER_TOKEN_VALIDATE: (name: string) => `/adapters/${name}/token/validate`,
  ADAPTER_CLIENT_TOKEN: (name: string) => `/adapters/${name}/client-token`,
  ADAPTER_TEST_AUTH: (name: string) => `/adapters/${name}/test-auth`,
  ADAPTER_VALIDATE_AUTH: (name: string) => `/adapters/${name}/validate-auth`,
  
  // MCP Communication
  ADAPTER_SSE: (name: string) => `/adapters/${name}/sse`,
  ADAPTER_MESSAGES: (name: string) => `/adapters/${name}/messages`,
  ADAPTER_MCP: (name: string) => `/adapters/${name}/mcp`,
  ADAPTER_WEBSOCKET: (name: string) => `/adapters/${name}/ws`,
  
  // Network Discovery
  DISCOVERY_SCAN: '/discovery/scan',
  DISCOVERY_SERVERS: '/discovery/servers',
  DISCOVERY_SERVER_DETAILS: (id: string) => `/discovery/servers/${id}`,
  DISCOVERY_REGISTER: '/discovery/register',
  
  // Legacy endpoints (for backward compatibility)
  SCAN_START: '/scan',
  SCAN_STATUS: (scanId: string) => `/scan/${scanId}`,
  SERVERS: '/servers',
  REGISTER_SERVER: '/discovery/register',
  
  // Registry Management
  REGISTRY_BROWSE: '/registry/browse',
  REGISTRY_PUBLIC: '/registry/public',
  REGISTRY_SYNC_OFFICIAL: '/registry/sync/official',
  REGISTRY_UPLOAD: '/registry/upload',
  REGISTRY_UPLOAD_BULK: '/registry/upload/bulk',
  REGISTRY_UPLOAD_LOCAL_MCP: '/registry/upload/local-mcp',
  REGISTRY_DETAILS: (id: string) => `/registry/${id}`,
  
  // Deployment Management
  DEPLOYMENT_CONFIG: (serverId: string) => `/deployment/config/${serverId}`,
  DEPLOYMENT_DEPLOY: '/deployment/deploy',
  
  // Plugin Services
  PLUGIN_SERVICES: '/plugins/services',
  PLUGIN_REGISTER: '/plugins/register',
  PLUGIN_HEALTH: (serviceId: string) => `/plugins/services/${serviceId}/health`,
  PLUGIN_UNREGISTER: (serviceId: string) => `/plugins/services/${serviceId}`,
  PLUGIN_SERVICES_BY_TYPE: (serviceType: string) => `/plugins/services/type/${serviceType}`,
  
   // System
   HEALTH: '/health',
  METRICS: '/metrics',
  DOCS: '/docs',
  SWAGGER_JSON: '/swagger/doc.json'
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
  getSmartAgentsUrl
};