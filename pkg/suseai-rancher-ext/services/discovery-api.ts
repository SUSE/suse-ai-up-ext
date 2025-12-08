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
  auth_info?: {
    required: boolean
    type: string
    detected_mechanisms: string[]
    vulnerabilities: string[]
    confidence: string
  }
  last_deep_scan?: string
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
    // Use current hostname as proxy IP (without port)
    const proxyHost = window.location.hostname;
    const urlsToTry = [
      `http://${proxyHost}:8912/api/v1/servers`,
      this.config.baseURL + '/api/v1/servers',
      'http://localhost:8912/api/v1/servers'
    ]

    for (const url of urlsToTry) {
      try {
        logger.info('Trying to get discovered servers from:', url)

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const fetchResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal
          })

          clearTimeout(timeoutId);

          const result = await fetchResponse.json()

          logger.info('API response received from', url, ':', typeof result, result)

          // Handle different response structures
          let servers: any[] = []
          if (Array.isArray(result)) {
            servers = result
            logger.info('Response is direct array with', servers.length, 'servers')
          } else if (result && (result as any).servers && Array.isArray((result as any).servers)) {
            servers = (result as any).servers
            logger.info('Response has servers property with', servers.length, 'servers')
          } else if (result && typeof result === 'object') {
            // Try to find array in any property
            const arrayProp = Object.values(result).find(val => Array.isArray(val))
            servers = arrayProp || []
            logger.info('Found array in response object with', servers.length, 'servers')
          }

          logger.info('Final server count:', servers.length)

          if (servers.length === 0) {
            logger.warn('No servers found in API response, trying next URL')
            continue
          }

          // Map the response to handle field name differences and unknown server names
          const mappedServers = servers.map((server: any, index: number) => {
            logger.info(`Mapping server ${index}:`, server)

            // Handle server_name from metadata vs direct field
            const name = server.metadata?.server_name || server.server_name || server.name
            logger.info(`Server ${index} name:`, name)

            // Extract IP:port from address (remove protocol if present)
            const cleanAddress = server.address ? server.address.replace(/^https?:\/\//, '') : ''
            logger.info(`Server ${index} clean address:`, cleanAddress)

            // If name is "Unknown MCP Server", use IP address instead
            const displayName = (name === 'Unknown MCP Server' && cleanAddress)
              ? this.extractIPFromAddress(cleanAddress)
              : name

            logger.info(`Server ${index} display name:`, displayName)

            // Map to expected interface format
            const mappedServer = {
              id: server.id,
              address: cleanAddress, // Clean address without protocol
              port: server.metadata?.port || this.extractPortFromAddress(cleanAddress),
              protocol: server.protocol,
              name: displayName,
              connection: server.connection,
              status: server.status,
              lastSeen: server.lastSeen,
              discoveredAt: server.lastSeen, // Use lastSeen as discoveredAt if not provided
              metadata: server.metadata,
              vulnerability_score: server.vulnerability_score,
              security_findings: server.security_findings || [],
              _meta: server._meta || {},
              auth_info: server.auth_info,
              last_deep_scan: server.last_deep_scan
            }

            logger.info(`Server ${index} mapped:`, mappedServer)
            return mappedServer
          })

          logger.info('All servers mapped successfully:', mappedServers.length, 'from URL:', url)
          return mappedServers

        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            logger.warn(`Request to ${url} timed out`)
          } else {
            logger.warn(`Failed to fetch from ${url}:`, error.message)
          }
          // Try next URL
          continue
        }

      } catch (error: any) {
        logger.warn(`Failed to fetch from ${url}:`, error.message)
        // Try next URL
        continue
      }
    }

    // If all URLs failed
    logger.error('All discovery API URLs failed')
    return []
  }

  /**
   * Extract IP address from address string (e.g., "192.168.1.100:8911" -> "192.168.1.100")
   */
  private extractIPFromAddress(address: string): string {
    if (!address) return 'Unknown'
    const ipMatch = address.match(/^([^:]+)/)
    return ipMatch ? ipMatch[1] : address
  }

  /**
   * Extract port from address string (e.g., "192.168.1.100:8911" -> 8911)
   */
  private extractPortFromAddress(address: string): number {
    if (!address) return 0
    const portMatch = address.match(/:(\d+)$/)
    return portMatch ? parseInt(portMatch[1], 10) : 0
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

// Helper function to try multiple base URLs for discovery
export const createDiscoveryAPI = (customBaseURL?: string) => {
  return new DiscoveryAPI({
    baseURL: customBaseURL || API_BASE_URLS.DISCOVERY,
    timeout: 30000,
    retries: 3
  })
}