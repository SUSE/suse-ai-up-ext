// Registry Composable
// Provides state management and API integration for MCP server registry

import { ref, readonly } from 'vue'
import { registryAPI, type MCPServer, type RegistryBrowseParams, type RegistryBrowseResult } from '../services/registry-api'
import { logger } from '../utils/logger'

// Simple cache implementation
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

const registryCache = new SimpleCache()

export function useRegistry() {
  const servers = ref<MCPServer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    total: 0,
    hasMore: false,
    currentPage: 1,
    pageSize: 1000 // Load up to 1000 servers to cover all entries
  })

  // Browse servers with optional filtering
  const browseServers = async (params: RegistryBrowseParams = {}): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Browsing registry servers', params)

      // Create cache key from params
      const cacheKey = `browse_${JSON.stringify(params)}_${pagination.value.currentPage}_${pagination.value.pageSize}`

      // Clear cache to ensure fresh data
      registryCache.clear()
      logger.info('Cache cleared for fresh data')

      // Always fetch from API (no caching for now)
      const result = await registryAPI.browse({
        ...params,
        limit: pagination.value.pageSize,
        offset: (pagination.value.currentPage - 1) * pagination.value.pageSize
      })

      logger.info('Registry servers fetched from API', { count: result.servers.length, total: result.total })

      // If this is the first page or a new search, replace the servers array
      // Otherwise, append to existing results for pagination
      if (pagination.value.currentPage === 1 || params.q || params.category) {
        servers.value = result.servers
      } else {
        servers.value = [...servers.value, ...result.servers]
      }

      pagination.value.total = result.total
      pagination.value.hasMore = result.hasMore

    } catch (err: any) {
      error.value = err.message || 'Failed to load registry servers'
      logger.error('Failed to browse registry servers', err)
    } finally {
      loading.value = false
    }
  }

  // Get server details by ID
  const getServerDetails = async (id: string): Promise<MCPServer | null> => {
    try {
      logger.info('Getting server details', { id })
      const result = await registryAPI.getServer(id)
      logger.info('Server details result:', result)
      return result
    } catch (err: any) {
      logger.error('Failed to get server details', { id, error: err })
      return null
    }
  }

   // Reload registry
   const reloadRegistry = async (): Promise<boolean> => {
     loading.value = true
     error.value = null

     try {
       logger.info('Reloading registry')

       // Reset pagination to ensure we start fresh
       resetPagination()

       // Clear cache before reloading
       registryCache.clear()

       await registryAPI.reload()
       // Refresh the current browse results
       await browseServers()
       return true
     } catch (err: any) {
       error.value = err.message || 'Failed to reload registry'
       logger.error('Failed to reload registry', err)
       return false
     } finally {
       loading.value = false
     }
   }

  // Search servers
  const searchServers = async (query: string, category?: string): Promise<void> => {
    await browseServers({ q: query, category })
  }

  // Load next page
  const loadNextPage = async (): Promise<void> => {
    if (pagination.value.hasMore && !loading.value) {
      pagination.value.currentPage++
      await browseServers()
    }
  }

  // Reset pagination
  const resetPagination = (): void => {
    pagination.value.currentPage = 1
    pagination.value.hasMore = false
  }

  // Get server by ID from current results
  const getServerById = (id: string): MCPServer | undefined => {
    return servers.value.find(server => server.id === id)
  }

  // Check if server requires authentication
  const requiresAuth = (server: MCPServer): boolean => {
    return server._meta?.userAuthRequired || false
  }

  // Get authentication type for server
  const getAuthType = (server: MCPServer): string => {
    return server._meta?.authType || 'none'
  }

  // Get server categories from current results
  const getCategories = (): string[] => {
    const categories = new Set<string>()
    servers.value.forEach(server => {
      if (server._meta?.category) {
        categories.add(server._meta.category)
      }
    })
    return Array.from(categories).sort()
  }

  return {
    // State
    servers: readonly(servers),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),

    // Methods
    browseServers,
    getServerDetails,
    reloadRegistry,
    searchServers,
    loadNextPage,
    resetPagination,
    getServerById,
    requiresAuth,
    getAuthType,
    getCategories
  }
}