// Registry API Service
// Handles MCP server registry operations (browsing, details, reload)

import { BaseAPI, APIConfig } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'

export interface MCPServer {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon?: string
  readonly packages: readonly Package[]
  readonly tools?: readonly any[]
  readonly config_template?: any
  readonly address?: string
  readonly port?: number
  readonly protocol?: string
  readonly connection?: string
  readonly discoveredAt?: string
  readonly lastSeen?: string
  readonly metadata?: any
  readonly validation_status?: string
   readonly _meta: {
     readonly source: string
     readonly userAuthRequired: boolean
     readonly authType: string
     readonly category: string
     readonly tags: readonly string[]
     readonly documentation?: string
     readonly hosted?: boolean
     readonly requiresInstallation?: boolean
     readonly transportType?: string
     readonly validation_status?: string
     readonly badges?: readonly string[]
   }
}

export interface Package {
  readonly registryType: string
  readonly identifier: string
  readonly transport: {
    readonly type: string
  }
  readonly environmentVariables?: ReadonlyArray<{
    readonly name: string
    readonly description?: string
    readonly default?: string
    readonly required?: boolean
    readonly isSecret?: boolean
  }>
}

export interface RegistryBrowseParams {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export interface RegistryBrowseResult {
  servers: MCPServer[]
  total: number
  hasMore: boolean
}

export class RegistryAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }

  /**
   * Browse MCP servers from registry
   */
  async browse(params: RegistryBrowseParams = {}): Promise<RegistryBrowseResult> {
    try {
      logger.info('Browsing MCP registry', { params })

      const queryParams = new URLSearchParams()
      if (params.q) queryParams.append('q', params.q)
      if (params.category) queryParams.append('category', params.category)
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.offset) queryParams.append('offset', params.offset.toString())

       const url = `/api/v1/registry/browse${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

        const result = await this.get<RegistryBrowseResult>(url)

        // Debug: log the raw result
        logger.info('Raw registry browse result type:', typeof result)
        logger.info('Is array result?', Array.isArray(result))
        logger.info('Result length if array:', Array.isArray(result) ? result.length : 'N/A')
        logger.info('First server id if array:', Array.isArray(result) && result.length > 0 ? result[0].id : 'N/A')

        // Ensure result has expected structure
        let servers: MCPServer[] = []
        let total = 0
        let hasMore = false

        if (!result) {
          logger.warn('Invalid registry browse result: null or undefined', result)
          return { servers: [], total: 0, hasMore: false }
        }

        // Handle different response formats
        if (Array.isArray(result)) {
          // API returns array directly - use IDs as they are
          servers = result.map((server: any) => {
            const serverName = server.title || server.name
            return {
              ...server,
              name: serverName
            }
          })
          total = servers.length
          hasMore = false
          logger.info('Registry returned array format, using IDs as provided')
        } else if (Array.isArray(result.servers)) {
          // Expected structured format - use the servers as-is
          servers = result.servers
          total = result.total || servers.length
          hasMore = result.hasMore || false
        } else {
          logger.warn('Invalid registry browse result structure', result)
          return { servers: [], total: 0, hasMore: false }
        }

        // Handle different response formats
        if (Array.isArray(result)) {
          // Raw array format (fallback for server.json) - transform to expected structure
          servers = result.map((server: any) => ({
            id: server.id,
            name: server.title || server.name,
            description: server.description,
            icon: server.icon,
            packages: server.packages || [],
            _meta: {
              source: 'registry',
              userAuthRequired: false,
              authType: 'none',
              category: 'general',
              tags: []
            }
          }))
          total = servers.length
          hasMore = false
          logger.info('Registry returned raw array format, transformed to expected structure')
        } else if (Array.isArray(result.servers)) {
          // Expected structured format
          servers = result.servers
          total = result.total || servers.length
          hasMore = result.hasMore || false
        } else {
          logger.warn('Invalid registry browse result structure', result)
          return { servers: [], total: 0, hasMore: false }
        }

        logger.info('Registry browse completed', { count: servers.length, total })

        return { servers, total, hasMore }
    } catch (error) {
      logger.error('Failed to browse registry', error)
      throw error
    }
  }

  /**
    * Get server details by ID
    */
    async getServer(id: string): Promise<MCPServer> {
      try {
        logger.info('Getting server details', { id })

        const server = await this.get<MCPServer>(`/api/v1/registry/${id}`)
        logger.info('Server details retrieved from API', { id, name: server.name })
        return server
      } catch (error) {
        logger.error('Failed to get server details', { id, error })
        throw error
      }
    }

  /**
   * Reload the MCP server registry
   */
  async reload(): Promise<{ status: string; message: string }> {
    try {
      logger.info('Reloading MCP registry')

       const result = await this.post<{ status: string; message: string }>('/api/v1/registry/reload')
      logger.info('Registry reload completed', result)

      return result
    } catch (error) {
      logger.error('Failed to reload registry', error)
      throw error
    }
  }
}

// Singleton instance
export const registryAPI = new RegistryAPI({
  baseURL: API_BASE_URLS.REGISTRY,
  timeout: 30000,
  retries: 3
})