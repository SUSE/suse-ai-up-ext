<template>
  <div class="settings-page">
    <div class="fixed-header">
      <h1>SUSE AI Proxy Settings</h1>
      <p class="page-description">Configure the SUSE AI Universal Proxy</p>
    </div>

     <div class="tabs-container">
       <div class="tab-nav">
         <button class="tab-button active">
           Universal Proxy
         </button>
       </div>

       <div class="tab-content">
         <div class="tab-pane">
           <UniversalProxyTab />
         </div>
       </div>
     </div>
   </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import UniversalProxyTab from '../components/settings/UniversalProxyTab.vue'

export default defineComponent({
  name: 'Settings',
  components: {
    UniversalProxyTab
  },
  setup() {
    return {}
  }
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.fixed-header {
  position: sticky;
  top: 0;
  background: var(--body-bg, #fff);
  z-index: 10;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border, #dee2e6);
  margin-bottom: 24px;
}

.fixed-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text, #333);
}

.page-description {
  margin: 0;
  color: var(--text-muted, #666);
  font-size: 14px;
}

.tabs-container {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #dee2e6);
  border-radius: 8px;
  overflow: hidden;
}

.tab-nav {
  display: flex;
  background: var(--nav-bg, #f8f9fa);
  border-bottom: 1px solid var(--border, #dee2e6);
}

.tab-button {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: var(--primary, #007bff);
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid var(--primary, #007bff);
  cursor: default;
}

.tab-content {
  padding: 24px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .fixed-header h1 {
    font-size: 20px;
  }
}
</style>