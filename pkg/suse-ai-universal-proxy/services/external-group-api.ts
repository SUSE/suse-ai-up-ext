// External Group API Service
// Handles group management operations with the external MCP Gateway API

import { BaseAPI, APIConfig } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'
import type {
  ExternalGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddUserToGroupRequest
} from '../types/auth-types'

export class ExternalGroupAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }



  /**
   * List all groups
   */
  async list(): Promise<ExternalGroup[]> {
    try {
      logger.info('Listing external groups')

      const groups = await this.get<ExternalGroup[]>('/api/v1/groups')
      logger.info('External groups listed', { count: groups.length })

      return groups
    } catch (error) {
      logger.error('Failed to list external groups', error)
      throw error
    }
  }

  /**
   * Create a new group
   */
  async create(data: CreateGroupRequest): Promise<ExternalGroup> {
    try {
      logger.info('Creating external group', { id: data.id, name: data.name })

      const group = await this.post<ExternalGroup>('/api/v1/groups', data)
      logger.info('External group created', { id: group.id, name: group.name })

      return group
    } catch (error) {
      logger.error('Failed to create external group', error)
      throw error
    }
  }

  /**
   * Get group by ID
   */
  async getGroup(id: string): Promise<ExternalGroup> {
    try {
      logger.info('Getting external group', { id })

      const group = await this.get<ExternalGroup>(`/api/v1/groups/${id}`)
      logger.info('External group retrieved', { id, name: group.name })

      return group
    } catch (error) {
      logger.error('Failed to get external group', { id, error })
      throw error
    }
  }

  /**
   * Update group
   */
  async update(id: string, data: UpdateGroupRequest): Promise<ExternalGroup> {
    try {
      logger.info('Updating external group', { id })

      const group = await this.put<ExternalGroup>(`/api/v1/groups/${id}`, data)
      logger.info('External group updated', { id, name: group.name })

      return group
    } catch (error) {
      logger.error('Failed to update external group', { id, error })
      throw error
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(id: string): Promise<void> {
    try {
      logger.info('Deleting external group', { id })

      await this.delete<void>(`/api/v1/groups/${id}`)
      logger.info('External group deleted', { id })

    } catch (error) {
      logger.error('Failed to delete external group', { id, error })
      throw error
    }
  }

  /**
   * Add user to group
   */
  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    try {
      logger.info('Adding user to external group', { groupId, userId })

      await this.post<void>(`/api/v1/groups/${groupId}/members`, { userId })
      logger.info('User added to external group', { groupId, userId })

    } catch (error) {
      logger.error('Failed to add user to external group', { groupId, userId, error })
      throw error
    }
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    try {
      logger.info('Removing user from external group', { groupId, userId })

      await this.delete<void>(`/api/v1/groups/${groupId}/members/${userId}`)
      logger.info('User removed from external group', { groupId, userId })

    } catch (error) {
      logger.error('Failed to remove user from external group', { groupId, userId, error })
      throw error
    }
  }
}

// Singleton instance
export const externalGroupAPI = new ExternalGroupAPI({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  dynamicBaseURL: () => API_BASE_URLS.MCP_GATEWAY,
  timeout: 30000,
  retries: 3
})