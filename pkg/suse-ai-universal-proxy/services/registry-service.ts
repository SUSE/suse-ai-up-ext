/**
 * Registry Management Service
 * Handles MCP server registry operations and deployment management
 */

import axios, { AxiosInstance } from 'axios'
import { getMcpUrl, getApiConfig, MCP_ENDPOINTS } from '../config/api-config'
import { logger } from '../utils/logger'

export interface RegistryServer {
  id: string
  name: string
  description?: string
  version: string
  author?: string
  tags: string[]
  category: string
  repository?: {
    url: string
    branch?: string
    commit?: string
  }
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  isOfficial?: boolean
  isPublic?: boolean
  downloadCount?: number
  rating?: number
}

export interface RegistryBrowseOptions {
  category?: string
  tags?: string[]
  search?: string
  official?: boolean
  public?: boolean
  limit?: number
  offset?: number
  sortBy?: 'name' | 'created' | 'updated' | 'downloads' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

export interface RegistryBrowseResult {
  servers: RegistryServer[]
  total: number
  hasMore: boolean
}

export interface DeploymentConfig {
  serverId: string
  kubernetes?: {
    namespace: string
    deployment: {
      replicas: number
      image: string
      resources?: {
        requests?: {
          cpu?: string
          memory?: string
        }
        limits?: {
          cpu?: string
          memory?: string
        }
      }
      env?: Record<string, string>
      volumes?: Array<{
        name: string
        type: 'configMap' | 'secret' | 'persistentVolume'
        source: string
        mountPath: string
      }>
    }
    service?: {
      type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
      ports: Array<{
        name: string
        port: number
        targetPort?: number
        protocol?: 'TCP' | 'UDP'
      }>
    }
    ingress?: {
      enabled: boolean
      host?: string
      tls?: boolean
    }
  }
  config?: {
    adapter?: {
      name: string
      endpoint: string
      timeout?: number
      retries?: number
    }
    authentication?: {
      type: 'none' | 'token' | 'basic' | 'oauth'
      config: Record<string, any>
    }
    logging?: {
      level: 'debug' | 'info' | 'warn' | 'error'
      format: 'json' | 'text'
    }
  }
}

export interface DeploymentRequest {
  serverId: string
  config: DeploymentConfig
  targetCluster?: string
  targetNamespace?: string
}

export interface DeploymentResult {
  deploymentId: string
  status: 'pending' | 'running' | 'failed' | 'completed'
  message?: string
  resources?: {
    deployment?: string
    service?: string
    ingress?: string
    configMap?: string
    secret?: string
  }
}

export interface UploadRequest {
  name: string
  version: string
  description?: string
  category: string
  tags: string[]
  files: Array<{
    name: string
    content: string
    type: 'manifest' | 'config' | 'script' | 'documentation'
  }>
  metadata?: Record<string, any>
}

export class RegistryService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create(getApiConfig())
    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.api.interceptors.response.use(
      response => response,
      error => {
        logger.error('Registry service error:', error)
        throw error
      }
    )
  }

  /**
   * Browse registry servers
   */
  async browseRegistry(options: RegistryBrowseOptions = {}): Promise<RegistryBrowseResult> {
    try {
      const params = new URLSearchParams()
      
      if (options.category) params.append('category', options.category)
      if (options.tags) params.append('tags', options.tags.join(','))
      if (options.search) params.append('search', options.search)
      if (options.official !== undefined) params.append('official', options.official.toString())
      if (options.public !== undefined) params.append('public', options.public.toString())
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
      if (options.sortBy) params.append('sortBy', options.sortBy)
      if (options.sortOrder) params.append('sortOrder', options.sortOrder)

      const response = await this.api.get(
        getMcpUrl(MCP_ENDPOINTS.REGISTRY_BROWSE),
        { params }
      )
      return response.data
    } catch (error) {
      logger.error('Failed to browse registry:', error)
      throw error
    }
  }

  /**
   * Get public registry servers
   */
  async getPublicRegistry(): Promise<RegistryServer[]> {
    try {
      const response = await this.api.get(getMcpUrl('/registry/public'))
      return response.data
    } catch (error) {
      logger.error('Failed to get public registry:', error)
      throw error
    }
  }

  /**
   * Sync official registry
   */
  async syncOfficialRegistry(): Promise<{ synced: number; updated: number }> {
    try {
      const response = await this.api.post(getMcpUrl('/registry/sync/official'))
      return response.data
    } catch (error) {
      logger.error('Failed to sync official registry:', error)
      throw error
    }
  }

  /**
   * Upload server to registry
   */
  async uploadToRegistry(request: UploadRequest): Promise<RegistryServer> {
    try {
      const response = await this.api.post(
        getMcpUrl('/registry/upload'),
        request
      )
      return response.data
    } catch (error) {
      logger.error('Failed to upload to registry:', error)
      throw error
    }
  }

  /**
   * Bulk upload servers to registry
   */
  async bulkUploadToRegistry(requests: UploadRequest[]): Promise<RegistryServer[]> {
    try {
      const response = await this.api.post(
        getMcpUrl('/registry/upload/bulk'),
        { servers: requests }
      )
      return response.data
    } catch (error) {
      logger.error('Failed to bulk upload to registry:', error)
      throw error
    }
  }

  /**
   * Upload local MCP server
   */
  async uploadLocalMcp(
    name: string,
    path: string,
    options: {
      description?: string
      category?: string
      tags?: string[]
      metadata?: Record<string, any>
    } = {}
  ): Promise<RegistryServer> {
    try {
      const response = await this.api.post(
        getMcpUrl('/registry/upload/local-mcp'),
        {
          name,
          path,
          ...options
        }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to upload local MCP ${name}:`, error)
      throw error
    }
  }

  /**
   * Get registry server details
   */
  async getRegistryServer(id: string): Promise<RegistryServer> {
    try {
      const response = await this.api.get(getMcpUrl(`/registry/${id}`))
      return response.data
    } catch (error) {
      logger.error(`Failed to get registry server ${id}:`, error)
      throw error
    }
  }

  /**
   * Get deployment configuration for server
   */
  async getDeploymentConfig(serverId: string): Promise<DeploymentConfig> {
    try {
      const response = await this.api.get(
        getMcpUrl(`/deployment/config/${serverId}`)
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to get deployment config for ${serverId}:`, error)
      throw error
    }
  }

  /**
   * Deploy server to cluster
   */
  async deployServer(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      const response = await this.api.post(
        getMcpUrl('/deployment/deploy'),
        request
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to deploy server ${request.serverId}:`, error)
      throw error
    }
  }

  /**
   * Get server categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await this.api.get(getMcpUrl('/registry/categories'))
      return response.data
    } catch (error) {
      logger.error('Failed to get categories:', error)
      throw error
    }
  }

  /**
   * Get popular tags
   */
  async getPopularTags(): Promise<Array<{ tag: string; count: number }>> {
    try {
      const response = await this.api.get(getMcpUrl('/registry/tags'))
      return response.data
    } catch (error) {
      logger.error('Failed to get popular tags:', error)
      throw error
    }
  }

  /**
   * Search registry servers
   */
  async searchServers(query: string, options: Omit<RegistryBrowseOptions, 'search'> = {}): Promise<RegistryBrowseResult> {
    return this.browseRegistry({ ...options, search: query })
  }

  /**
   * Get featured servers
   */
  async getFeaturedServers(): Promise<RegistryServer[]> {
    try {
      const response = await this.api.get(getMcpUrl('/registry/featured'))
      return response.data
    } catch (error) {
      logger.error('Failed to get featured servers:', error)
      throw error
    }
  }

  /**
   * Rate a server
   */
  async rateServer(id: string, rating: number): Promise<{ success: boolean; newRating?: number }> {
    try {
      const response = await this.api.post(
        getMcpUrl(`/registry/${id}/rate`),
        { rating }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to rate server ${id}:`, error)
      throw error
    }
  }

  /**
   * Get server statistics
   */
  async getServerStats(id: string): Promise<{
    downloads: number
    rating: number
    ratingCount: number
    deployments: number
  }> {
    try {
      const response = await this.api.get(getMcpUrl(`/registry/${id}/stats`))
      return response.data
    } catch (error) {
      logger.error(`Failed to get stats for server ${id}:`, error)
      throw error
    }
  }
}

// Singleton instance
export const registryService = new RegistryService()
export default registryService