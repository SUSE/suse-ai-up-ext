import type { AxiosError, AxiosResponse } from 'axios'
import axios from 'axios'
import { getApiConfig, API_BASE_URLS } from '../config/api-config'

const apiClient = axios.create({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: getApiConfig().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface SecurityFinding {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info'
  category: string
  ruleId: string
  // Legacy field names for backward compatibility
  rule_id?: string
  vulnerability_type?: string
  evidence?: string
  status: 'open' | 'resolved' | 'ignored'
  discoveredAt: string
  resolvedAt?: string
  adapterName: string
  resourceName?: string
  namespace?: string
  cluster?: string
  recommendation?: string
  references?: string[]
  metadata?: Record<string, any>
}

export interface SecurityScanResult {
  scanId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  findings: SecurityFinding[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  adapterName: string
  scanConfig?: Record<string, any>
}

export interface SecurityRule {
  id: string
  name: string
  description: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  tags: string[]
  metadata?: Record<string, any>
}

export class SecurityEngineService {
  private static instance: SecurityEngineService

  static getInstance(): SecurityEngineService {
    if (!SecurityEngineService.instance) {
      SecurityEngineService.instance = new SecurityEngineService()
    }
    return SecurityEngineService.instance
  }

  async getFindings(adapterName?: string): Promise<SecurityFinding[]> {
    try {
      const params = adapterName ? { adapter: adapterName } : {}
      const response: AxiosResponse<SecurityFinding[]> = await apiClient.get('/security/findings', { params })
      return response.data
    } catch (error) {
      console.error('Failed to fetch security findings:', error)
      throw this.handleError(error)
    }
  }

  async getScanResults(scanId: string): Promise<SecurityScanResult> {
    try {
      const response: AxiosResponse<SecurityScanResult> = await apiClient.get(`/security/scans/${scanId}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch scan results:', error)
      throw this.handleError(error)
    }
  }

  async getRules(): Promise<SecurityRule[]> {
    try {
      const response: AxiosResponse<SecurityRule[]> = await apiClient.get('/security/rules')
      return response.data
    } catch (error) {
      console.error('Failed to fetch security rules:', error)
      throw this.handleError(error)
    }
  }

  async updateRule(ruleId: string, updates: Partial<SecurityRule>): Promise<SecurityRule> {
    try {
      const response: AxiosResponse<SecurityRule> = await apiClient.put(`/security/rules/${ruleId}`, updates)
      return response.data
    } catch (error) {
      console.error('Failed to update security rule:', error)
      throw this.handleError(error)
    }
  }

  async resolveFinding(findingId: string, resolution: { comment?: string }): Promise<SecurityFinding> {
    try {
      const response: AxiosResponse<SecurityFinding> = await apiClient.post(`/security/findings/${findingId}/resolve`, resolution)
      return response.data
    } catch (error) {
      console.error('Failed to resolve security finding:', error)
      throw this.handleError(error)
    }
  }

  async ignoreFinding(findingId: string, reason: { comment?: string }): Promise<SecurityFinding> {
    try {
      const response: AxiosResponse<SecurityFinding> = await apiClient.post(`/security/findings/${findingId}/ignore`, reason)
      return response.data
    } catch (error) {
      console.error('Failed to ignore security finding:', error)
      throw this.handleError(error)
    }
  }

  private handleError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as AxiosError
      const responseData = axiosError.response?.data as any
      const message = responseData?.message || axiosError.message || 'Unknown error occurred'
      return new Error(message)
    }
    return error as Error
  }
}

export const securityEngineService = SecurityEngineService.getInstance()