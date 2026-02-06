  <template>
    <!-- Service not enabled message -->
    <div v-if="!proxyInstalled" class="blank-page">
      <div class="empty-state">
        <h3>This service is not enabled</h3>
        <p>Please enable it from the service selection page.</p>
      </div>
    </div>

    <!-- Under Development message (when service is enabled) -->
    <div v-else class="under-development-page">
      <div class="development-message">
        <div class="message-content">
          <h1>🚧 Under Development</h1>
          <p>The Virtual MCP feature is currently under development and will be available in a future release.</p>
          <p>Please check back later for updates on this exciting feature!</p>
        </div>
      </div>
    </div>
  </template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
</script>

<style scoped>
/* Service not enabled state */
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.empty-state h3 {
  color: var(--body-text, #1a1a1a);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--muted, #666);
  font-size: 16px;
  margin: 0;
}

.under-development-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.development-message {
  text-align: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 40px;
  max-width: 600px;
  width: 100%;
}

.message-content h1 {
  color: #3d98d3;
  font-size: 2.5rem;
  margin-bottom: 20px;
  font-weight: 300;
}

.message-content p {
  color: #6c757d;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 15px;
}

.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .under-development-page {
    padding: 10px;
  }

  .development-message {
    padding: 30px 20px;
  }

  .message-content h1 {
    font-size: 2rem;
  }

  .message-content p {
    font-size: 1rem;
  }
}
</style>