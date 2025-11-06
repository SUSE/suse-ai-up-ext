// MCP Service

import axios from 'axios';
import { API_BASE_URLS, MCP_ENDPOINTS, getApiConfig } from '../config/api-config';

export const apiClient = axios.create({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: getApiConfig().timeout,
});

export interface AdapterData {
  name: string;
  imageName: string;
  imageVersion: string;
  description: string;
  connectionType: string;
  protocol: string;
  replicaCount: number;
  useWorkloadIdentity: boolean;
  environmentVariables?: Record<string, string>;
  command?: string;
  args?: string[];
  originalServer?: DiscoveredServer;
  remoteUrl?: string;
  authentication?: {
    required: boolean;
    type: string;
    bearerToken?: {
      token: string;
      dynamic: boolean;
      expiresAt: string;
    };
  };
}

export interface ScanConfig {
  maxConcurrent: string | number;
  timeout: string | number;
  scanRanges: string[];
  ports: (string | number)[];
  security_test?: boolean;
  security_rules?: string;
}

export interface ScanResult {
  scanId: string;
  status: 'running' | 'completed' | 'failed';
  serverCount?: number;
  results?: DiscoveredServer[];
  security_summary?: {
    total_servers: number;
    servers_with_findings: number;
    critical_findings: number;
    warning_findings: number;
  };
  error?: string;
  message?: string;
  // Legacy fields for backward compatibility
  scan_id?: string;
  discovered_servers?: DiscoveredServer[];
}

export interface AdapterResource {
  name: string;
  status: string;
  description?: string;
  protocol: string;
  connectionType: string;
  command?: string;
  args?: string[];
  environmentVariables?: Record<string, string>;
  replicaCount: number;
  useWorkloadIdentity: boolean;
  createdAt: string;
  lastActivity?: string;
  phase?: string;
  message?: string;
  lastCheck?: string;
  imageName?: string;
  imageVersion?: string;
  originalServer?: DiscoveredServer;
  remoteUrl?: string;
  authentication?: {
    required: boolean;
    type: string;
    bearerToken?: {
      token: string;
      dynamic: boolean;
      expiresAt: string;
    };
  };
  createdBy?: string;
  lastUpdatedAt?: string;
  // Legacy fields for backward compatibility
  id?: string;
  endpoint?: string;
  errorCount?: number;
  requestCount?: number;
  lastActive?: string;
}

export interface DiscoveredServer {
  id: string;
  address: string;
  protocol: string;
  connection: string;
  status: string;
  lastSeen: string;
  port?: number;
  discoveredAt?: string;
  vulnerability_score?: 'high' | 'medium' | 'low';
  scan_results?: any;
  name?: string;
  metadata?: {
    auth_type?: string;
    detectionMethod?: string;
  };
  security_findings?: any[];
}

export interface RegistryServer {
  _meta?: Record<string, any>;
  id: string;
  name: string;
  description: string;
  version: string;
  protocol: string;
  url: string;
  validation_status: string;
  discovered_at: string;
  iconurl?: string;
  repository?: {
    source: string;
    url: string;
  };
  packages: RegistryPackage[];
  tools: RegistryTool[];
}

export interface RegistryPackage {
  identifier: string;
  registryType: string;
  transport: {
    type: string;
  };
  environmentVariables?: RegistryEnvironmentVariable[];
}

export interface RegistryEnvironmentVariable {
  name: string;
  description: string;
  default: string;
  format: string;
  isSecret: boolean;
}

export interface RegistryTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

// Session Management Interfaces
export interface SessionInfo {
  sessionId: string;
  adapterName: string;
  targetAddress: string;
  connectionType: string;
  createdAt: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'error';
  metadata?: {
    protocolVersion?: string;
    clientInfo?: {
      name: string;
      version: string;
    };
  };
}

export interface SessionListResponse {
  adapterName: string;
  sessions: SessionInfo[];
}

export interface CreateSessionRequest {
  forceReinitialize?: boolean;
  clientInfo?: {
    name: string;
    version: string;
  };
}

export interface CreateSessionResponse {
  sessionId: string;
  message: string;
  adapterName: string;
}

// Plugin Service Management Interfaces
export interface PluginService {
  service_id: string;
  service_type: string;
  service_url: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  capabilities: PluginCapability[];
  registered_at: string;
  last_health_check: string;
}

export interface PluginCapability {
  path: string;
  methods: string[];
  description: string;
}

export interface PluginServiceListResponse {
  services: PluginService[];
}

export interface RegisterServiceRequest {
  service_id: string;
  service_type: string;
  service_url: string;
  version: string;
  capabilities: PluginCapability[];
}

export interface ServiceHealthResponse {
  service_id: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message: string;
  timestamp: string;
  version: string;
  uptime?: string;
}

// MCP Communication Interfaces
export interface MCPMessage {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: Record<string, any>;
  result?: any;
  error?: any;
}

export interface MCPSessionRequest {
  sessionId: string;
  message: MCPMessage;
}

