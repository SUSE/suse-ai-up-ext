// External Users Composable
// Provides state management and API integration for external user management

import { ref, readonly } from 'vue'
import { externalUserAPI } from '../services/external-user-api'
import { logger } from '../utils/logger'
import type {
  ExternalUser,
  CreateUserRequest,
  UpdateUserRequest,
  CreateUserResponse
} from '../types/auth-types'

export function useExternalUsers() {
  const users = ref<ExternalUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load all users
  const loadUsers = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Loading external users')
      const userList = await externalUserAPI.list()
      users.value = userList
      logger.info('External users loaded', { count: userList.length })
    } catch (err: any) {
      error.value = err.message || 'Failed to load users'
      logger.error('Failed to load external users', err)
    } finally {
      loading.value = false
    }
  }

  // Create new user
   const createUser = async (data: CreateUserRequest): Promise<ExternalUser | null> => {
     loading.value = true
     error.value = null

     try {
       logger.info('Creating external user', { name: data.name, email: data.email })
       console.log('Calling externalUserAPI.create with:', data)
       const response = await externalUserAPI.create(data)
       console.log('Create response:', response)
       users.value.push(response.user)
       logger.info('External user created', { id: response.user.id, name: response.user.name })
       return response.user
     } catch (err: any) {
       error.value = err.message || 'Failed to create user'
       logger.error('Failed to create external user', err)
       return null
     } finally {
       loading.value = false
     }
   }

  // Get user by ID
  const getUser = async (id: string): Promise<ExternalUser | null> => {
    try {
      logger.info('Getting external user details', { id })
      return await externalUserAPI.getUser(id)
    } catch (err: any) {
      logger.error('Failed to get external user', { id, error: err })
      return null
    }
  }

  // Update user
  const updateUser = async (id: string, data: UpdateUserRequest): Promise<ExternalUser | null> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Updating external user', { id })
      const user = await externalUserAPI.update(id, data)

      // Update local state
      const index = users.value.findIndex(u => u.id === id)
      if (index >= 0) {
        users.value[index] = user
      }

      logger.info('External user updated', { id, name: user.name })
      return user
    } catch (err: any) {
      error.value = err.message || 'Failed to update user'
      logger.error('Failed to update external user', { id, error: err })
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete user
  const deleteUser = async (id: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      logger.info('Deleting external user', { id })
      await externalUserAPI.deleteUser(id)

      // Remove from local state
      users.value = users.value.filter(u => u.id !== id)

      logger.info('External user deleted', { id })
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to delete user'
      logger.error('Failed to delete external user', { id, error: err })
      return false
    } finally {
      loading.value = false
    }
  }

  // Get user by ID from local state
  const getUserById = (id: string): ExternalUser | undefined => {
    return users.value.find(user => user.id === id)
  }

  // Get users by group ID
  const getUsersByGroupId = (groupId: string): ExternalUser[] => {
    return users.value.filter(user => user.groups.includes(groupId))
  }

  return {
    // State
    users,
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    loadUsers,
    createUser,
    getUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByGroupId
  }
}