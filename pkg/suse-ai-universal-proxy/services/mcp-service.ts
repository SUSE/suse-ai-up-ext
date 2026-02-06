// MCP Gateway Service
// Handles communication with the MCP Gateway API for adapter management, discovery, and sessions

import axios from 'axios';
import { API_BASE_URLS, MCP_ENDPOINTS, getApiConfig, updateApiBaseUrls } from '../config/api-config';
import type { Adapter, AdapterConfig, AdapterHealth, AdapterMetrics, SystemMetrics, Session, SessionInfo } from '../types/mcp-types';



// API client for MCP Gateway
export const apiClient = axios.create({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: getApiConfig().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API client for Discovery service
export const discoveryClient = axios.create({
  baseURL: API_BASE_URLS.DISCOVERY,
  timeout: getApiConfig().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to update API base URL
export const updateApiBaseUrl = (serviceUrl?: string, useHttps?: boolean) => {
  const newUrls = updateApiBaseUrls(serviceUrl, useHttps);
  apiClient.defaults.baseURL = newUrls.MCP_GATEWAY;
  discoveryClient.defaults.baseURL = newUrls.DISCOVERY;
};

// Types
export interface ServiceDiscoveredServer {
  id: string;
  name: string;
  host: string;
  port: number;
  address: string;
  protocol: 'http' | 'https' | 'tcp';
  status: 'online' | 'offline' | 'unknown';
  lastSeen: string;
  metadata?: {
    version?: string;
    capabilities?: string[];
    description?: string;
    tags?: string[];
    auth_type?: string;
  };
  scanId?: string;
  registered?: boolean;
  services?: string[];
  security_findings?: any[];
  vulnerability_score?: string;
}

export type DiscoveredServer = ServiceDiscoveredServer;

export interface SessionListResponse {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdapterToken {
  token: string;
  expiresAt?: string;
  type: 'bearer' | 'api-key';
}

export interface CreateAdapterRequest {
  name: string;
  description?: string;
  protocol: string;
  connectionType: string;
  command?: string;
  args?: string[];
  remoteUrl?: string;
  imageName?: string;
  imageVersion?: string;
  apiBaseUrl?: string;
  authentication: any;
  environmentVariables?: Record<string, string>;
  replicaCount?: number;
  mcpClientConfig?: any;
  mcpFunctionality?: any;
  tools?: any[];
  useWorkloadIdentity?: boolean;
  originalServer?: ServiceDiscoveredServer;
  mcpServerId?: string;
}

export interface ScanStatus {
  scanId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  serversFound: number;
  errors: string[];
  message?: string;
}

export interface PingResponse {
  status: 'ok' | 'error';
  version?: string;
  timestamp: string;
}

export class MCPService {
  // Health check
  static async ping(): Promise<PingResponse> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.HEALTH);
      return response.data;
    } catch (error) {
      console.error('Failed to ping MCP Gateway:', error);
      throw error;
    }
  }

  // Discovery
  static async getDiscoveryServers(): Promise<DiscoveredServer[]> {
    try {
      const response = await discoveryClient.get(MCP_ENDPOINTS.DISCOVERY_RESULTS);
      return response.data.servers || response.data;
    } catch (error) {
      console.error('Failed to get discovery servers:', error);
      throw error;
    }
  }

  static async pingMCPServer(serverUrl: string, authToken?: string): Promise<boolean> {
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await apiClient.get(`${serverUrl}/health`, { headers, timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to ping MCP server:', error);
      return false;
    }
  }

  // Adapter Management
  static async getAdapters(): Promise<Adapter[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTERS);
      return response.data.adapters || response.data;
    } catch (error) {
      console.error('Failed to get adapters:', error);
      throw error;
    }
  }

  static async createAdapter(adapterData: CreateAdapterRequest): Promise<Adapter> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.ADAPTERS, adapterData);
      return response.data;
    } catch (error) {
      console.error('Failed to create adapter:', error);
      throw error;
    }
  }

  static async deleteAdapter(adapterName: string): Promise<void> {
    try {
      await apiClient.delete(MCP_ENDPOINTS.ADAPTER_DETAILS(adapterName));
    } catch (error) {
      console.error('Failed to delete adapter:', error);
      throw error;
    }
  }

  static async getAdapterLogs(adapterName: string): Promise<string[]> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_LOGS(adapterName));
      return response.data.logs || [];
    } catch (error) {
      console.error('Failed to get adapter logs:', error);
      throw error;
    }
  }

  // Session Management - Reinitialize session
  static async reinitializeSession(adapterName: string, sessionData?: any): Promise<any> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.SESSIONS_REINITIALIZE(adapterName), sessionData || {});
      return response.data;
    } catch (error) {
      console.error('Failed to reinitialize session:', error);
      throw error;
    }
  }

  // Health check for adapter sidecar
  static async checkAdapterHealth(adapterName: string, userId?: string): Promise<any> {
    try {
      const headers = userId ? { 'X-User-ID': userId } : {};
      const response = await apiClient.post(MCP_ENDPOINTS.ADAPTER_HEALTH(adapterName), {}, { headers });
      return response.data;
    } catch (error) {
      console.error('Failed to check adapter health:', error);
      throw error;
    }
  }

  // Scan Management
  static async getScanStatus(scanId: string): Promise<ScanStatus> {
    try {
      const response = await discoveryClient.get(MCP_ENDPOINTS.SCAN_STATUS(scanId));
      return response.data;
    } catch (error) {
      console.error('Failed to get scan status:', error);
      throw error;
    }
  }

  // Token Management
  static async getAdapterToken(adapterName: string, generate?: boolean, expiresIn?: number): Promise<AdapterToken> {
    try {
      const params = new URLSearchParams();
      if (generate !== undefined) params.append('generate', generate.toString());
      if (expiresIn !== undefined) params.append('expiresIn', expiresIn.toString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`${MCP_ENDPOINTS.ADAPTER_TOKEN(adapterName)}${query}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get adapter token:', error);
      throw error;
    }
  }

  // Registration - Register discovered server
  static async registerDiscoveredServer(discoveredServerId: string): Promise<any> {
    try {
      const response = await discoveryClient.post(MCP_ENDPOINTS.DISCOVERY_REGISTER, { discoveredServerId });
      return response.data;
    } catch (error) {
      console.error('Failed to register discovered server:', error);
      throw error;
    }
  }
}