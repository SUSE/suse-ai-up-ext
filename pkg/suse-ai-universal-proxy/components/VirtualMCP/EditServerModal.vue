<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content edit-modal" @click.stop>
      <div class="modal-header">
        <h3>Edit Virtual MCP Server</h3>
        <button @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <!-- Basic Information -->
          <div class="form-section">
            <h4>Basic Information</h4>

            <div class="form-group">
              <label for="edit-server-name">Server Name *</label>
              <input
                id="edit-server-name"
                v-model="form.name"
                type="text"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label for="edit-server-description">Description</label>
              <textarea
                id="edit-server-description"
                v-model="form.description"
                class="form-control"
                rows="3"
              ></textarea>
            </div>
          </div>

          <!-- Tools Section -->
          <div v-if="form.tools && form.tools.length > 0" class="form-section">
            <h4>Tools</h4>
            <div class="tools-editor">
              <div v-for="(tool, index) in form.tools" :key="index" class="tool-editor">
                <div class="tool-editor-header">
                  <h5>Tool {{ index + 1 }}</h5>
                  <button type="button" class="btn btn-sm btn-danger" @click="removeTool(index)">
                    <i class="icon icon-trash"></i> Remove
                  </button>
                </div>

                <div class="form-row">
                  <div class="form-group half">
                    <label :for="'tool-name-' + index">Name *</label>
                    <input
                      :id="'tool-name-' + index"
                      v-model="tool.name"
                      type="text"
                      class="form-control"
                      required
                    />
                  </div>
                  <div class="form-group half">
                    <label :for="'tool-title-' + index">Title</label>
                    <input
                      :id="'tool-title-' + index"
                      v-model="tool.title"
                      type="text"
                      class="form-control"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label :for="'tool-description-' + index">Description</label>
                  <textarea
                    :id="'tool-description-' + index"
                    v-model="tool.description"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label :for="'tool-schema-' + index">Input Schema (JSON)</label>
                  <textarea
                    :id="'tool-schema-' + index"
                    v-model="toolSchemaText[index]"
                    class="form-control"
                    rows="4"
                    placeholder='{"type": "object", "properties": {...}}'
                    @input="updateToolSchema(index, $event)"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label :for="'tool-annotations-' + index">Annotations (JSON)</label>
                  <textarea
                    :id="'tool-annotations-' + index"
                    v-model="toolAnnotationsText[index]"
                    class="form-control"
                    rows="3"
                    placeholder='{"key": "value"}'
                    @input="updateToolAnnotations(index, $event)"
                  ></textarea>
                </div>
              </div>

              <button type="button" class="btn btn-secondary" @click="addTool">
                <i class="icon icon-plus"></i> Add Tool
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="updating">
              <i v-if="updating" class="icon icon-spinner"></i>
              {{ updating ? 'Updating...' : 'Update Server' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { MCPServer, MCPTool } from '../../types/virtual-mcp-types';

interface Props {
  show: boolean;
  server: MCPServer | null;
  updating?: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'update', server: MCPServer): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const form = ref<MCPServer>({
  name: '',
  description: '',
  tools: []
});

const toolSchemaText = ref<string[]>([]);
const toolAnnotationsText = ref<string[]>([]);

// Watch for server changes to populate form
watch(() => props.server, (newServer) => {
  if (newServer) {
    form.value = {
      ...newServer,
      tools: newServer.tools ? [...newServer.tools] : []
    };

    // Initialize text representations for JSON fields
    toolSchemaText.value = [];
    toolAnnotationsText.value = [];

    if (newServer.tools) {
      newServer.tools.forEach((tool, index) => {
        toolSchemaText.value[index] = tool.inputSchema ? JSON.stringify(tool.inputSchema, null, 2) : '';
        toolAnnotationsText.value[index] = tool.annotations ? JSON.stringify(tool.annotations, null, 2) : '';
      });
    }
  }
}, { immediate: true });

const addTool = () => {
  if (!form.value.tools) {
    form.value.tools = [];
  }

  const newTool: MCPTool = {
    name: '',
    title: '',
    description: '',
    inputSchema: {},
    annotations: {}
  };

  form.value.tools.push(newTool);
  toolSchemaText.value.push('');
  toolAnnotationsText.value.push('');
};

const removeTool = (index: number) => {
  if (form.value.tools) {
    form.value.tools.splice(index, 1);
    toolSchemaText.value.splice(index, 1);
    toolAnnotationsText.value.splice(index, 1);
  }
};

const updateToolSchema = (index: number, event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  try {
    const parsed = JSON.parse(target.value);
    if (form.value.tools && form.value.tools[index]) {
      form.value.tools[index].inputSchema = parsed;
    }
  } catch (e) {
    // Invalid JSON, keep the current value
  }
};

const updateToolAnnotations = (index: number, event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  try {
    const parsed = JSON.parse(target.value);
    if (form.value.tools && form.value.tools[index]) {
      form.value.tools[index].annotations = parsed;
    }
  } catch (e) {
    // Invalid JSON, keep the current value
  }
};

const handleSubmit = () => {
  if (props.server && form.value) {
    emit('update', form.value);
  }
};
</script>

<style scoped>
.edit-modal {
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #16a34a;
  font-size: 18px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #495057;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.25);
}

textarea.form-control {
  resize: vertical;
  font-family: monospace;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}

.tools-editor {
  margin-top: 16px;
}

.tool-editor {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.tool-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tool-editor-header h5 {
  margin: 0;
  color: #16a34a;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
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
  background: #16a34a;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #15803d;
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

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

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
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #16a34a;
}

.modal-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.modal-body {
  padding: 20px;
}
</style>