// Registry API Service
// Handles MCP server registry operations (browsing, details, reload)

import { BaseAPI, APIConfig, AuthHeaders } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS, MCP_ENDPOINTS } from '../config/api-config'

export interface MCPServer {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon?: string
  readonly about?: {
    readonly icon_url: string
    readonly title: string
  }
  readonly type?: string
  readonly secrets?: readonly {
    readonly name: string
    readonly description?: string
    readonly value?: string
  }[]
  readonly tags?: readonly string[]
  readonly source_url?: string
  readonly project_url?: string
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
      readonly config?: {
        readonly secrets?: readonly {
          readonly name: string
          readonly env: string
          readonly description?: string
          readonly example?: string
          readonly required?: boolean
        }[]
      }
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

  protected getAuthHeaders(): AuthHeaders | null {
    // Registry browsing is public, no auth required
    return null
  }

  // Update baseURL dynamically
  updateBaseURL() {
    this.api.defaults.baseURL = API_BASE_URLS.REGISTRY
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

         const url = `${MCP_ENDPOINTS.REGISTRY_BROWSE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

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
            // Raw array format (fallback for server.json) - transform to expected structure
            servers = result.map((server: any) => ({
              id: server.id || server.name, // Use name as id if id is not provided
              name: server._meta?.about?.title || server._meta?.title || server.title || server.name,
              description: server._meta?.about?.description || server._meta?.description || server.description || server.about?.description,
              icon: server._meta?.about?.icon || server._meta?.icon || server.icon || server.about?.icon,
              about: {
                icon_url: server._meta?.about?.icon || server.about?.icon_url,
                title: server._meta?.about?.title || server.about?.title
              },
              type: server.type,
              tags: server.tags || server._meta?.tags || [],
              packages: server.packages || [],
               _meta: {
                 source: server.source || 'registry',
                 userAuthRequired: false,
                 authType: 'none',
                 category: server._meta?.category || 'general',
                 tags: server._meta?.tags || [],
                 hosted: server._meta?.hosted,
                 requiresInstallation: server._meta?.requiresInstallation,
                 transportType: server._meta?.transportType,
                 validation_status: server._meta?.validation_status,
                 badges: server._meta?.badges,
                 config: server._meta?.config
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

         const server = await this.get<MCPServer>(MCP_ENDPOINTS.REGISTRY_DETAILS(id))
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

        const result = await this.post<{ status: string; message: string }>(MCP_ENDPOINTS.REGISTRY_SYNC_OFFICIAL)
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