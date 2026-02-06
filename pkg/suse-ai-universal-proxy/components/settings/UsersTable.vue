<template>
  <div class="users-table-container">
    <div class="table-header">
      <h3>Users</h3>
      <div class="table-actions">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search users..."
          class="search-input"
        />
        <button
          v-if="canManageUsers"
          class="btn btn-primary"
          @click="$emit('add-user')"
        >
           Create User
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading users...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button class="btn btn-secondary" @click="$emit('retry')">Retry</button>
    </div>

    <div v-else-if="filteredUsers.length === 0" class="empty-state">
      <p>{{ searchQuery ? 'No users found matching your search.' : 'No users available.' }}</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="users-table">
        <thead>
          <tr>
            <th @click="sortBy('username')" class="sortable">
              Username
              <span v-if="sortField === 'username'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th v-if="isExternal" @click="sortBy('email')" class="sortable">
              Email
              <span v-if="sortField === 'email'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sortBy('displayName')" class="sortable">
              Display Name
              <span v-if="sortField === 'displayName'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th v-if="!isExternal">Provider</th>
            <th @click="sortBy('enabled')" class="sortable">
              Status
              <span v-if="sortField === 'enabled'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sortBy('lastLogin')" class="sortable">
              Last Login
              <span v-if="sortField === 'lastLogin'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in paginatedUsers"
            :key="user.id"
            class="user-row"
            @click="handleRowClick(user)"
          >
            <td>{{ getUserUsername(user) }}</td>
            <td v-if="$props.isExternal">{{ getUserEmail(user) }}</td>
            <td>{{ getUserDisplayName(user) }}</td>
            <td v-if="!$props.isExternal">{{ getAuthProvider(user as any) }}</td>
            <td v-if="!$props.isExternal">
              <span
                class="status-badge"
                :class="{ 'status-enabled': (user as any).enabled, 'status-disabled': !(user as any).enabled }"
              >
                {{ (user as any).enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </td>
            <td v-if="!$props.isExternal">{{ formatLastLogin((user as any).lastLogin) }}</td>
            <td class="actions-cell">
              <button
                class="btn btn-sm btn-outline"
                @click.stop="$emit('view-user', user.id)"
                title="View Details"
              >
                View
              </button>
              <button
                v-if="canManageUsers"
                class="btn btn-sm btn-outline"
                @click.stop="$emit('edit-user', user.id)"
                title="Edit User"
              >
                Edit
              </button>
              <button
                v-if="canManageUsers"
                class="btn btn-sm btn-outline remove-btn"
                @click.stop="$emit('delete-user', user.id)"
                title="Delete User"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="btn btn-sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Previous
        </button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          class="btn btn-sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { RancherUser, ExternalUser } from '../../types/auth-types';

export default defineComponent({
  name: 'UsersTable',
  props: {
    users: {
      type: Array as () => readonly (RancherUser | ExternalUser)[],
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    canManageUsers: {
      type: Boolean,
      default: false
    },
    isExternal: {
      type: Boolean,
      default: false
    }
  },
  emits: ['view-user', 'edit-user', 'add-user', 'delete-user', 'retry'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const sortField = ref<'username' | 'email' | 'displayName' | 'enabled' | 'lastLogin'>('username');
    const sortDirection = ref<'asc' | 'desc'>('asc');
    const currentPage = ref(1);
    const pageSize = ref(10);

    // Filtered and sorted users
    const filteredUsers = computed(() => {
      let filtered = [...props.users];

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(user =>
          getUserUsername(user).toLowerCase().includes(query) ||
          (getUserDisplayName(user) && getUserDisplayName(user).toLowerCase().includes(query)) ||
          (props.isExternal && getUserEmail(user) && getUserEmail(user).toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filtered.sort((a: RancherUser | ExternalUser, b: RancherUser | ExternalUser) => {
        let aValue: any;
        let bValue: any;

        // Handle different user types
        if (sortField.value === 'username') {
          aValue = getUserUsername(a);
          bValue = getUserUsername(b);
        } else if (sortField.value === 'displayName') {
          aValue = getUserDisplayName(a);
          bValue = getUserDisplayName(b);
        } else if (sortField.value === 'enabled') {
          aValue = props.isExternal ? true : (a as RancherUser).enabled;
          bValue = props.isExternal ? true : (b as RancherUser).enabled;
        } else if (sortField.value === 'lastLogin') {
          aValue = props.isExternal ? 0 : ((a as RancherUser).lastLogin ? new Date((a as RancherUser).lastLogin!).getTime() : 0);
          bValue = props.isExternal ? 0 : ((b as RancherUser).lastLogin ? new Date((b as RancherUser).lastLogin!).getTime() : 0);
        } else {
          aValue = '';
          bValue = '';
        }

        if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1;
        return 0;
      });

      return filtered;
    });

    // Paginated users
    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return filteredUsers.value.slice(start, end);
    });

    // Total pages
    const totalPages = computed(() => {
      return Math.ceil(filteredUsers.value.length / pageSize.value);
    });

    // Reset pagination when filters change
    watch([searchQuery, sortField, sortDirection], () => {
      currentPage.value = 1;
    });

    // Methods
    const sortBy = (field: typeof sortField.value) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortDirection.value = 'asc';
      }
    };

    const getAuthProvider = (user: RancherUser): string => {
      // Extract provider from principal IDs
      const principalId = user.principalIds.find(id => id.includes(':'));
      if (!principalId) return 'Local';

      const parts = principalId.split(':');
      if (parts.length >= 2) {
        const provider = parts[1];
        return provider.charAt(0).toUpperCase() + provider.slice(1);
      }

      return 'Local';
    };

    const formatLastLogin = (lastLogin?: string): string => {
      if (!lastLogin) return 'Never';

      const date = new Date(lastLogin);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString();
    };

    const handleRowClick = (user: RancherUser | ExternalUser) => {
      emit('view-user', user.id);
    };

    // Helper methods for different user types
    const getUserUsername = (user: RancherUser | ExternalUser): string => {
      return 'username' in user ? user.username : user.name;
    };

    const getUserDisplayName = (user: RancherUser | ExternalUser): string => {
      if ('displayName' in user) {
        return user.displayName || user.username;
      }
      return user.name;
    };

    const getUserEmail = (user: RancherUser | ExternalUser): string => {
      return 'email' in user ? user.email : '';
    };

    return {
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      filteredUsers,
      paginatedUsers,
      totalPages,
      sortBy,
      getAuthProvider,
      formatLastLogin,
      handleRowClick,
      getUserUsername,
      getUserDisplayName,
      getUserEmail
    };
  }
});
</script>

<style scoped>
.users-table-container {
  width: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-header h3 {
  margin: 0;
  color: var(--text);
}

.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text);
  min-width: 200px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top: 2px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: var(--error);
  margin-bottom: 10px;
}

.table-wrapper {
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.users-table th {
  background: var(--sortable-table-header-bg);
  font-weight: 600;
  color: var(--text);
  position: sticky;
  top: 0;
}

.users-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.users-table th.sortable:hover {
  background: var(--hover-bg);
}

.sort-indicator {
  margin-left: 5px;
  font-size: 12px;
}

.user-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-row:hover {
  background: var(--sortable-table-accent-bg);
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-enabled {
  background: var(--success-bg);
  color: var(--success);
}

.status-disabled {
  background: var(--error-bg);
  color: var(--error);
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell .btn {
  margin-right: 5px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
}

.page-info {
  color: var(--text-muted);
  font-size: 14px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--button-hover-bg);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-outline {
  background: transparent;
  border-color: var(--border);
}

.btn-outline:hover {
  background: var(--hover-bg);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-secondary {
  background: var(--secondary);
  color: var(--secondary-text);
}

.remove-btn {
  color: var(--error);
  border-color: var(--error);
}

.remove-btn:hover {
  background: var(--error-bg);
}
</style>