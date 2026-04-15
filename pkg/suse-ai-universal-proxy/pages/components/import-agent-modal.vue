<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Import Agent</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="agentFile">Select YAML file:</label>
          <input type="file" id="agentFile" accept=".yaml,.yml" @change="handleFileChange" class="form-control" />
        </div>
        <div v-if="preview" class="preview-section">
          <h4>Preview:</h4>
          <pre>{{ preview }}</pre>
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn btn-primary" @click="importAgent" :disabled="!file || !!error">Import</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import yaml from 'js-yaml';
import SmartAgentsService from '../../services/smart-agents-service';

const isVisible = ref(false);
const file = ref<File | null>(null);
const preview = ref<string>('');
const error = ref<string>('');

const openModal = () => {
  isVisible.value = true;
  reset();
};

const closeModal = () => {
  isVisible.value = false;
  reset();
};

const reset = () => {
  file.value = null;
  preview.value = '';
  error.value = '';
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const selectedFile = target.files?.[0];
  if (selectedFile) {
    file.value = selectedFile;
    readFile(selectedFile);
  }
};

const readFile = (selectedFile: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    try {
      const parsed = yaml.load(content);
      preview.value = JSON.stringify(parsed, null, 2);
      error.value = '';
    } catch (err) {
      error.value = 'Invalid YAML file';
      preview.value = '';
    }
  };
  reader.readAsText(selectedFile);
};

const importAgent = async () => {
  if (!file.value || !preview.value) return;

  try {
    const agentData = JSON.parse(preview.value);
    const agentToImport = Array.isArray(agentData) ? agentData[0] : agentData;

    // Transform imported data to match complete CreateAgentRequest format
    const createRequest = {
      name: agentToImport.name,
      task_description: agentToImport.description || agentToImport.task_description,
      max_rounds: Number(agentToImport.max_rounds) || 3,
      messages: agentToImport.messages || [],
      generation_config: agentToImport.generation_config || agentToImport.config ? {
        temperature: Number((agentToImport.generation_config || agentToImport.config).temperature) || 0.7,
        top_p: Number((agentToImport.generation_config || agentToImport.config).top_p) || 1.0,
        top_k: Number((agentToImport.generation_config || agentToImport.config).top_k) || 50,
        max_new_tokens: Number((agentToImport.generation_config || agentToImport.config).max_new_tokens) || 1000,
        stop_sequences: (agentToImport.generation_config || agentToImport.config).stop_sequences || [],
        presence_penalty: Number((agentToImport.generation_config || agentToImport.config).presence_penalty) || 0.0,
        frequency_penalty: Number((agentToImport.generation_config || agentToImport.config).frequency_penalty) || 0.0,
        repetition_penalty: Number((agentToImport.generation_config || agentToImport.config).repetition_penalty) || 1.0,
        seed: Number((agentToImport.generation_config || agentToImport.config).seed) || 0
      } : {
        temperature: 0.7,
        top_p: 1.0,
        top_k: 50,
        max_new_tokens: 1000,
        stop_sequences: [],
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
        repetition_penalty: 1.0,
        seed: 0
      },
      response_format: agentToImport.response_format || { type: 'text' },
      stream: agentToImport.stream || false,
      tools: agentToImport.tools || agentToImport.mcp_tools || [],
      tool_choice: agentToImport.tool_choice || 'auto',
      user: agentToImport.user || '',
      supervisor: {
        provider: agentToImport.supervisor?.provider || agentToImport.supervisor?.type || 'openai',
        api: agentToImport.supervisor?.api || '',
        model: agentToImport.supervisor?.model || '',
        system_prompt: agentToImport.supervisor?.system_prompt || 'Default supervisor system prompt',
        developer_prompt: agentToImport.supervisor?.developer_prompt || 'Default supervisor developer prompt',
        url: agentToImport.supervisor?.url || ''
      },
      worker: {
        provider: agentToImport.worker?.provider || agentToImport.worker?.type || 'ollama',
        api: agentToImport.worker?.api || '',
        model: agentToImport.worker?.model || '',
        system_prompt: agentToImport.worker?.system_prompt || 'Default worker system prompt',
        developer_prompt: agentToImport.worker?.developer_prompt || 'Default worker developer prompt',
        context: agentToImport.worker?.context || agentToImport.context || [],
        url: agentToImport.worker?.url || ''
      },
      mcp_integration: agentToImport.mcp_integration || false,
      mcp_tools: agentToImport.mcp_tools || agentToImport.tools || [],
      cost_balance: Number(agentToImport.cost_balance) || 5,
      user_roles: agentToImport.user_roles || {}
    };

    await SmartAgentsService.createAgent(createRequest);

    closeModal();
    // Emit event to refresh agents in parent
    emit('agent-imported');
  } catch (err) {
    error.value = 'Import failed: ' + (err as Error).message;
  }
};

const emit = defineEmits<{
  'agent-imported': [];
}>();

defineExpose({
  openModal,
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 90%;
  max-height: 80%;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.preview-section {
  margin-top: 20px;
}

.preview-section pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.error-message {
  color: #dc3545;
  margin-top: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #3d98d3;
  color: white;
}

.btn-primary:hover {
  background: #2c7da0;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>