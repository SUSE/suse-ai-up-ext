<template>
  <div class="app-resource-table">
    <!-- Resource Table Header -->
    <div class="resource-header">
      <div class="title-section">
        <h1 class="title-text">{{ title }}</h1>
        <span v-if="loading" class="loading-text">Loading...</span>
        <span v-else-if="error" class="error-text">{{ error }}</span>
      </div>
      
      <div class="actions">
        <div class="view-toggle" v-if="showViewToggle">
          <button 
            class="btn btn-sm"
            :class="{ 'role-primary': viewMode === 'tiles', 'role-secondary': viewMode !== 'tiles' }"
            @click="$emit('update:viewMode', 'tiles')"
            title="Tiles View"
          >
            <i class="icon icon-th view-icon-grid"></i>
          </button>
          <button 
            class="btn btn-sm"
            :class="{ 'role-primary': viewMode === 'table', 'role-secondary': viewMode !== 'table' }"
            @click="$emit('update:viewMode', 'table')"
            title="Table View"
          >
            <i class="icon icon-th-list view-icon-list"></i>
          </button>
        </div>
        <button class="btn btn-sm role-secondary" @click="$emit('refresh')" :disabled="loading">
          <i class="icon icon-refresh"></i>
          Refresh
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="search-filter-bar">
      <div class="search-box">
        <input
          :value="searchValue"
          @input="$emit('update:search', ($event.target as HTMLInputElement)?.value || '')"
          type="search"
          placeholder="Search applications..."
          class="search-input"
        />
        <i class="icon icon-search"></i>
      </div>
      
      <div class="filters">
        <select 
          :value="selectedRepository" 
          @change="$emit('update:selectedRepository', ($event.target as HTMLSelectElement)?.value || '')"
          class="form-control"
        >
          <option value="suse-ai-apps">SUSE AI Apps</option>
          <option value="all">All Repositories</option>
          <option v-for="repo in repositories" :key="repo.name" :value="repo.name">
            {{ repo.displayName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Content Slot -->
    <slot 
      :filteredApps="filteredApps"
      :loading="loading"
      :error="error"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { PropType } from 'vue';
import type { AppCollectionItem, AppRepository } from '../../models/app/app-collection';

export default defineComponent({
  name: 'AppResourceTable',
  
  props: {
    title: {
      type: String,
      default: 'Applications'
    },
    
    apps: {
      type: Array as PropType<AppCollectionItem[]>,
      default: () => []
    },
    
    repositories: {
      type: Array as PropType<AppRepository[]>,
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
    
    searchValue: {
      type: String,
      default: ''
    },
    
    selectedRepository: {
      type: String,
      default: 'suse-ai-apps'
    },
    
    viewMode: {
      type: String as PropType<'tiles' | 'table'>,
      default: 'tiles'
    },
    
    showViewToggle: {
      type: Boolean,
      default: true
    }
  },
  
  emits: [
    'update:search',
    'update:selectedRepository', 
    'update:viewMode',
    'refresh'
  ],
  
  setup(props) {
    const filteredApps = computed(() => {
      let filtered = [...props.apps];
      
      // Apply search filter
      if (props.searchValue) {
        const searchLower = props.searchValue.toLowerCase();
        filtered = filtered.filter(app => 
          app.name.toLowerCase().includes(searchLower) ||
          app.description?.toLowerCase().includes(searchLower) ||
          app.slug_name.toLowerCase().includes(searchLower)
        );
      }
      
      return filtered;
    });
    
    return {
      filteredApps
    };
  }
});
</script>

<style scoped>
.app-resource-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.resource-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  background: var(--nav-bg);
  flex-shrink: 0;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-text {
  font-size: 20px;
  font-weight: 400;
  color: var(--body-text);
  margin: 0;
}

.loading-text {
  color: var(--muted);
  font-size: 14px;
}

.error-text {
  color: var(--error);
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.view-toggle .btn {
  border: none;
  border-radius: 0;
  margin: 0;
}

.view-toggle .btn:first-child {
  border-right: 1px solid var(--border);
}

.view-toggle .btn.role-primary {
  background: var(--primary);
  color: var(--primary-text);
}

.view-toggle .btn.role-secondary {
  background: var(--input-bg);
  color: var(--body-text);
}

.search-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--body-bg);
  flex-shrink: 0;
}

.search-box {
  position: relative;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 40px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  font-size: 14px;
  line-height: 1.4;
}

.search-box .icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
  font-size: 14px;
}

.filters .form-control {
  min-width: 200px;
}

/* Custom view toggle icons */
.view-icon-grid:before {
  content: "⊞";
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.view-icon-list:before {
  content: "☰";
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.icon.view-icon-grid,
.icon.view-icon-list {
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  min-height: 16px;
}
</style>