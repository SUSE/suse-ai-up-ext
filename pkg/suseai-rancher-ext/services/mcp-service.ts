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
      const response = await discoveryClient.get(MCP_ENDPOINTS.DISCOVERY_SERVERS);
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

  // Session Management
  static async listSessions(adapterName: string): Promise<SessionListResponse> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.SESSIONS(adapterName));
      return {
        sessions: response.data.sessions || [],
        total: response.data.total || 0,
        limit: response.data.limit || 10,
        offset: response.data.offset || 0
      };
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  static async createSession(adapterName: string, sessionData: { clientInfo: any }): Promise<Session> {
    try {
      const response = await apiClient.post(MCP_ENDPOINTS.SESSION_CREATE(adapterName), sessionData);
      return response.data;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  static async deleteSession(adapterName: string, sessionId: string): Promise<void> {
    try {
      await apiClient.delete(MCP_ENDPOINTS.SESSION_DETAILS(adapterName, sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  static async deleteAllSessions(adapterName: string): Promise<void> {
    try {
      await apiClient.delete(MCP_ENDPOINTS.SESSION_DELETE_ALL(adapterName));
    } catch (error) {
      console.error('Failed to delete all sessions:', error);
      throw error;
    }
  }

  // Metrics
  static async getAdapterMetrics(adapterName: string): Promise<AdapterMetrics> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_STATUS(adapterName));
      return response.data.metrics || response.data;
    } catch (error) {
      console.error('Failed to get adapter metrics:', error);
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
  static async getAdapterToken(adapterName: string): Promise<AdapterToken> {
    try {
      const response = await apiClient.get(MCP_ENDPOINTS.ADAPTER_TOKEN(adapterName));
      return response.data;
    } catch (error) {
      console.error('Failed to get adapter token:', error);
      throw error;
    }
  }
}