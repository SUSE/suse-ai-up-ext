// Permissions Composable
// Provides state management and API integration for adapter permission management

import { ref, readonly } from 'vue'
import { permissionAPI } from '../services/permission-api'
import { logger } from '../utils/logger'
import type { RouteAssignment } from '../types/auth-types'

export function usePermissions() {
  const assignments = ref<RouteAssignment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load all permission assignments
  const loadAssignments = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading permission assignments')
      const assignmentList = await permissionAPI.listAllAssignments()
      assignments.value = assignmentList
      logger.info('Permission assignments loaded', { count: assignmentList.length })
    } catch (err: any) {
      error.value = err.message || 'Failed to load permission assignments'
      logger.error('Failed to load permission assignments', err)
    } finally {
      loading.value = false
    }
  }

  // Load permissions for a specific adapter
  const loadAdapterPermissions = async (adapterId: string): Promise<RouteAssignment[]> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading adapter permissions', { adapterId })
      const adapterAssignments = await permissionAPI.getAdapterPermissions(adapterId)

      // Update local state with adapter-specific assignments
      const otherAssignments = assignments.value.filter(a => a.serverId !== adapterId)
      assignments.value = [...otherAssignments, ...adapterAssignments]

      logger.info('Adapter permissions loaded', { adapterId, count: adapterAssignments.length })
      return adapterAssignments
    } catch (err: any) {
      error.value = err.message || 'Failed to load adapter permissions'
      logger.error('Failed to load adapter permissions', { adapterId, error: err })
      return []
    } finally {
      loading.value = false
    }
  }

  // Assign permissions to an adapter
  const assignPermissions = async (assignment: Omit<RouteAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<RouteAssignment | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Assigning adapter permissions', {
        serverId: assignment.serverId,
        permissions: assignment.permissions,
        userCount: assignment.userIds.length,
        groupCount: assignment.groupIds.length
      })

      const result = await permissionAPI.assignPermissions(assignment)
      assignments.value.push(result)

      logger.info('Adapter permissions assigned', { id: result.id, serverId: result.serverId })
      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to assign permissions'
      logger.error('Failed to assign adapter permissions', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Update existing permission assignment
  const updatePermissions = async (assignmentId: string, permissions: 'read' | 'write' | 'admin'): Promise<RouteAssignment | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Updating permission assignment', { assignmentId, permissions })

      const result = await permissionAPI.updatePermissions(assignmentId, permissions)

      // Update local state
      const index = assignments.value.findIndex(a => a.id === assignmentId)
      if (index >= 0) {
        assignments.value[index] = result
      }

      logger.info('Permission assignment updated', { assignmentId, permissions: result.permissions })
      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to update permissions'
      logger.error('Failed to update permission assignment', { assignmentId, error: err })
      return null
    } finally {
      loading.value = false
    }
  }

  // Remove permission assignment
  const removePermissions = async (assignmentId: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Removing permission assignment', { assignmentId })
      await permissionAPI.removePermissions(assignmentId)

      // Remove from local state
      assignments.value = assignments.value.filter(a => a.id !== assignmentId)

      logger.info('Permission assignment removed', { assignmentId })
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to remove permissions'
      logger.error('Failed to remove permission assignment', { assignmentId, error: err })
      return false
    } finally {
      loading.value = false
    }
  }

  // Get assignments by adapter ID
  const getAssignmentsByAdapterId = (adapterId: string): RouteAssignment[] => {
    return assignments.value.filter(assignment => assignment.serverId === adapterId)
  }

  // Get assignments by user ID (direct assignments)
  const getAssignmentsByUserId = (userId: string): RouteAssignment[] => {
    return assignments.value.filter(assignment => assignment.userIds.includes(userId))
  }

  // Get assignments by group ID
  const getAssignmentsByGroupId = (groupId: string): RouteAssignment[] => {
    return assignments.value.filter(assignment => assignment.groupIds.includes(groupId))
  }

  // Check if user has specific permission for adapter (considering both direct and group permissions)
  const checkUserPermission = (
    userId: string,
    groupIds: string[],
    adapterId: string,
    requiredPermission: 'read' | 'write' | 'admin'
  ): boolean => {
    const relevantAssignments = assignments.value.filter(a => a.serverId === adapterId)

    // Check permission levels (admin > write > read)
    const permissionLevels = { read: 1, write: 2, admin: 3 }
    const requiredLevel = permissionLevels[requiredPermission]

    for (const assignment of relevantAssignments) {
      // Check direct user assignment
      if (assignment.userIds.includes(userId)) {
        const assignmentLevel = permissionLevels[assignment.permissions]
        if (assignmentLevel >= requiredLevel) {
          return true
        }
      }

      // Check group assignments
      for (const groupId of groupIds) {
        if (assignment.groupIds.includes(groupId)) {
          const assignmentLevel = permissionLevels[assignment.permissions]
          if (assignmentLevel >= requiredLevel) {
            return true
          }
        }
      }
    }

    return false
  }

  // Get effective permission for user on adapter
  const getEffectivePermission = (
    userId: string,
    groupIds: string[],
    adapterId: string
  ): 'read' | 'write' | 'admin' | null => {
    const relevantAssignments = assignments.value.filter(a => a.serverId === adapterId)

    // Check permission levels (admin > write > read)
    const permissionLevels = { read: 1, write: 2, admin: 3 }
    let highestLevel = 0
    let effectivePermission: 'read' | 'write' | 'admin' | null = null

    for (const assignment of relevantAssignments) {
      // Check direct user assignment
      if (assignment.userIds.includes(userId)) {
        const level = permissionLevels[assignment.permissions]
        if (level > highestLevel) {
          highestLevel = level
          effectivePermission = assignment.permissions
        }
      }

      // Check group assignments
      for (const groupId of groupIds) {
        if (assignment.groupIds.includes(groupId)) {
          const level = permissionLevels[assignment.permissions]
          if (level > highestLevel) {
            highestLevel = level
            effectivePermission = assignment.permissions
          }
        }
      }
    }

    return effectivePermission
  }

  return {
    // State
    assignments,
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    loadAssignments,
    loadAdapterPermissions,
    assignPermissions,
    updatePermissions,
    removePermissions,
    getAssignmentsByAdapterId,
    getAssignmentsByUserId,
    getAssignmentsByGroupId,
    checkUserPermission,
    getEffectivePermission
  }
}