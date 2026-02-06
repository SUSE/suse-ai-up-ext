<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Bulk Upload MCP Servers</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <div class="upload-section">
          <p>Upload multiple MCP server configurations in JSON format. Each server should follow the MCPServer schema.</p>

          <div class="upload-options">
            <div class="option-tabs">
              <button
                :class="['tab-button', { active: uploadMode === 'textarea' }]"
                @click="uploadMode = 'textarea'"
              >
                Text Input
              </button>
              <button
                :class="['tab-button', { active: uploadMode === 'file' }]"
                @click="uploadMode = 'file'"
              >
                File Upload
              </button>
            </div>

            <div v-if="uploadMode === 'textarea'" class="textarea-upload">
              <label for="bulk-json">Paste JSON array of MCP server configurations:</label>
              <textarea
                id="bulk-json"
                v-model="jsonInput"
                class="json-textarea"
                placeholder='[
  {
    "id": "my-server-1",
    "name": "My Server 1",
    "description": "Description of server 1",
    "version": "1.0.0",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "my-mcp-package",
        "transport": {"type": "stdio"}
      }
    ],
    "validation_status": "new",
    "_meta": {"source": "custom"}
  }
]'
                rows="15"
              ></textarea>
            </div>

            <div v-if="uploadMode === 'file'" class="file-upload">
              <label for="bulk-file">Select JSON file:</label>
              <input
                id="bulk-file"
                type="file"
                accept=".json"
                @change="handleFileSelect"
                class="file-input"
              />
              <p class="file-info">{{ selectedFileName || 'No file selected' }}</p>
            </div>
          </div>

          <div v-if="parsedServers.length > 0" class="preview-section">
            <h4>Preview ({{ parsedServers.length }} servers)</h4>
            <div class="servers-preview">
              <div v-for="(server, index) in parsedServers.slice(0, 5)" :key="index" class="server-preview-item">
                <strong>{{ server.name }}</strong> ({{ server.id }})
                <span class="server-status">{{ server.validation_status }}</span>
              </div>
              <div v-if="parsedServers.length > 5" class="more-items">
                ... and {{ parsedServers.length - 5 }} more servers
              </div>
            </div>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div class="upload-actions">
            <button
              type="button"
              class="btn btn-secondary"
              @click="$emit('close')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="uploadServers"
              :disabled="!canUpload || uploading"
            >
              {{ uploading ? 'Uploading...' : `Upload ${parsedServers.length} Servers` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
// import { MCPService } from '../../services/mcp-service';
import type { MCPServer } from '../../services/registry-api';

export default defineComponent({
  name: 'BulkUploadModal',

  props: {
    show: {
      type: Boolean,
      required: true
    }
  },

  emits: ['close', 'uploaded'],

  setup(props, { emit }) {
    const uploadMode = ref<'textarea' | 'file'>('textarea');
    const jsonInput = ref('');
    const selectedFile = ref<File | null>(null);
    const selectedFileName = ref('');
    const parsedServers = ref<MCPServer[]>([]);
    const error = ref('');
    const uploading = ref(false);

    const canUpload = computed(() => {
      return parsedServers.value.length > 0 && !error.value;
    });

    const parseJsonInput = () => {
      try {
        if (!jsonInput.value.trim()) {
          parsedServers.value = [];
          error.value = '';
          return;
        }

        const data = JSON.parse(jsonInput.value);
        if (!Array.isArray(data)) {
          throw new Error('Input must be a JSON array');
        }

        // Basic validation
        const validatedServers = data.map((server: any, index: number) => {
          if (!server.id || !server.name) {
            throw new Error(`Server at index ${index} missing required fields (id, name)`);
          }
          return server as MCPServer;
        });

        parsedServers.value = validatedServers;
        error.value = '';
      } catch (err: any) {
        parsedServers.value = [];
        error.value = `Invalid JSON: ${err.message}`;
      }
    };

    const handleFileSelect = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        selectedFile.value = file;
        selectedFileName.value = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
          jsonInput.value = e.target?.result as string;
          parseJsonInput();
        };
        reader.readAsText(file);
      }
    };

    const uploadServers = async () => {
      if (!canUpload.value) return;

      uploading.value = true;
      error.value = '';

      try {
        // const result = await MCPService.bulkUploadToRegistry(parsedServers.value);
        const result = parsedServers.value;
        console.log('Bulk upload completed:', result);

        emit('uploaded', result);
        emit('close');

        // Reset form
        jsonInput.value = '';
        selectedFile.value = null;
        selectedFileName.value = '';
        parsedServers.value = [];
      } catch (err: any) {
        console.error('Bulk upload failed:', err);
        error.value = `Upload failed: ${err.message}`;
      } finally {
        uploading.value = false;
      }
    };

    // Watch for changes in textarea input
    watch(jsonInput, parseJsonInput);

    return {
      uploadMode,
      jsonInput,
      selectedFileName,
      parsedServers,
      error,
      uploading,
      canUpload,
      handleFileSelect,
      uploadServers
    };
  }
});
</script>

<style scoped>
/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--body-bg, white);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 800px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border, #e0e0e0);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upload-section p {
  margin: 0 0 16px 0;
  color: var(--body-text);
}

.upload-options {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg);
}

.option-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.tab-button {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: var(--body-bg);
  color: var(--body-text);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  background: var(--accent-bg);
}

.tab-button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.textarea-upload,
.file-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.textarea-upload label,
.file-upload label {
  font-weight: 600;
  color: var(--body-text);
}

.json-textarea {
  width: 100%;
  min-height: 300px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
}

.file-input {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.file-info {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 0 0;
}

.preview-section {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg);
}

.preview-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--body-text);
}

.servers-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.server-preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--body-bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
}

.server-status {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--accent-bg);
  border-radius: 3px;
  text-transform: uppercase;
}

.more-items {
  text-align: center;
  color: var(--muted);
  font-style: italic;
  padding: 8px;
}

.error-message {
  color: var(--error, #dc2626);
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 4px;
  padding: 12px;
  margin: 16px 0;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--body-bg);
  border-color: var(--border);
  color: var(--body-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--accent-bg);
}

.btn-primary {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>