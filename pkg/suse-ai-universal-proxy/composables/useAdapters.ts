// Adapters Composable
// Provides state management and API integration for MCP adapters

import { ref, readonly } from 'vue'
import { adapterAPI, type Adapter, type CreateAdapterRequest, type UpdateAdapterRequest, type AdapterCapabilities } from '../services/adapter-api'
import { logger } from '../utils/logger'

export function useAdapters() {
  const adapters = ref<Adapter[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let pollInterval: NodeJS.Timeout | null = null

  // Load all adapters
  const loadAdapters = async (): Promise<void> => {
    loading.value = true
    error.value = null

      try {
        logger.info('Loading adapters')
        const adapterList = await adapterAPI.list()
        adapters.value = adapterList
        logger.info('Adapters loaded', { count: adapterList.length })
      } catch (err: any) {
        error.value = err.message || 'Failed to load adapters'
        logger.error('Failed to load adapters', err)
      } finally {
        loading.value = false
      }
  }

  // Create new adapter
  const createAdapter = async (data: CreateAdapterRequest): Promise<Adapter | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Creating adapter', { name: data.name, serverId: data.mcpServerId })
      const adapter = await adapterAPI.create(data)
      adapters.value.push(adapter)
      logger.info('Adapter created', { id: adapter.id, name: adapter.name })
      return adapter
    } catch (err: any) {
      error.value = err.message || 'Failed to create adapter'
      logger.error('Failed to create adapter', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Start polling for adapter updates
  const startPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
    }
    pollInterval = setInterval(() => {
      loadAdapters()
    }, 30000) // Poll every 30 seconds
    logger.info('Started polling adapters')
  }

  // Stop polling
  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
      logger.info('Stopped polling adapters')
    }
  }

  // Get adapter by ID
  const getAdapter = async (id: string): Promise<Adapter | null> => {
    try {
      logger.info('Getting adapter', { id })
      return await adapterAPI.getAdapter(id)
    } catch (err: any) {
      logger.error('Failed to get adapter', { id, error: err })
      return null
    }
  }

  // Update adapter
  const updateAdapter = async (id: string, data: UpdateAdapterRequest): Promise<Adapter | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Updating adapter', { id })
      const adapter = await adapterAPI.update(id, data)

      // Update local state
      const index = adapters.value.findIndex(a => a.id === id)
      if (index >= 0) {
        adapters.value[index] = adapter
      }

      logger.info('Adapter updated', { id, name: adapter.name })
      return adapter
    } catch (err: any) {
      error.value = err.message || 'Failed to update adapter'
      logger.error('Failed to update adapter', { id, error: err })
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete adapter
  const deleteAdapter = async (id: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Deleting adapter', { id })
      await adapterAPI.deleteAdapter(id)

      // Remove from local state
      adapters.value = adapters.value.filter(a => a.id !== id)

      logger.info('Adapter deleted', { id })
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to delete adapter'
      logger.error('Failed to delete adapter', { id, error: err })
      return false
    } finally {
      loading.value = false
    }
  }

  // Sync adapter capabilities
  const syncAdapter = async (id: string): Promise<AdapterCapabilities | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Syncing adapter capabilities', { id })
      const capabilities = await adapterAPI.sync(id)

      // Update local adapter with new capabilities
      const index = adapters.value.findIndex(a => a.id === id)
      if (index >= 0) {
        adapters.value[index].capabilities = capabilities
        adapters.value[index].capabilities.lastRefreshed = new Date().toISOString()
      }

      logger.info('Adapter capabilities synced', { id })
      return capabilities
    } catch (err: any) {
      error.value = err.message || 'Failed to sync adapter capabilities'
      logger.error('Failed to sync adapter capabilities', { id, error: err })
      return null
    } finally {
      loading.value = false
    }
  }

  // Get adapter by ID from local state
  const getAdapterById = (id: string): Adapter | undefined => {
    return adapters.value.find(adapter => adapter.id === id)
  }

  // Get adapters by server ID
  const getAdaptersByServerId = (serverId: string): Adapter[] => {
    return adapters.value.filter(adapter => adapter.mcpServerId === serverId)
  }

  // Check if adapter is healthy
  const isAdapterHealthy = (adapter: Adapter): boolean => {
    return adapter.status === 'ready' || adapter.status === 'active'
  }

  // Get adapter status color class
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'ready':
      case 'active':
        return 'text-success'
      case 'error':
      case 'failed':
        return 'text-danger'
      case 'pending':
      case 'starting':
        return 'text-warning'
      default:
        return 'text-muted'
    }
  }

  // Get adapter status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'ready':
        return 'Ready'
      case 'active':
        return 'Active'
      case 'error':
        return 'Error'
      case 'failed':
        return 'Failed'
      case 'pending':
        return 'Pending'
      case 'starting':
        return 'Starting'
      default:
        return 'Unknown'
    }
  }

  // Get authentication type label
  const getAuthTypeLabel = (adapter: Adapter): string => {
    if (!adapter.authentication?.required) {
      return 'None'
    }

    return (adapter.authentication?.type || 'none').charAt(0).toUpperCase() + (adapter.authentication?.type || 'none').slice(1)
  }

  // Get capabilities summary
  const getCapabilitiesSummary = (adapter: Adapter) => {
    const caps = adapter.capabilities || { tools: [], resources: [], prompts: [], lastRefreshed: '' }
    return {
      tools: caps.tools?.length || 0,
      resources: caps.resources?.length || 0,
      prompts: caps.prompts?.length || 0,
      lastRefreshed: caps.lastRefreshed
    }
  }

  return {
    // State
    adapters,
    loading,
    error,

    // Methods
    loadAdapters,
    createAdapter,
    getAdapter,
    updateAdapter,
    deleteAdapter,
    syncAdapter,
    startPolling,
    stopPolling,
    getAdapterById,
    getAdaptersByServerId,
    isAdapterHealthy,
    getStatusClass,
    getStatusLabel,
    getAuthTypeLabel,
    getCapabilitiesSummary
  }
}