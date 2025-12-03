// MCP Service

import axios from 'axios';
import { API_BASE_URLS, MCP_ENDPOINTS, getApiConfig } from '../config/api-config';
import type {
  Adapter,
  AdapterConfig,
  AdapterHealth,
  Session,
  SessionMetrics,
  AdapterToken,
  TokenValidationResult,
  ClientTokenRequest,
  AdapterAuthConfig,
  MCPClientConfig,
  MCPFunctionality,
  ConnectionType,
  ServerProtocol,

  DiscoveryScan,
  DiscoveryScanConfig,
  RegisterServerRequest,
  RegistryServer as EnhancedRegistryServer,
  RegistryBrowseOptions,
  RegistryBrowseResult,
  DeploymentConfig,
  DeploymentRequest,
  DeploymentResult,
  AdapterMetrics,
  SystemMetrics,
  PluginService as EnhancedPluginService,
  UploadRequest,
  CreateAdapterFromRegistryRequest,
  CreateAdapterFromRegistryResponse,
  AdapterData,
  AdapterResource
} from '../types/mcp-types';

// Re-export AdapterResource for use in components
export type { AdapterResource };

export const apiClient = axios.create({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: getApiConfig().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to update the base URL
export const updateApiBaseUrl = (newBaseUrl: string) => {
  const cleanUrl = newBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  apiClient.defaults.baseURL = `${cleanUrl}/api/v1`;
  // Also update global API_BASE_URLS
  const { updateApiBaseUrls } = require('../config/api-config');
  updateApiBaseUrls(cleanUrl);
};



export interface ServiceDiscoveredServer {
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

export type DiscoveredServer = ServiceDiscoveredServer;

export interface ScanConfig {
  maxConcurrent?: number;
  timeout?: string;
  scanRanges?: string[];
  ports?: string[];
  excludeAddresses?: string[];
  excludeProxy?: boolean;
}

export interface ScanResult {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  startTime?: string;
  endTime?: string;
  config?: ScanConfig;
  progress?: number;
  message?: string;
  results?: ServiceDiscoveredServer[];
  error?: string;
  // Legacy fields for backward compatibility
  scanId?: string;
  scan_id?: string;
  discovered_servers?: ServiceDiscoveredServer[];
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
  static async createAdapter(data: AdapterData): Promise<AdapterResource> {
    try {
      // Clean up the data before sending to API
      const cleanedData = { ...data };

      // Remove empty or undefined fields that might cause issues
      if (!cleanedData.description) delete cleanedData.description;
      if (!cleanedData.command) delete cleanedData.command;
      if (!cleanedData.args || cleanedData.args.length === 0) delete cleanedData.args;
      if (!cleanedData.remoteUrl) delete cleanedData.remoteUrl;
      if (!cleanedData.imageName) delete cleanedData.imageName;
      if (!cleanedData.imageVersion) delete cleanedData.imageVersion;
      if (!cleanedData.apiBaseUrl) delete cleanedData.apiBaseUrl;
      if (!cleanedData.replicaCount) delete cleanedData.replicaCount;
      if (!cleanedData.mcpClientConfig) delete cleanedData.mcpClientConfig;
      if (!cleanedData.mcpFunctionality) delete cleanedData.mcpFunctionality;
      if (!cleanedData.tools || cleanedData.tools.length === 0) delete cleanedData.tools;
      if (cleanedData.useWorkloadIdentity === false) delete cleanedData.useWorkloadIdentity;

      // Clean up environment variables
      if (!cleanedData.environmentVariables || Object.keys(cleanedData.environmentVariables).length === 0) {
        delete cleanedData.environmentVariables;
      }

      // Clean up authentication - only send relevant fields
      if (cleanedData.authentication) {
        const auth = { ...cleanedData.authentication };

        // Remove auth method fields that aren't relevant for the selected type
        if (auth.type !== 'bearer' && auth.bearerToken) delete auth.bearerToken;
        if (auth.type !== 'basic' && auth.basic) delete auth.basic;
        if (auth.type !== 'apikey' && auth.apiKey) delete auth.apiKey;
        if (auth.type !== 'oauth' && auth.oauth) delete auth.oauth;

        // If auth is not required, simplify it
        if (!auth.required) {
          cleanedData.authentication = { required: false, type: 'none' };
        } else {
          cleanedData.authentication = auth;
        }
      }

      console.log('API Base URL:', apiClient.defaults.baseURL);
      console.log('Sending adapter data to API:', cleanedData);
      const response = await apiClient.post(MCP_ENDPOINTS.ADAPTERS, cleanedData);
      console.log('Adapter creation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create adapter:', error);
      if (error.response) {
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  static async registerDiscoveredServer(serverId: string) {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTER_SERVER, { DiscoveredServerID: serverId });
      // API returns 201 Created with no content, so return success status
      return { success: response.status === 201, status: response.status };
    } catch (error) {
      console.error('Failed to register discovered server:', error);
      throw error;
    }
  }

  static async startScan(config: ScanConfig): Promise<ScanResult> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.DISCOVERY_SCAN, config);
      return response.data;
    } catch (error) {
      console.error('Failed to start scan:', error);
      throw error;
    }
  }

  static async getScanStatus(scanId: string): Promise<ScanResult> {
    try {
      const response = await apiClient.get(`${MCP_ENDPOINTS.DISCOVERY_SCAN}/${scanId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get scan status:', error);
      throw error;
    }
  }

  static async getScanResults(scanId: string): Promise<ScanResult> {
    try {
      const response = await apiClient.get(`${MCP_ENDPOINTS.DISCOVERY_SCAN}/${scanId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get scan results:', error);
      throw error;
    }
  }

  static async getAdapters(): Promise<AdapterResource[]> {
    try {
      console.log('Fetching adapters from:', apiClient.defaults.baseURL + MCP_ENDPOINTS.ADAPTERS);
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTERS);
      console.log('Adapters response:', response.data);
      return response.data || [];
    } catch (error: any) {
      console.error('Failed to fetch adapters:', error);
      if (error.response) {
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return [];
    }
  }

  static async getAdapter(name: string): Promise<AdapterResource | null> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_DETAILS(name));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch adapter:', error);
      return null;
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

  static async getMetrics() {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.METRICS);
      return response.data;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw error;
    }
  }

  static async getRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.REGISTRY_BROWSE);
      return response.data.servers || [];
    } catch (error) {
      console.error('Failed to fetch registry servers:', error);
      return [];
    }
  }

  static async getPublicRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.REGISTRY_PUBLIC);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch public registry servers:', error);
      return [];
    }
  }

  static async getPublicRegistryServersBySource(source: string): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(`${MCP_ENDPOINTS.REGISTRY_PUBLIC}?source=${source}`);
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
      console.error(`Failed to get registry server ${id}:`, error);
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

  static async getAdapterToken(name: string): Promise<any> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_TOKEN(name));
      return response.data;
    } catch (error) {
      console.error('Failed to get adapter token:', error);
      throw error;
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

  // Enhanced Discovery Methods
  static async startDiscoveryScan(config: any): Promise<any> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.DISCOVERY_SCAN, config);
      return response.data;
    } catch (error: any) {
      console.error('Failed to start discovery scan:', error);
      // Check if it's a CORS error
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        throw new Error('CORS error: Unable to connect to MCP Gateway. Please ensure the MCP Gateway server is running and configured to allow cross-origin requests from this domain.');
      }
      throw error;
    }
  }

  static async getDiscoveryServers(): Promise<ServiceDiscoveredServer[]> {
    try {
      console.log('Calling getDiscoveryServers with URL:', apiClient.defaults.baseURL + MCP_ENDPOINTS.DISCOVERY_SERVERS);
      const response = await apiClient.get(MCP_ENDPOINTS.DISCOVERY_SERVERS);
      console.log('getDiscoveryServers response:', response);
      const data = response.data;
      console.log('getDiscoveryServers data:', data);

      // API returns {count: number, servers: DiscoveredServer[]}
      if (data && typeof data === 'object' && Array.isArray(data.servers)) {
        return data.servers;
      } else if (Array.isArray(data)) {
        // Fallback for legacy format
        return data;
      } else {
        console.warn('getDiscoveryServers returned unexpected format:', data);
        return [];
      }
    } catch (error) {
      console.error('Failed to get discovery servers:', error);
      return [];
    }
  }

  static async getDiscoveryServerDetails(id: string): Promise<ServiceDiscoveredServer | null> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.DISCOVERY_SERVER_DETAILS(id));
      return response.data;
    } catch (error) {
      console.error(`Failed to get discovery server ${id}:`, error);
      return null;
    }
  }

  static async registerDiscoveredServerEnhanced(request: RegisterServerRequest): Promise<AdapterResource> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.DISCOVERY_REGISTER, request);
      return response.data;
    } catch (error) {
      console.error('Failed to register discovered server:', error);
      throw error;
    }
  }

  // Enhanced Registry Methods
  static async syncOfficialRegistry(): Promise<{ synced: number; updated: number }> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTRY_SYNC_OFFICIAL);
      return response.data;
    } catch (error) {
      console.error('Failed to sync official registry:', error);
      throw error;
    }
  }

  static async uploadToRegistry(request: UploadRequest): Promise<EnhancedRegistryServer> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTRY_UPLOAD, request);
      return response.data;
    } catch (error) {
      console.error('Failed to upload to registry:', error);
      throw error;
    }
  }

  static async bulkUploadToRegistry(requests: UploadRequest[]): Promise<EnhancedRegistryServer[]> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTRY_UPLOAD_BULK, { servers: requests });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk upload to registry:', error);
      throw error;
    }
  }

  static async uploadLocalMcp(name: string, path: string, options: {
    description?: string
    category?: string
    tags?: string[]
    metadata?: Record<string, any>
  } = {}): Promise<EnhancedRegistryServer> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTRY_UPLOAD_LOCAL_MCP, {
        name,
        path,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to upload local MCP ${name}:`, error);
      throw error;
    }
  }

  static async getRegistryServerDetailsEnhanced(id: string): Promise<EnhancedRegistryServer | null> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.REGISTRY_DETAILS(id));
      return response.data;
    } catch (error) {
      console.error(`Failed to get registry server ${id}:`, error);
      return null;
    }
  }

  // Deployment Management
  static async getDeploymentConfig(serverId: string): Promise<DeploymentConfig> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.DEPLOYMENT_CONFIG(serverId));
      return response.data;
    } catch (error) {
      console.error(`Failed to get deployment config for ${serverId}:`, error);
      throw error;
    }
  }

  static async deployServer(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.DEPLOYMENT_DEPLOY, request);
      return response.data;
    } catch (error) {
      console.error(`Failed to deploy server ${request.serverId}:`, error);
      throw error;
    }
  }

  // Metrics and Monitoring
  static async getAdapterMetrics(adapterName: string): Promise<AdapterMetrics> {
    try {
      const response = await apiClient.get(`${MCP_ENDPOINTS.ADAPTER_DETAILS(adapterName)}/metrics`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get metrics for adapter ${adapterName}:`, error);
      throw error;
    }
  }

  static async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.METRICS);
      return response.data;
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  // Plugin Services by Type
  static async getPluginServicesByType(serviceType: string): Promise<PluginServiceListResponse> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.PLUGIN_SERVICES_BY_TYPE(serviceType));
      return response.data;
    } catch (error) {
      console.error(`Failed to get plugin services by type ${serviceType}:`, error);
      throw error;
    }
  }

  // System Health
  static async ping(): Promise<boolean> {
    try {
      // Health endpoint is at root level, not under /api/v1
      const baseUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8911';
      const response = await axios.get(`${baseUrl}/health`);
      // Check if the service responds with healthy status
      return response.data?.status === 'healthy';
    } catch (error) {
      console.error('Failed to ping MCP Gateway:', error);
      return false;
    }
  }

  static async pingMCPServer(serverUrl: string, authToken?: string): Promise<boolean> {
    try {
      // MCP ping endpoint uses JSON-RPC 2.0 protocol
      const pingRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping'
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authentication header if token is provided
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.post(serverUrl, pingRequest, {
        headers,
        timeout: 5000 // 5 second timeout for ping
      });

      // Check if we got a valid JSON-RPC response
      return response.data &&
             response.data.jsonrpc === '2.0' &&
             response.data.id === 1 &&
             'result' in response.data;
    } catch (error) {
      console.error('Failed to ping MCP server:', error);
      return false;
    }
  }

  static async getApiDocs(): Promise<any> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.DOCS);
      return response.data;
    } catch (error) {
      console.error('Failed to get API docs:', error);
      throw error;
    }
  }

  static async getSwaggerSpec(): Promise<any> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SWAGGER_JSON);
      return response.data;
    } catch (error) {
      console.error('Failed to get Swagger spec:', error);
      throw error;
    }
  }

  static async createAdapterFromRegistry(id: string, config: CreateAdapterFromRegistryRequest): Promise<CreateAdapterFromRegistryResponse> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.REGISTRY_CREATE_ADAPTER(id), config);
      return response.data;
    } catch (error) {
      console.error('Failed to create adapter from registry:', error);
      throw error;
    }
  }

  static async testAdapterConnection(data: AdapterData): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Create a temporary adapter for testing (this would be a dry-run endpoint if available)
      // For now, we'll validate the configuration client-side and attempt a basic connectivity test
      const testData = { ...data, name: `${data.name}-test-${Date.now()}` };

      // Basic validation
      if (!testData.name || testData.name.trim() === '') {
        return { success: false, message: 'Adapter name is required' };
      }

      if (testData.connectionType === 'LocalStdio' && (!testData.command || testData.command.trim() === '')) {
        return { success: false, message: 'Command is required for Local Stdio connections' };
      }

      if ((testData.connectionType === 'RemoteHttp' || testData.connectionType === 'StreamableHttp') && (!testData.remoteUrl || testData.remoteUrl.trim() === '')) {
        return { success: false, message: 'Remote URL is required for HTTP connections' };
      }

      if (testData.connectionType === 'VirtualMCP' && (!testData.apiBaseUrl || testData.apiBaseUrl.trim() === '')) {
        return { success: false, message: 'API Base URL is required for VirtualMCP connections' };
      }

      // For HTTP-based connections, try a basic connectivity test
      if (testData.connectionType === 'RemoteHttp' || testData.connectionType === 'StreamableHttp') {
        try {
          const testResponse = await axios.get(testData.remoteUrl!, { timeout: 5000 });
          if (testResponse.status >= 200 && testResponse.status < 300) {
            return { success: true, message: 'Connection test successful' };
          } else {
            return { success: false, message: `HTTP ${testResponse.status}: ${testResponse.statusText}` };
          }
        } catch (error: any) {
          return { success: false, message: `Connection failed: ${error.message}` };
        }
      }

      // For VirtualMCP, test the API endpoint
      if (testData.connectionType === 'VirtualMCP') {
        try {
          const testResponse = await axios.get(testData.apiBaseUrl!, { timeout: 5000 });
          if (testResponse.status >= 200 && testResponse.status < 300) {
            return { success: true, message: 'VirtualMCP API connection test successful' };
          } else {
            return { success: false, message: `API ${testResponse.status}: ${testResponse.statusText}` };
          }
        } catch (error: any) {
          return { success: false, message: `VirtualMCP API connection failed: ${error.message}` };
        }
      }

      // For LocalStdio, we can't test connectivity easily, so just validate config
      if (testData.connectionType === 'LocalStdio') {
        return { success: true, message: 'Local Stdio configuration validated' };
      }

      return { success: true, message: 'Configuration validated successfully' };
    } catch (error: any) {
      console.error('Failed to test adapter connection:', error);
      return { success: false, message: `Test failed: ${error.message}` };
    }
  }
}