<template>
  <div class="groups-table-container">
    <div class="table-header">
      <h3>Groups</h3>
      <div class="table-actions">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search groups..."
          class="search-input"
        />
        <button
          v-if="canManageGroups"
          class="btn btn-primary"
          @click="$emit('add-group')"
        >
          Add Group
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading groups...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button class="btn btn-secondary" @click="$emit('retry')">Retry</button>
    </div>

    <div v-else-if="filteredGroups.length === 0" class="empty-state">
      <p>{{ searchQuery ? 'No groups found matching your search.' : 'No groups available.' }}</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="groups-table">
        <thead>
          <tr>
            <th @click="sortBy('name')" class="sortable">
              Name
              <span v-if="sortField === 'name'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Description</th>
            <th @click="sortBy('members')" class="sortable">
              Members
              <span v-if="sortField === 'members'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Permissions</th>
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
            v-for="group in paginatedGroups"
            :key="group.id"
            class="group-row"
            @click="handleRowClick(group)"
          >
            <td>{{ group.name }}</td>
            <td>{{ group.description || 'No description' }}</td>
            <td>{{ getMemberCount(group) }}</td>
            <td>{{ getPermissionsSummary(group.permissions) }}</td>
            <td>{{ formatCreatedDate(group.createdAt) }}</td>
            <td class="actions-cell">
               <button
                 class="btn btn-sm btn-outline"
                 @click.stop="$emit('view-group', group)"
                 title="View Details"
               >
                 View
               </button>
               <button
                 v-if="canManageGroups"
                 class="btn btn-sm btn-outline"
                 @click.stop="$emit('edit-group', group)"
                 title="Edit Group"
               >
                 Edit
               </button>
               <button
                 v-if="canManageGroups"
                 class="btn btn-sm btn-outline"
                 @click.stop="$emit('manage-members', group)"
                 title="Manage Members"
               >
                 Members
               </button>
              <button
                v-if="canManageGroups"
                class="btn btn-sm btn-outline remove-btn"
                @click.stop="$emit('delete-group', group.id)"
                title="Delete Group"
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
import type { ExternalGroup, ExternalUser } from '../../types/auth-types';

export default defineComponent({
  name: 'GroupsTable',
  props: {
    groups: {
      type: Array as () => readonly ExternalGroup[],
      default: () => []
    },
    allUsers: {
      type: Array as () => readonly ExternalUser[],
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
    canManageGroups: {
      type: Boolean,
      default: false
    }
  },
  emits: ['view-group', 'edit-group', 'add-group', 'manage-members', 'delete-group', 'retry'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const sortField = ref<'name' | 'members' | 'createdAt'>('name');
    const sortDirection = ref<'asc' | 'desc'>('asc');
    const currentPage = ref(1);
    const pageSize = ref(10);

    // Filtered and sorted groups
    const filteredGroups = computed(() => {
      let filtered = [...props.groups];

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(group =>
          group.name.toLowerCase().includes(query) ||
          (group.description && group.description.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filtered.sort((a: ExternalGroup, b: ExternalGroup) => {
        let aValue: any = a[sortField.value];
        let bValue: any = b[sortField.value];

        // Handle special cases
        if (sortField.value === 'members') {
          aValue = a.members?.length || 0;
          bValue = b.members?.length || 0;
        } else if (sortField.value === 'createdAt') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1;
        return 0;
      });

      return filtered;
    });

    // Paginated groups
    const paginatedGroups = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return filteredGroups.value.slice(start, end);
    });

    // Total pages
    const totalPages = computed(() => {
      return Math.ceil(filteredGroups.value.length / pageSize.value);
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

    const getMemberCount = (group: ExternalGroup): string => {
      const count = group.members?.length || 0;
      return `${count} member${count !== 1 ? 's' : ''}`;
    };

    const getPermissionsSummary = (permissions: string[]): string => {
      if (!permissions || permissions.length === 0) return 'No permissions';
      return `${permissions.length} permission${permissions.length > 1 ? 's' : ''}`;
    };

    const formatCreatedDate = (createdAt?: string): string => {
      if (!createdAt) return 'Unknown';

      const date = new Date(createdAt);
      return date.toLocaleDateString();
    };

    const handleRowClick = (group: ExternalGroup) => {
      emit('view-group', group.id);
    };

    return {
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      filteredGroups,
      paginatedGroups,
      totalPages,
      sortBy,
      getMemberCount,
      getPermissionsSummary,
      formatCreatedDate,
      handleRowClick
    };
  }
});
</script>

<style scoped>
.groups-table-container {
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

.groups-table {
  width: 100%;
  border-collapse: collapse;
}

.groups-table th,
.groups-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.groups-table th {
  background: var(--sortable-table-header-bg);
  font-weight: 600;
  color: var(--text);
  position: sticky;
  top: 0;
}

.groups-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.groups-table th.sortable:hover {
  background: var(--hover-bg);
}

.sort-indicator {
  margin-left: 5px;
  font-size: 12px;
}

.group-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.group-row:hover {
  background: var(--sortable-table-accent-bg);
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