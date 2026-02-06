<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Adapter Created Successfully</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="success-message">
          <i class="icon icon-check-circle" aria-hidden="true"></i>
          <h4>Adapter "{{ adapterName }}" has been created!</h4>
        </div>

        <div v-if="creationResponse" class="connection-details">
          <div class="detail-section">
            <h5>MCP Endpoint</h5>
            <div class="endpoint-info">
              <code>{{ creationResponse.mcp_endpoint }}</code>
              <button
                class="btn btn-sm btn-secondary copy-btn"
                @click="copyToClipboard(creationResponse.mcp_endpoint)"
                :title="'Copy endpoint URL'"
              >
                <i class="icon icon-copy" aria-hidden="true"></i>
                Copy
              </button>
            </div>
          </div>

          <div v-if="creationResponse.token_info" class="detail-section">
            <h5>Authentication Token</h5>
            <div class="token-info">
              <div class="token-details">
                <span><strong>Type:</strong> {{ creationResponse.token_info.tokenType }}</span>
                <span><strong>Expires:</strong> {{ formatDate(creationResponse.token_info.expiresAt) }}</span>
              </div>
              <div class="token-value">
                <code>{{ creationResponse.token_info.token }}</code>
                <button
                  class="btn btn-sm btn-secondary copy-btn"
                  @click="copyToClipboard(creationResponse.token_info.token)"
                  :title="'Copy token'"
                >
                  <i class="icon icon-copy" aria-hidden="true"></i>
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div v-if="creationResponse.message" class="detail-section">
            <h5>Message</h5>
            <p>{{ creationResponse.message }}</p>
          </div>

          <div v-if="creationResponse.note" class="detail-section">
            <h5>Note</h5>
            <p class="note">{{ creationResponse.note }}</p>
          </div>
        </div>

        <div class="instructions">
          <h5>Next Steps</h5>
          <ol>
            <li>Use the MCP endpoint URL above to connect your MCP client</li>
            <li v-if="creationResponse?.token_info">Include the authentication token in your requests</li>
            <li>Check the adapter status in the MCP Gateway dashboard</li>
            <li>Test the connection using the adapter's test functionality</li>
          </ol>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Close</button>
        <button class="btn btn-primary" @click="goToGateway">
          Go to MCP Gateway
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// Props
interface Props {
  creationResponse?: {
    adapter: any;
    mcp_endpoint: string;
    message: string;
    note?: string;
    token_info?: {
      expiresAt: string;
      token: string;
      tokenType: string;
    };
  };
  adapterName?: string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const isVisible = ref(false);

// Methods
const openModal = () => {
  isVisible.value = true;
};

const closeModal = () => {
  isVisible.value = false;
  emit('close');
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // Could show a toast notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
};

const goToGateway = () => {
  router.push('/c/local/mcp-gateway');
  closeModal();
};

// Expose methods to parent component
defineExpose({
  openModal,
  closeModal
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--body-bg, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.modal-body {
  padding: 20px 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.success-message {
  text-align: center;
  padding: 20px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 8px;
  margin-bottom: 24px;
}

.success-message i {
  color: var(--success, #16a34a);
  font-size: 24px;
  margin-bottom: 8px;
}

.success-message h4 {
  margin: 0;
  color: var(--success, #16a34a);
  font-size: 18px;
  font-weight: 600;
}

.connection-details {
  margin-bottom: 24px;
}

.detail-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--accent-bg, #f9fafb);
  border-radius: 6px;
  border: 1px solid var(--border, #e5e7eb);
}

.detail-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text, #111827);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.endpoint-info, .token-value {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.endpoint-info code, .token-value code {
  flex: 1;
  padding: 8px 12px;
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  word-break: break-all;
}

.token-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 14px;
}

.token-details span {
  color: var(--body-text, #374151);
}

.note {
  color: var(--warning, #d97706);
  font-style: italic;
}

.instructions {
  background: var(--info-bg, #eff6ff);
  border: 1px solid var(--info-border, #bfdbfe);
  border-radius: 6px;
  padding: 16px;
}

.instructions h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text, #111827);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.instructions ol {
  margin: 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  color: var(--body-text, #374151);
  line-height: 1.5;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.btn-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.copy-btn {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>