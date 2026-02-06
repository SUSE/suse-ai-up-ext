// Proxy Composable
// Provides state management and API integration for MCP protocol proxying

import { ref, readonly } from 'vue'
import { proxyAPI, type HealthStatus, type MCPTool, type MCPResource, type MCPMessage } from '../services/proxy-api'
import { logger } from '../utils/logger'

export function useProxy() {
  const health = ref<HealthStatus | null>(null)
  const tools = ref<MCPTool[]>([])
  const resources = ref<MCPResource[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Check proxy health
  const checkHealth = async (): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Checking proxy health')
      const healthStatus = await proxyAPI.health()
      health.value = healthStatus
      logger.info('Proxy health checked', { status: healthStatus.status })
      return healthStatus.status === 'healthy'
    } catch (err: any) {
      error.value = err.message || 'Failed to check proxy health'
      logger.error('Failed to check proxy health', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // Load available tools
  const loadTools = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading MCP tools')
      const result = await proxyAPI.listTools()
      tools.value = result.tools
      logger.info('MCP tools loaded', { count: result.tools.length })
    } catch (err: any) {
      error.value = err.message || 'Failed to load MCP tools'
      logger.error('Failed to load MCP tools', err)
    } finally {
      loading.value = false
    }
  }

  // Load available resources
  const loadResources = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading MCP resources')
      const result = await proxyAPI.listResources()
      resources.value = result.resources
      logger.info('MCP resources loaded', { count: result.resources.length })
    } catch (err: any) {
      error.value = err.message || 'Failed to load MCP resources'
      logger.error('Failed to load MCP resources', err)
    } finally {
      loading.value = false
    }
  }

  // Send MCP message
  const sendMCPMessage = async (message: MCPMessage): Promise<MCPMessage | null> => {
    try {
      logger.info('Sending MCP message', { method: message.method, id: message.id })
      const response = await proxyAPI.sendMCPMessage(message)
      logger.info('MCP message sent', { id: message.id })
      return response
    } catch (err: any) {
      logger.error('Failed to send MCP message', err)
      return null
    }
  }

  // Get tool by name
  const getToolByName = (name: string): MCPTool | undefined => {
    return tools.value.find(tool => tool.name === name)
  }

  // Get resource by URI
  const getResourceByUri = (uri: string): MCPResource | undefined => {
    return resources.value.find(resource => resource.uri === uri)
  }

  // Check if proxy is healthy
  const isHealthy = (): boolean => {
    return health.value?.status === 'healthy'
  }

  // Get health status color class
  const getHealthStatusClass = (): string => {
    if (!health.value) return 'text-muted'
    return health.value.status === 'healthy' ? 'text-success' : 'text-danger'
  }

  // Get health status label
  const getHealthStatusLabel = (): string => {
    if (!health.value) return 'Unknown'
    return health.value.status.charAt(0).toUpperCase() + health.value.status.slice(1)
  }

  // Get tools count
  const getToolsCount = (): number => {
    return tools.value.length
  }

  // Get resources count
  const getResourcesCount = (): number => {
    return resources.value.length
  }

  // Load all proxy data
  const loadAllData = async (): Promise<void> => {
    await Promise.all([
      checkHealth(),
      loadTools(),
      loadResources()
    ])
  }

  return {
    // State
    health: readonly(health),
    tools: readonly(tools),
    resources: readonly(resources),
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    checkHealth,
    loadTools,
    loadResources,
    sendMCPMessage,
    getToolByName,
    getResourceByUri,
    isHealthy,
    getHealthStatusClass,
    getHealthStatusLabel,
    getToolsCount,
    getResourcesCount,
    loadAllData
  }
}