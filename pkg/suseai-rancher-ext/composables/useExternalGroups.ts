// External Groups Composable
// Provides state management and API integration for external group management

import { ref, readonly } from 'vue'
import { externalGroupAPI } from '../services/external-group-api'
import { logger } from '../utils/logger'
import type {
  ExternalGroup,
  ExternalUser,
  CreateGroupRequest,
  UpdateGroupRequest
} from '../types/auth-types'

export function useExternalGroups() {
  const groups = ref<ExternalGroup[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load all groups
  const loadGroups = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading external groups')
      const groupList = await externalGroupAPI.list()
      groups.value = groupList
      logger.info('External groups loaded', { count: groupList.length })
    } catch (err: any) {
      error.value = err.message || 'Failed to load groups'
      logger.error('Failed to load external groups', err)
    } finally {
      loading.value = false
    }
  }

  // Create new group
  const createGroup = async (data: CreateGroupRequest): Promise<ExternalGroup | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Creating external group', { name: data.name })
      const group = await externalGroupAPI.create(data)
      groups.value.push(group)
      logger.info('External group created', { id: group.id, name: group.name })
      return group
    } catch (err: any) {
      error.value = err.message || 'Failed to create group'
      logger.error('Failed to create external group', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Get group by ID
  const getGroup = async (id: string): Promise<ExternalGroup | null> => {
    try {
      logger.info('Getting external group details', { id })
      return await externalGroupAPI.getGroup(id)
    } catch (err: any) {
      logger.error('Failed to get external group', { id, error: err })
      return null
    }
  }

  // Update group
  const updateGroup = async (id: string, data: UpdateGroupRequest): Promise<ExternalGroup | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Updating external group', { id })
      const group = await externalGroupAPI.update(id, data)

      // Update local state
      const index = groups.value.findIndex(g => g.id === id)
      if (index >= 0) {
        groups.value[index] = group
      }

      logger.info('External group updated', { id, name: group.name })
      return group
    } catch (err: any) {
      error.value = err.message || 'Failed to update group'
      logger.error('Failed to update external group', { id, error: err })
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete group
  const deleteGroup = async (id: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Deleting external group', { id })
      await externalGroupAPI.deleteGroup(id)

      // Remove from local state
      groups.value = groups.value.filter(g => g.id !== id)

      logger.info('External group deleted', { id })
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to delete group'
      logger.error('Failed to delete external group', { id, error: err })
      return false
    } finally {
      loading.value = false
    }
  }

  // Add user to group
  const addUserToGroup = async (groupId: string, userId: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Adding user to external group', { groupId, userId })
      await externalGroupAPI.addUserToGroup(groupId, userId)

      // Update local state
      const groupIndex = groups.value.findIndex(g => g.id === groupId)
      if (groupIndex >= 0 && !groups.value[groupIndex].members.includes(userId)) {
        groups.value[groupIndex].members.push(userId)
      }

      logger.info('User added to external group', { groupId, userId })
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to add user to group'
      logger.error('Failed to add user to external group', { groupId, userId, error: err })
      return false
    } finally {
      loading.value = false
    }
  }

  // Remove user from group
  const removeUserFromGroup = async (groupId: string, userId: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Removing user from external group', { groupId, userId })
      await externalGroupAPI.removeUserFromGroup(groupId, userId)

      // Update local state
      const groupIndex = groups.value.findIndex(g => g.id === groupId)
      if (groupIndex >= 0) {
        groups.value[groupIndex].members = groups.value[groupIndex].members.filter(id => id !== userId)
      }

      logger.info('User removed from external group', { groupId, userId })
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to remove user from group'
      logger.error('Failed to remove user from external group', { groupId, userId, error: err })
      return false
    } finally {
      loading.value = false
    }
  }

  // Get group by ID from local state
  const getGroupById = (id: string): ExternalGroup | undefined => {
    return groups.value.find(group => group.id === id)
  }

  // Get groups by user ID
  const getGroupsByUserId = (userId: string): ExternalGroup[] => {
    return groups.value.filter(group => group.members.includes(userId))
  }

  // Get group member details (requires user data)
  const getGroupMembers = (groupId: string, allUsers: ExternalUser[]): ExternalUser[] => {
    const group = getGroupById(groupId)
    if (!group) return []

    return allUsers.filter(user => group.members.includes(user.id))
  }

  return {
    // State
    groups,
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    loadGroups,
    createGroup,
    getGroup,
    updateGroup,
    deleteGroup,
    addUserToGroup,
    removeUserFromGroup,
    getGroupById,
    getGroupsByUserId,
    getGroupMembers
  }
}