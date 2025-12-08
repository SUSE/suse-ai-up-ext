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
  status: 'running' | 'completed' | 'failed'
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
  }
  vulnerability_score?: 'high' | 'medium' | 'low'
  security_findings?: SecurityFinding[]
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

export class DiscoveryAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }

  /**
   * Start a network scan for MCP servers
   */
  async startScan(config: ScanConfig): Promise<{ scan_id: string; status: string; message: string }> {
    try {
      logger.info('Starting network scan', { config })

       const result = await this.post<{ scan_id: string; status: string; message: string }>('/api/v1/scan', config)
      logger.info('Scan started', { scanId: result.scan_id })

      return result
    } catch (error) {
      logger.error('Failed to start scan', error)
      throw error
    }
  }

  /**
   * Get scan status by ID
   */
  async getScanStatus(scanId: string): Promise<ScanResult> {
    try {
      logger.info('Getting scan status', { scanId })

       const result = await this.get<ScanResult>(`/api/v1/scan/${scanId}`)
      logger.info('Scan status retrieved', { scanId, status: result.status })

      return result
    } catch (error) {
      logger.error('Failed to get scan status', { scanId, error })
      throw error
    }
  }

  /**
   * List all discovered servers
   */
  async getDiscoveredServers(): Promise<DiscoveredServer[]> {
    try {
      logger.info('Getting discovered servers')

       const result = await this.get<{ servers: DiscoveredServer[] }>('/api/v1/servers')
      logger.info('Discovered servers retrieved', { count: result.servers.length })

      return result.servers
    } catch (error) {
      logger.error('Failed to get discovered servers', error)
      throw error
    }
  }

  /**
   * Get details of a specific discovered server
   */
  async getDiscoveredServer(id: string): Promise<DiscoveredServer> {
    try {
      logger.info('Getting discovered server details', { id })

       const server = await this.get<DiscoveredServer>(`/api/v1/servers/${id}`)
      logger.info('Discovered server details retrieved', { id, address: server.address })

      return server
    } catch (error) {
      logger.error('Failed to get discovered server details', { id, error })
      throw error
    }
  }
}

// Singleton instance
export const discoveryAPI = new DiscoveryAPI({
  baseURL: API_BASE_URLS.DISCOVERY,
  timeout: 30000,
  retries: 3
})