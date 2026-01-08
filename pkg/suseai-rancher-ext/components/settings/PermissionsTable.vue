<template>
  <div class="permissions-table-container">
    <div class="table-header">
      <h3>Adapter Permissions</h3>
      <div class="table-actions">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search permissions..."
          class="search-input"
        />
        <button
          v-if="canManagePermissions"
          class="btn btn-primary"
          @click="$emit('assign-permissions')"
        >
          Assign Permissions
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading permissions...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button class="btn btn-secondary" @click="$emit('retry')">Retry</button>
    </div>

    <div v-else-if="filteredAssignments.length === 0" class="empty-state">
      <p>{{ searchQuery ? 'No permissions found matching your search.' : 'No permissions assigned.' }}</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="permissions-table">
        <thead>
          <tr>
            <th @click="sortBy('serverId')" class="sortable">
              Adapter
              <span v-if="sortField === 'serverId'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sortBy('permissions')" class="sortable">
              Permission Level
              <span v-if="sortField === 'permissions'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Users</th>
            <th>Groups</th>
            <th @click="sortBy('createdAt')" class="sortable">
              Created
              <span v-if="sortField === 'createdAt'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="assignment in paginatedAssignments"
            :key="assignment.id"
            class="permission-row"
            @click="handleRowClick(assignment)"
          >
            <td>{{ assignment.serverId }}</td>
            <td>
              <span class="permission-badge" :class="`permission-${assignment.permissions}`">
                {{ formatPermission(assignment.permissions) }}
              </span>
            </td>
            <td>{{ getUserNames(assignment.userIds) }}</td>
            <td>{{ getGroupNames(assignment.groupIds) }}</td>
            <td>{{ formatCreatedDate(assignment.createdAt) }}</td>
            <td class="actions-cell">
              <button
                class="btn btn-sm btn-outline"
                @click.stop="$emit('edit-permissions', assignment)"
                title="Edit Permissions"
              >
                Edit
              </button>
              <button
                v-if="canManagePermissions"
                class="btn btn-sm btn-outline remove-btn"
                @click.stop="$emit('remove-permissions', assignment.id)"
                title="Remove Permissions"
              >
                Remove
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
import type { RouteAssignment, ExternalUser, ExternalGroup } from '../../types/auth-types';

export default defineComponent({
  name: 'PermissionsTable',
  props: {
    assignments: {
      type: Array as () => readonly RouteAssignment[],
      default: () => []
    },
    allUsers: {
      type: Array as () => readonly ExternalUser[],
      default: () => []
    },
    allGroups: {
      type: Array as () => readonly ExternalGroup[],
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
    canManagePermissions: {
      type: Boolean,
      default: false
    }
  },
  emits: ['assign-permissions', 'edit-permissions', 'remove-permissions', 'retry'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const sortField = ref<'serverId' | 'permissions' | 'createdAt'>('serverId');
    const sortDirection = ref<'asc' | 'desc'>('asc');
    const currentPage = ref(1);
    const pageSize = ref(10);

    // Filtered and sorted assignments
    const filteredAssignments = computed(() => {
      let filtered = [...props.assignments];

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(assignment =>
          assignment.serverId.toLowerCase().includes(query) ||
          assignment.permissions.toLowerCase().includes(query) ||
          getUserNames(assignment.userIds).toLowerCase().includes(query) ||
          getGroupNames(assignment.groupIds).toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filtered.sort((a: RouteAssignment, b: RouteAssignment) => {
        let aValue: any = a[sortField.value];
        let bValue: any = b[sortField.value];

        // Handle special cases
        if (sortField.value === 'createdAt') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1;
        return 0;
      });

      return filtered;
    });

    // Paginated assignments
    const paginatedAssignments = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return filteredAssignments.value.slice(start, end);
    });

    // Total pages
    const totalPages = computed(() => {
      return Math.ceil(filteredAssignments.value.length / pageSize.value);
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

    const formatPermission = (permission: string): string => {
      return permission.charAt(0).toUpperCase() + permission.slice(1);
    };

    const getUserNames = (userIds: string[]): string => {
      if (!userIds || userIds.length === 0) return 'None';
      const users = props.allUsers.filter(user => userIds.includes(user.id));
      const names = users.map(user => user.name);
      return names.join(', ');
    };

    const getGroupNames = (groupIds: string[]): string => {
      if (!groupIds || groupIds.length === 0) return 'None';
      const groups = props.allGroups.filter(group => groupIds.includes(group.id));
      const names = groups.map(group => group.name);
      return names.join(', ');
    };

    const formatCreatedDate = (createdAt?: string): string => {
      if (!createdAt) return 'Unknown';

      const date = new Date(createdAt);
      return date.toLocaleDateString();
    };

    const handleRowClick = (assignment: RouteAssignment) => {
      emit('edit-permissions', assignment);
    };

    return {
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      filteredAssignments,
      paginatedAssignments,
      totalPages,
      sortBy,
      formatPermission,
      getUserNames,
      getGroupNames,
      formatCreatedDate,
      handleRowClick
    };
  }
});
</script>

<style scoped>
.permissions-table-container {
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

.permissions-table {
  width: 100%;
  border-collapse: collapse;
}

.permissions-table th,
.permissions-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.permissions-table th {
  background: var(--sortable-table-header-bg);
  font-weight: 600;
  color: var(--text);
  position: sticky;
  top: 0;
}

.permissions-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.permissions-table th.sortable:hover {
  background: var(--hover-bg);
}

.sort-indicator {
  margin-left: 5px;
  font-size: 12px;
}

.permission-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.permission-row:hover {
  background: var(--sortable-table-accent-bg);
}

.permission-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.permission-read {
  background: var(--info-bg);
  color: var(--info);
}

.permission-write {
  background: var(--warning-bg);
  color: var(--warning);
}

.permission-admin {
  background: var(--error-bg);
  color: var(--error);
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell .btn {
  margin-right: 5px;
}

.remove-btn {
  color: var(--error);
  border-color: var(--error);
}

.remove-btn:hover {
  background: var(--error-bg);
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
</style>