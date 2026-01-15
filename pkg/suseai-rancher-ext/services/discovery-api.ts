// Discovery API Service
// Handles network scanning for MCP server discovery

import { BaseAPI, APIConfig } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'

export interface ScanConfig {
  scanRanges: string[]
  ports: string[]
  timeout: string
  maxConcurrent: number
  excludeProxy: boolean
}

export interface ScanResult {
  scan_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  startTime?: string
  endTime?: string
  config?: ScanConfig
  results?: DiscoveredServer[]
}

export interface DiscoveredServer {
  id: string
  address: string
  port: number
  protocol: string
  discoveredAt: string
  lastSeen: string
  name?: string
  connection?: string
  status?: string
  metadata?: {
    auth_type?: string
    detectionMethod?: string
    validation_status?: string
  }
  _meta?: {
    authType?: string
    category?: string
    documentation?: string
    hosted?: boolean
    requiresInstallation?: boolean
    source?: string
    tags?: string[]
    transportType?: string
    userAuthRequired?: boolean
    validation_status?: string
    protocolVersion?: string
    serverVersion?: string
  }
  vulnerability_score?: 'high' | 'medium' | 'low'
  security_findings?: SecurityFinding[]
  auth_info?: {
    required: boolean
    type: string
    detected_mechanisms: string[]
    vulnerabilities: string[]
    confidence: string
  }
  last_deep_scan?: string
  protocol_version?: string
  server_version?: string
  capabilities?: any
}

export interface SecurityFinding {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  ruleId: string
  vulnerability_type?: string
  evidence: string
  status: 'open' | 'resolved'
  discoveredAt: string
  recommendation: string
  references: string[]
  metadata?: Record<string, any>
}

export interface RawDiscoveredServer {
  address: string
  capabilities: any
  connection: string
  id: string
  last_seen: string
  metadata: any
  name: string
  protocol: string
  protocol_version: string
  server_version: string
  status: string
  vulnerability_score: string
}

export interface DiscoveryResultsResponse {
  scan_summaries: any[]
  servers: RawDiscoveredServer[]
  total_scans: number
  total_servers: number
}

export class DiscoveryAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }

  // Update baseURL dynamically
  updateBaseURL() {
    this.api.defaults.baseURL = API_BASE_URLS.DISCOVERY
  }

  // Get current baseURL
  getBaseURL() {
    return this.api.defaults.baseURL
  }

  /**
   * Start a network scan for MCP servers
   */
  async startScan(config: ScanConfig): Promise<{ scan_id: string; status: string; message: string }> {
    try {
      logger.info('Starting network scan', config)

      const result = await this.post<{ jobId: string; status: string; message: string }>('/api/v1/discovery/scan', config)
      logger.info('Scan started', { jobId: result.jobId })

      // Transform API response to match expected format
      return {
        scan_id: result.jobId,
        status: result.status,
        message: result.message
      }
    } catch (error) {
      logger.error('Failed to start scan', error)
      throw error
    }
  }

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<ScanResult> {
    try {
      logger.info('Getting scan status', { scanId })

      const result = await this.get<ScanResult>(`/api/v1/discovery/scan/${scanId}`)
      logger.info('Scan status retrieved', { scanId, status: result.status })

      return result
    } catch (error) {
      logger.error('Failed to get scan status', { scanId, error })
      throw error
    }
  }

  /**
   * Get a specific discovered server by address and name
   */
  async getDiscoveredServer(address: string, name: string): Promise<DiscoveredServer | null> {
    try {
      logger.info('Getting specific discovered server', { address, name });

      const servers = await this.getDiscoveredServers();
      const server = servers.find(s => s.address === address && s.name === name);

      if (server) {
        logger.info('Found discovered server', { address, name, serverId: server.id });
        return server;
      } else {
        logger.warn('Discovered server not found', { address, name });
        return null;
      }
    } catch (error) {
      logger.error('Failed to get discovered server', { address, name, error });
      throw error;
    }
  }

  /**
     * Get list of discovered servers
     */
  async getDiscoveredServers(): Promise<DiscoveredServer[]> {
    try {
      logger.info('Getting discovered servers from API');

      const result = await this.get<any>('/api/v1/discovery/results?_t=' + Date.now());

      let rawServers: RawDiscoveredServer[] = [];

      // Handle different response formats
      if (Array.isArray(result)) {
        // Direct array response
        rawServers = result as RawDiscoveredServer[];
      } else if (result && typeof result === 'object' && 'servers' in result) {
        // Object with servers property
        rawServers = result.servers || [];
      } else {
        logger.warn('Unexpected API response format');
        rawServers = [];
      }

      // Transform API response to match frontend interface
      const servers: DiscoveredServer[] = rawServers.map((server: RawDiscoveredServer) => ({
        id: server.id,
        address: server.address,
        port: parseInt(server.metadata?.port || '0', 10),
        protocol: server.protocol,
        discoveredAt: server.last_seen,
        lastSeen: server.last_seen,
        name: server.name,
        connection: server.connection,
        status: server.status,
        metadata: {
          auth_type: server.metadata?.auth_type,
          detectionMethod: 'network-scan',
          validation_status: server.metadata?.validation_status
        },
        _meta: {
          authType: server.metadata?.auth_type,
          category: 'discovered',
          source: 'network-scan',
          tags: [],
          userAuthRequired: false,
          validation_status: server.metadata?.validation_status,
          protocolVersion: server.protocol_version,
          serverVersion: server.server_version
        },
        vulnerability_score: server.vulnerability_score as 'high' | 'medium' | 'low' | undefined,
        security_findings: [],
        auth_info: {
          required: server.metadata?.auth_type !== 'none',
          type: server.metadata?.auth_type || 'none',
          detected_mechanisms: [],
          vulnerabilities: [],
          confidence: 'unknown'
        },
        last_deep_scan: server.last_seen,
        // Add additional properties from raw server
        protocol_version: server.protocol_version,
        server_version: server.server_version,
        capabilities: server.capabilities
      }));

      logger.info('Discovered servers retrieved and transformed', { count: servers.length });
      return servers;
     } catch (error) {
       logger.error('Failed to get discovered servers from API', error);
       throw error;
     }
  }
}

// Singleton instance
export const discoveryAPI = new DiscoveryAPI({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: 30000,
  retries: 3
})

// Method to update baseURL dynamically
export const updateDiscoveryBaseURL = () => {
  discoveryAPI.updateBaseURL()
}

// Get current baseURL
export const getDiscoveryBaseURL = () => {
  return discoveryAPI.getBaseURL()
}