export class MCPService {
  static async createAdapter(data: AdapterData) {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.ADAPTERS, data);
      return response.data;
    } catch (error) {
      console.error('Failed to create adapter:', error);
      throw error;
    }
  }

  static async registerDiscoveredServer(serverId: string) {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTER_SERVER, { discoveredServerId: serverId });
      return response.data;
    } catch (error) {
      console.error('Failed to register discovered server:', error);
      throw error;
    }
  }

  static async startScan(config: ScanConfig): Promise<ScanResult> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.SCAN_START, config);
      return response.data;
    } catch (error) {
      console.error('Failed to start scan:', error);
      throw error;
    }
  }

  static async getScanStatus(scanId: string): Promise<ScanResult> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SCAN_STATUS(scanId));
      return response.data;
    } catch (error) {
      console.error('Failed to get scan status:', error);
      throw error;
    }
  }

  static async getScanResults(scanId: string): Promise<ScanResult> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SCAN_STATUS(scanId));
      return response.data;
    } catch (error) {
      console.error('Failed to get scan results:', error);
      throw error;
    }
  }

  static async getAdapters(): Promise<AdapterResource[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTERS);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch adapters:', error);
      return [];
    }
  }

  static async getDiscoveredServers(): Promise<DiscoveredServer[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SERVERS);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch discovered servers:', error);
      return [];
    }
  }

  static async getAdapterLogs(name: string): Promise<string> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_LOGS(name));
      return response.data || '';
    } catch (error) {
      console.error('Failed to fetch adapter logs:', error);
      return '';
    }
  }

  static async deleteAdapter(name: string) {
    try {
      await apiClient.delete(MCP_ENDPOINTS.ADAPTER_DELETE(name));
    } catch (error) {
      console.error('Failed to delete adapter:', error);
      throw error;
    }
  }

  static async ping(): Promise<boolean> {
    try {
      await apiClient.get(MCP_ENDPOINTS.PING);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getMetrics() {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.METRICS);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return null;
    }
  }

  static async getRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.REGISTRY);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch registry servers:', error);
      return [];
    }
  }

  static async getPublicRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.PUBLIC_REGISTRY);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch public registry servers:', error);
      return [];
    }
  }

  static async getPublicRegistryServersBySource(source: string): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(`${MCP_ENDPOINTS.PUBLIC_REGISTRY}?source=${source}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch registry servers for source ${source}:`, error);
      return [];
    }
  }

  static async getRegistryServer(id: string): Promise<RegistryServer | null> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.REGISTRY_DETAILS(id));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch registry server details:', error);
      return null;
    }
  }

  static async browseRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.REGISTRY_BROWSE);
      return response.data || [];
    } catch (error) {
      console.error('Failed to browse registry servers:', error);
      return [];
    }
  }

  // Adapter Details and Status
  static async getAdapterDetails(name: string): Promise<AdapterResource | null> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_DETAILS(name));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch adapter details:', error);
      return null;
    }
  }

  static async getAdapterStatus(name: string): Promise<AdapterResource | null> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_STATUS(name));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch adapter status:', error);
      return null;
    }
  }

  static async updateAdapter(name: string, updates: Partial<AdapterData>): Promise<AdapterResource> {
    try {
      const response = await apiClient.put(MCP_ENDPOINTS.ADAPTER_UPDATE(name), updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update adapter:', error);
      throw error;
    }
  }

  // Session Management
  static async listSessions(adapterName: string): Promise<SessionListResponse> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SESSIONS(adapterName));
      return response.data;
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  static async getSessionDetails(adapterName: string, sessionId: string): Promise<SessionInfo> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SESSION_DETAILS(adapterName, sessionId));
      return response.data;
    } catch (error) {
      console.error('Failed to get session details:', error);
      throw error;
    }
  }

  static async createSession(adapterName: string, request: CreateSessionRequest): Promise<CreateSessionResponse> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.SESSION_CREATE(adapterName), request);
      return response.data;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  static async deleteSession(adapterName: string, sessionId: string) {
    try {
      await apiClient.delete(MCP_ENDPOINTS.SESSION_DELETE(adapterName, sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  static async deleteAllSessions(adapterName: string) {
    try {
      await apiClient.delete(MCP_ENDPOINTS.SESSION_DELETE_ALL(adapterName));
    } catch (error) {
      console.error('Failed to delete all sessions:', error);
      throw error;
    }
  }

  // Plugin Service Management
  static async listPluginServices(): Promise<PluginServiceListResponse> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.PLUGIN_SERVICES);
      return response.data;
    } catch (error) {
      console.error('Failed to list plugin services:', error);
      throw error;
    }
  }

  static async registerPluginService(request: RegisterServiceRequest) {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.PLUGIN_REGISTER, request);
      return response.data;
    } catch (error) {
      console.error('Failed to register plugin service:', error);
      throw error;
    }
  }

  static async getServiceHealth(serviceId: string): Promise<ServiceHealthResponse> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.PLUGIN_HEALTH(serviceId));
      return response.data;
    } catch (error) {
      console.error('Failed to get service health:', error);
      throw error;
    }
  }

  static async unregisterPluginService(serviceId: string) {
    try {
      await apiClient.delete(MCP_ENDPOINTS.PLUGIN_UNREGISTER(serviceId));
    } catch (error) {
      console.error('Failed to unregister plugin service:', error);
      throw error;
    }
  }

  // MCP Communication
  static async sendMCPMessage(adapterName: string, sessionId: string, message: MCPMessage): Promise<MCPMessage> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.ADAPTER_MESSAGES(adapterName), message, {
        headers: {
          'mcp-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send MCP message:', error);
      throw error;
    }
  }

  static async establishMCPConnection(adapterName: string, message: MCPMessage): Promise<any> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.ADAPTER_MCP(adapterName), message, {
        headers: {
          'Accept': 'application/json, text/event-stream'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to establish MCP connection:', error);
      throw error;
    }
  }
}