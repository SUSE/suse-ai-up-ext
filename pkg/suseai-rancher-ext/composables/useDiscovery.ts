// Discovery Composable
// Provides state management and API integration for network scanning

import { ref, readonly } from 'vue'
import { discoveryAPI, type ScanConfig, type ScanResult, type DiscoveredServer } from '../services/discovery-api'
import { logger } from '../utils/logger'

export function useDiscovery() {
  const discoveredServers = ref<DiscoveredServer[]>([])
  const loading = ref(false)
  const scanning = ref(false)
  const error = ref<string | null>(null)
  const currentScan = ref<ScanResult | null>(null)
  const scanProgress = ref(0)

  // Start network scan
  const startScan = async (config: ScanConfig): Promise<ScanResult> => {
    scanning.value = true
    error.value = null
    scanProgress.value = 0

    try {
      logger.info('Starting network scan', config)

      const result = await discoveryAPI.startScan(config)
      currentScan.value = {
        scan_id: result.scan_id,
        status: 'running',
        message: result.message
      } as ScanResult

      // Start polling for status
      pollScanStatus(result.scan_id)

      logger.info('Network scan initiated', { scanId: result.scan_id })
      return currentScan.value
    } catch (err: any) {
      error.value = err.message || 'Failed to start scan'
      logger.error('Failed to start network scan', err)
      scanning.value = false
      throw err
    }
  }

  // Poll scan status until completion
  const pollScanStatus = async (scanId: string): Promise<void> => {
    try {
      const status = await discoveryAPI.getScanStatus(scanId)
      currentScan.value = status

      if (status.status === 'running') {
        // Estimate progress (rough calculation)
        scanProgress.value = Math.min(scanProgress.value + 10, 90)
        // Continue polling
        setTimeout(() => pollScanStatus(scanId), 2000)
      } else if (status.status === 'completed') {
        scanProgress.value = 100
        scanning.value = false
        // Load discovered servers
        await loadDiscoveredServers()
        logger.info('Network scan completed', { scanId, serversFound: status.results?.length || 0 })
      } else if (status.status === 'failed') {
        scanProgress.value = 0
        scanning.value = false
        error.value = status.message || 'Scan failed'
        logger.error('Network scan failed', { scanId, error: status.message })
      }
    } catch (err: any) {
      scanning.value = false
      error.value = err.message || 'Failed to check scan status'
      logger.error('Failed to poll scan status', { scanId, error: err })
    }
  }

  // Load discovered servers
  const loadDiscoveredServers = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading discovered servers')
      const servers = await discoveryAPI.getDiscoveredServers()
      discoveredServers.value = servers
      logger.info('Discovered servers loaded', { count: servers.length })
    } catch (err: any) {
      error.value = err.message || 'Failed to load discovered servers'
      logger.error('Failed to load discovered servers', err)
    } finally {
      loading.value = false
    }
  }

  // Get server details
  const getServerDetails = async (id: string): Promise<DiscoveredServer | null> => {
    try {
      logger.info('Getting discovered server details', { id })
      return await discoveryAPI.getDiscoveredServer(id)
    } catch (err: any) {
      logger.error('Failed to get discovered server details', { id, error: err })
      return null
    }
  }

  // Get server by ID from current results
  const getServerById = (id: string): DiscoveredServer | undefined => {
    return discoveredServers.value.find(server => server.id === id)
  }

  // Check if server has security findings
  const hasSecurityFindings = (server: DiscoveredServer): boolean => {
    return !!(server.security_findings && server.security_findings.length > 0)
  }

  // Get security risk level
  const getSecurityRiskLevel = (server: DiscoveredServer): 'high' | 'medium' | 'low' | 'none' => {
    if (!server.security_findings || server.security_findings.length === 0) {
      return 'none'
    }

    const hasHigh = server.security_findings.some(f => f.severity === 'critical' || f.severity === 'high')
    const hasMedium = server.security_findings.some(f => f.severity === 'medium')

    if (hasHigh) return 'high'
    if (hasMedium) return 'medium'
    return 'low'
  }

  // Get vulnerability score
  const getVulnerabilityScore = (server: DiscoveredServer): 'high' | 'medium' | 'low' | 'none' => {
    return server.vulnerability_score || 'none'
  }

  // Filter servers by security criteria
  const filterBySecurity = (riskLevel?: string): DiscoveredServer[] => {
    if (!riskLevel || riskLevel === 'all') {
      return discoveredServers.value
    }

    return discoveredServers.value.filter(server => {
      const risk = getSecurityRiskLevel(server)
      return risk === riskLevel || (riskLevel === 'none' && risk === 'none')
    })
  }

  // Get scan statistics
  const getScanStats = () => {
    const total = discoveredServers.value.length
    const withSecurityIssues = discoveredServers.value.filter(hasSecurityFindings).length
    const highRisk = discoveredServers.value.filter(s => getSecurityRiskLevel(s) === 'high').length
    const mediumRisk = discoveredServers.value.filter(s => getSecurityRiskLevel(s) === 'medium').length
    const lowRisk = discoveredServers.value.filter(s => getSecurityRiskLevel(s) === 'low').length

    return {
      total,
      withSecurityIssues,
      highRisk,
      mediumRisk,
      lowRisk,
      healthy: total - withSecurityIssues
    }
  }

  // Clear results
  const clearResults = (): void => {
    discoveredServers.value = []
    currentScan.value = null
    scanProgress.value = 0
    error.value = null
  }

  return {
    // State
    discoveredServers: readonly(discoveredServers),
    loading: readonly(loading),
    scanning: readonly(scanning),
    error: readonly(error),
    currentScan: readonly(currentScan),
    scanProgress: readonly(scanProgress),

    // Methods
    startScan,
    loadDiscoveredServers,
    getServerDetails,
    getServerById,
    hasSecurityFindings,
    getSecurityRiskLevel,
    getVulnerabilityScore,
    filterBySecurity,
    getScanStats,
    clearResults
  }
}