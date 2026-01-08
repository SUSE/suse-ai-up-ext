// Permission API Service
// Handles permission management for adapter access control using route assignments

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'
import type { RouteAssignment } from '../types/auth-types'

// Note: The current API doesn't have explicit permission endpoints,
// so we'll need to work with the route assignments in the MCP server registry
// This is a placeholder for future permission API endpoints

export class PermissionAPI {
  private api: AxiosInstance

  constructor(baseURL: string, timeout: number = 30000) {
    this.api = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Setup basic error handling (no auth headers for CORS compatibility)
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response
          const apiError = {
            code: data?.code || `HTTP_${status}`,
            message: data?.error || data?.message || `HTTP ${status} error`,
            details: data?.details,
            status
          }
          return Promise.reject(apiError)
        } else if (error.request) {
          return Promise.reject({
            code: 'NETWORK_ERROR',
            message: 'Network error - please check your connection',
            details: { originalError: error.message }
          })
        } else {
          return Promise.reject({
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unexpected error occurred',
            details: { originalError: error }
          })
        }
      }
    )
  }

  // HTTP methods
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.api.request({
        method,
        url,
        data,
        ...config
      })
      return response.data
    } catch (error) {
      // Error already handled by interceptor
      throw error
    }
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config)
  }

  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config)
  }

  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config)
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  /**
   * Get permissions for a specific adapter/server
   * This would need to be implemented based on the actual API structure
   * For now, we'll assume route assignments are part of server registry
   */
  async getAdapterPermissions(adapterId: string): Promise<RouteAssignment[]> {
    try {
      logger.info('Getting adapter permissions', { adapterId })

      // For now, this is a placeholder - the actual implementation would depend
      // on how permissions are stored and retrieved from the API
      // This might be part of the MCP server registry or a separate permissions endpoint

      const assignments = await this.get<RouteAssignment[]>(`/api/v1/permissions/adapters/${adapterId}`)
      logger.info('Adapter permissions retrieved', { adapterId, count: assignments.length })

      return assignments
    } catch (error) {
      logger.error('Failed to get adapter permissions', { adapterId, error })
      throw error
    }
  }

  /**
   * Assign permissions to an adapter
   */
  async assignPermissions(assignment: Omit<RouteAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<RouteAssignment> {
    try {
      logger.info('Assigning adapter permissions', {
        serverId: assignment.serverId,
        userIds: assignment.userIds,
        groupIds: assignment.groupIds,
        permissions: assignment.permissions
      })

      const result = await this.post<RouteAssignment>('/api/v1/permissions/assignments', assignment)
      logger.info('Adapter permissions assigned', { id: result.id, serverId: result.serverId })

      return result
    } catch (error) {
      logger.error('Failed to assign adapter permissions', error)
      throw error
    }
  }

  /**
   * Update existing permission assignment
   */
  async updatePermissions(assignmentId: string, permissions: 'read' | 'write' | 'admin'): Promise<RouteAssignment> {
    try {
      logger.info('Updating permission assignment', { assignmentId, permissions })

      const result = await this.put<RouteAssignment>(`/api/v1/permissions/assignments/${assignmentId}`, {
        permissions
      })
      logger.info('Permission assignment updated', { assignmentId, permissions: result.permissions })

      return result
    } catch (error) {
      logger.error('Failed to update permission assignment', { assignmentId, error })
      throw error
    }
  }

  /**
   * Remove permission assignment
   */
  async removePermissions(assignmentId: string): Promise<void> {
    try {
      logger.info('Removing permission assignment', { assignmentId })

      await this.delete<void>(`/api/v1/permissions/assignments/${assignmentId}`)
      logger.info('Permission assignment removed', { assignmentId })

    } catch (error) {
      logger.error('Failed to remove permission assignment', { assignmentId, error })
      throw error
    }
  }

  /**
   * List all permission assignments (for admin view)
   */
  async listAllAssignments(): Promise<RouteAssignment[]> {
    try {
      logger.info('Listing all permission assignments')

      const assignments = await this.get<RouteAssignment[]>('/api/v1/permissions/assignments')
      logger.info('Permission assignments listed', { count: assignments.length })

      return assignments
    } catch (error) {
      logger.error('Failed to list permission assignments', error)
      throw error
    }
  }
}

// Singleton instance
export const permissionAPI = new PermissionAPI(
  API_BASE_URLS.MCP_GATEWAY,
  30000
)