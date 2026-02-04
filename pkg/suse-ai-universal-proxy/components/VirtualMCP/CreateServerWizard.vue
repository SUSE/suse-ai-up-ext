<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content wizard-modal" @click.stop>
      <div class="modal-header">
        <h3>Create Virtual MCP Server</h3>
        <button @click="$emit('close')">&times;</button>
      </div>

      <div class="wizard-progress">
        <div class="progress-steps">
          <div
            v-for="(step, index) in wizardSteps"
            :key="step.id"
            :class="['step', { active: currentStep === index, completed: currentStep > index }]"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>
      </div>

      <div class="modal-body">
        <!-- Step 1: Choose Transformation Type -->
        <div v-if="currentStep === 0" class="wizard-step">
          <h4>Choose Transformation Type</h4>
          <p>Select the type of data source you want to transform into an MCP server:</p>

          <div class="transformation-types">
            <div
              v-for="type in transformationTypes"
              :key="type.id"
              :class="['type-card', { selected: form.type === type.id }]"
              @click="selectTransformationType(type.id)"
            >
              <div class="type-icon">
                <i :class="type.icon"></i>
              </div>
              <div class="type-content">
                <h5>{{ type.name }}</h5>
                <p>{{ type.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: Configure Source -->
        <div v-if="currentStep === 1" class="wizard-step">
          <h4>Configure {{ getCurrentTypeName() }} Source</h4>

          <div class="form-group">
            <label for="server-name">Server Name *</label>
            <input
              id="server-name"
              v-model="form.name"
              type="text"
              class="form-control"
              placeholder="Enter server name"
              required
            />
          </div>

          <div class="form-group">
            <label for="server-description">Description</label>
            <textarea
              id="server-description"
              v-model="form.description"
              class="form-control"
              placeholder="Describe what this server does"
              rows="3"
            ></textarea>
          </div>

          <!-- OpenAPI Configuration -->
          <template v-if="form.type === 'openapi'">
            <div class="form-group">
              <label>Source Type</label>
              <div class="source-type-selector">
                <button
                  :class="['source-type-btn', { active: form.sourceType === 'url' }]"
                  @click="form.sourceType = 'url'"
                  type="button"
                >
                  URL
                </button>
                <button
                  :class="['source-type-btn', { active: form.sourceType === 'file' }]"
                  @click="form.sourceType = 'file'"
                  type="button"
                >
                  File Upload
                </button>
              </div>
            </div>

            <div v-if="form.sourceType === 'url'" class="form-group">
              <label for="openapi-url">OpenAPI Specification URL *</label>
              <input
                id="openapi-url"
                v-model="form.source"
                type="url"
                class="form-control"
                placeholder="https://api.example.com/swagger.json"
                required
              />
            </div>

            <div v-else class="form-group">
              <label for="openapi-file">OpenAPI Specification File *</label>
              <input
                id="openapi-file"
                type="file"
                class="form-control"
                accept=".json,.yaml,.yml"
                @change="handleFileUpload"
                required
              />
              <small class="form-help">Upload a JSON or YAML OpenAPI specification file</small>
              <div v-if="uploadedFile" class="file-info">
                <strong>Selected file:</strong> {{ uploadedFile.name }} ({{ formatFileSize(uploadedFile.size) }})
              </div>
            </div>
          </template>

          <!-- GraphQL Configuration -->
          <template v-if="form.type === 'graphql'">
            <div class="form-group">
              <label for="graphql-url">GraphQL Schema URL *</label>
              <input
                id="graphql-url"
                v-model="form.source"
                type="url"
                class="form-control"
                placeholder="https://api.example.com/graphql"
                required
              />
            </div>
          </template>

          <!-- Database Configuration -->
          <template v-if="form.type === 'database'">
            <div class="form-group">
              <label for="db-connection">Database Connection String *</label>
              <input
                id="db-connection"
                v-model="form.source"
                type="text"
                class="form-control"
                placeholder="postgresql://user:pass@host:port/database"
                required
              />
            </div>
          </template>

          <!-- Combine Configuration -->
          <template v-if="form.type === 'combine'">
            <div class="form-group">
              <label>Select Servers to Combine *</label>
              <div class="server-selection">
                <div
                  v-for="server in availableServers"
                  :key="server.id"
                  :class="['server-option', { selected: form.sources?.includes(server.id!) }]"
                  @click="toggleServerSelection(server.id!)"
                >
                  <input
                    type="checkbox"
                    :checked="form.sources?.includes(server.id!)"
                    readonly
                  />
                  <div class="server-info">
                    <strong>{{ server.name }}</strong>
                    <small>{{ server.description }}</small>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Step 2: Transform Source -->
        <div v-if="currentStep === 2" class="wizard-step">
          <h4>Transform {{ getCurrentTypeName() }} Source</h4>

          <div v-if="!transformedMCPSpec && !isTransforming" class="transform-section">
            <p>Ready to transform your {{ getCurrentTypeName().toLowerCase() }} source into an MCP server specification.</p>
            <p>This will analyze your source and generate the appropriate MCP tools, resources, and prompts.</p>
          </div>

          <div v-else-if="isTransforming" class="transforming-section">
            <div class="transforming-indicator">
              <div class="spinner"></div>
              <h5>Transforming Source...</h5>
              <p>Analyzing your {{ getCurrentTypeName().toLowerCase() }} source and generating MCP specification.</p>
            </div>
          </div>

          <div v-else-if="transformError" class="error-section">
            <div class="error-message">
              <h5>Transformation Failed</h5>
              <p>{{ transformError }}</p>
              <button @click="retryTransform" class="btn btn-secondary">Retry</button>
            </div>
          </div>

          <div v-else-if="transformedMCPSpec" class="spec-preview-section">
            <h5>MCP Specification Generated</h5>
            <p>Review and edit the generated MCP specification below:</p>

            <div class="spec-editor">
              <div class="spec-field">
                <label>Server Name:</label>
                <input
                  v-model="transformedMCPSpec.name"
                  type="text"
                  class="form-control"
                  placeholder="MCP Server Name"
                />
              </div>

              <div class="spec-field">
                <label>Server Description:</label>
                <textarea
                  v-model="transformedMCPSpec.description"
                  class="form-control"
                  rows="3"
                  placeholder="Server description"
                ></textarea>
              </div>

              <!-- Tools Section -->
              <div class="spec-section">
                <h6>Tools ({{ transformedMCPSpec.tools?.length || 0 }})</h6>
                <div v-if="transformedMCPSpec.tools?.length" class="tools-list">
                  <div
                    v-for="(tool, index) in transformedMCPSpec.tools"
                    :key="index"
                    class="tool-item"
                  >
                    <div class="tool-header">
                      <strong>{{ tool.name }}</strong>
                      <span class="tool-title">{{ tool.title || 'No title' }}</span>
                    </div>
                    <div class="tool-fields">
                      <div class="field-group">
                        <label>Description:</label>
                        <textarea
                          v-model="tool.description"
                          class="form-control"
                          rows="2"
                          placeholder="Tool description"
                        ></textarea>
                      </div>
                      <div class="field-group">
                        <label>Title:</label>
                        <input
                          v-model="tool.title"
                          type="text"
                          class="form-control"
                          placeholder="Tool title"
                        />
                      </div>
                      <details class="tool-details">
                        <summary>Input Schema (JSON)</summary>
                        <pre class="schema-json">{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
                      </details>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-section">
                  <p>No tools generated from this source.</p>
                </div>
              </div>

              <!-- Resources Section -->
              <div class="spec-section">
                <h6>Resources ({{ transformedMCPSpec.resources?.length || 0 }})</h6>
                <div v-if="transformedMCPSpec.resources?.length" class="resources-list">
                  <div
                    v-for="(resource, index) in transformedMCPSpec.resources"
                    :key="index"
                    class="resource-item"
                  >
                    <div class="resource-header">
                      <strong>{{ resource.name }}</strong>
                      <code>{{ resource.uri }}</code>
                    </div>
                    <div class="resource-fields">
                      <div class="field-group">
                        <label>Description:</label>
                        <textarea
                          v-model="resource.description"
                          class="form-control"
                          rows="2"
                          placeholder="Resource description"
                        ></textarea>
                      </div>
                      <div class="field-group">
                        <label>MIME Type:</label>
                        <input
                          v-model="resource.mimeType"
                          type="text"
                          class="form-control"
                          placeholder="text/plain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-section">
                  <p>No resources generated from this source.</p>
                </div>
              </div>

              <!-- Prompts Section -->
              <div class="spec-section">
                <h6>Prompts ({{ transformedMCPSpec.prompts?.length || 0 }})</h6>
                <div v-if="transformedMCPSpec.prompts?.length" class="prompts-list">
                  <div
                    v-for="(prompt, index) in transformedMCPSpec.prompts"
                    :key="index"
                    class="prompt-item"
                  >
                    <div class="prompt-header">
                      <strong>{{ prompt.name }}</strong>
                    </div>
                    <div class="prompt-fields">
                      <div class="field-group">
                        <label>Description:</label>
                        <textarea
                          v-model="prompt.description"
                          class="form-control"
                          rows="2"
                          placeholder="Prompt description"
                        ></textarea>
                      </div>
                      <div v-if="prompt.arguments?.length" class="arguments-section">
                        <label>Arguments:</label>
                        <div class="arguments-list">
                          <div
                            v-for="(arg, argIndex) in prompt.arguments"
                            :key="argIndex"
                            class="argument-item"
                          >
                            <input
                              v-model="arg.name"
                              type="text"
                              class="form-control"
                              placeholder="Argument name"
                            />
                            <textarea
                              v-model="arg.description"
                              class="form-control"
                              rows="2"
                              placeholder="Argument description"
                            ></textarea>
                            <label>
                              <input
                                v-model="arg.required"
                                type="checkbox"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-section">
                  <p>No prompts generated from this source.</p>
                </div>
              </div>

              <details class="spec-details">
                <summary>View Full Specification (JSON)</summary>
                <pre class="spec-json">{{ JSON.stringify(transformedMCPSpec, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>

        <!-- Step 3: Authentication & Overrides -->
        <div v-if="currentStep === 3" class="wizard-step">
          <h4>Authentication & Advanced Settings</h4>

          <div class="form-group">
            <label>Authentication Type</label>
            <select v-model="form.auth.type" class="form-control">
              <option value="transparent">Transparent (No Auth)</option>
              <option value="oauth_github">GitHub OAuth</option>
            </select>
          </div>

          <div v-if="form.auth.type === 'oauth_github'" class="form-group">
            <label>GitHub OAuth Configuration</label>
            <textarea
              v-model="form.auth.config"
              class="form-control"
              placeholder='{"client_id": "your-client-id", "client_secret": "your-client-secret"}'
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Custom Overrides (JSON)</label>
            <textarea
              v-model="overridesText"
              class="form-control"
              placeholder='{"custom_settings": "value"}'
              rows="4"
              @input="parseOverrides"
            ></textarea>
            <small class="form-help">Optional JSON configuration to customize the MCP server generation</small>
          </div>
        </div>

        <!-- Step 4: Review & Create -->
        <div v-if="currentStep === 4" class="wizard-step">
          <h4>Review & Create</h4>

          <div class="review-section">
            <h5>Configuration Summary</h5>
            <dl class="review-list">
              <dt>Type:</dt>
              <dd>{{ getCurrentTypeName() }}</dd>

              <dt>Name:</dt>
              <dd>{{ form.name }}</dd>

              <dt>Description:</dt>
              <dd>{{ form.description || 'No description' }}</dd>

              <template v-if="form.type !== 'combine'">
                <dt>Source:</dt>
                <dd>{{ form.source }}</dd>
              </template>

              <template v-else>
                <dt>Servers to Combine:</dt>
                <dd>{{ form.sources?.length || 0 }} servers selected</dd>
              </template>

              <dt>Authentication:</dt>
              <dd>{{ form.auth.type === 'transparent' ? 'None' : 'GitHub OAuth' }}</dd>
            </dl>
          </div>

          <div v-if="creating" class="creating-notice">
            <div class="spinner"></div>
            <p>Creating Virtual MCP server...</p>
          </div>
        </div>
      </div>

      <div class="modal-footer wizard-footer">
        <button
          class="btn btn-secondary"
          @click="previousStep"
          :disabled="currentStep === 0"
        >
          Previous
        </button>

        <div class="wizard-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>

          <button
            v-if="currentStep < wizardSteps.length - 1"
            class="btn btn-primary"
            @click="nextStep"
            :disabled="!canProceed"
          >
            Next
          </button>

          <button
            v-else
            class="btn btn-success"
            @click="createServer"
            :disabled="creating || !canProceed"
          >
            <i v-if="creating" class="icon icon-spinner icon-spin"></i>
            Create Server
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CreateServerForm, MCPServer, TransformationType } from '../../types/virtual-mcp-types';

interface Props {
  show: boolean;
  availableServers: MCPServer[];
  creating?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  transform: [data: CreateServerForm];
  create: [form: CreateServerForm];
}>();

const currentStep = ref(0);
const form = ref<CreateServerForm>({
  type: 'openapi',
  name: '',
  description: '',
  source: '',
  sourceType: 'url',
  sources: [],
  auth: { type: 'transparent' },
  overrides: {}
});

const overridesText = ref('');
const uploadedFile = ref<File | null>(null);

// Transformation state
const isTransforming = ref(false);
const transformedMCPSpec = ref<any>(null);
const transformError = ref<string | null>(null);

const transformationTypes = [
  {
    id: 'openapi' as TransformationType,
    name: 'OpenAPI/Swagger',
    description: 'Transform REST API specifications into MCP servers',
    icon: 'icon icon-globe'
  },
  {
    id: 'graphql' as TransformationType,
    name: 'GraphQL Schema',
    description: 'Convert GraphQL schemas into MCP servers',
    icon: 'icon icon-share'
  },
  {
    id: 'database' as TransformationType,
    name: 'Database Schema',
    description: 'Generate MCP servers from database schemas',
    icon: 'icon icon-database'
  },
  {
    id: 'combine' as TransformationType,
    name: 'Combine Servers',
    description: 'Merge multiple MCP servers into one unified server',
    icon: 'icon icon-merge'
  }
];

const wizardSteps = [
  { id: 'type', label: 'Type' },
  { id: 'source', label: 'Source' },
  { id: 'transform', label: 'Transform' },
  { id: 'config', label: 'Config' },
  { id: 'review', label: 'Review' }
];

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return !!form.value.type;
    case 1:
      if (!form.value.name) return false;
      if (form.value.type === 'combine') {
        return form.value.sources && form.value.sources.length > 0;
      }
      // For OpenAPI, check if URL is provided or file is uploaded
      if (form.value.type === 'openapi') {
        if (form.value.sourceType === 'url') {
          return !!form.value.source;
        } else if (form.value.sourceType === 'file') {
          return !!uploadedFile.value;
        }
      }
      // For other types, check if source is provided
      return !!form.value.source;
    case 2:
      return !!transformedMCPSpec.value; // Must have transformed spec
    case 3:
      return true; // Auth and overrides are optional
    case 4:
      return !!transformedMCPSpec.value; // Must have spec to create
    default:
      return false;
  }
});

// Watch for form changes to update overrides
watch(() => overridesText.value, (newText) => {
  try {
    form.value.overrides = newText ? JSON.parse(newText) : {};
  } catch (err) {
    // Invalid JSON, keep current overrides
  }
});

const selectTransformationType = (type: TransformationType) => {
  form.value.type = type;
  // Reset form fields when type changes
  form.value.source = '';
  form.value.sources = [];
};

const toggleServerSelection = (serverId: string) => {
  if (!form.value.sources) form.value.sources = [];
  const index = form.value.sources.indexOf(serverId);
  if (index > -1) {
    form.value.sources.splice(index, 1);
  } else {
    form.value.sources.push(serverId);
  }
};

const getCurrentTypeName = () => {
  const type = transformationTypes.find(t => t.id === form.value.type);
  return type?.name || 'Unknown';
};

const parseOverrides = () => {
  try {
    form.value.overrides = overridesText.value ? JSON.parse(overridesText.value) : {};
  } catch (err) {
    // Invalid JSON, show error but don't prevent proceeding
    console.warn('Invalid JSON in overrides:', err);
  }
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploadedFile.value = file;
    // For file uploads, we'll need to read the file content
    // This will be handled when creating the server
  } else {
    uploadedFile.value = null;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const nextStep = async () => {
  if (currentStep.value < wizardSteps.length - 1 && canProceed.value) {
    // If moving from source step (1) to transform step (2), perform transformation
    if (currentStep.value === 1) {
      await performTransformation();
    } else {
      currentStep.value++;
    }
  }
};

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const createServer = async () => {
  if (canProceed.value) {
    let serverData = { ...form.value };

    // Handle file upload for OpenAPI
    if (form.value.type === 'openapi' && form.value.sourceType === 'file' && uploadedFile.value) {
      try {
        const fileContent = await readFileAsText(uploadedFile.value);
        serverData.source = fileContent;
        serverData.sourceType = 'file';
      } catch (error) {
        console.error('Failed to read uploaded file:', error);
        // Could emit an error here, but for now just proceed
      }
    }

    emit('create', serverData);
  }
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const performTransformation = async () => {
  isTransforming.value = true;
  transformError.value = null;

  try {
    // Prepare the transformation request data
    let transformData = { ...form.value };

    // Handle file upload for OpenAPI
    if (form.value.type === 'openapi' && form.value.sourceType === 'file' && uploadedFile.value) {
      const fileContent = await readFileAsText(uploadedFile.value);
      transformData.source = fileContent;
    }

    // Emit the transformation request
    // The parent component will handle the actual API call
    emit('transform', transformData);

    // For now, simulate transformation completion
    // In a real implementation, this would wait for the API response
    setTimeout(() => {
      isTransforming.value = false;
      // Mock transformed spec - in real implementation this comes from API
      transformedMCPSpec.value = {
        name: form.value.name,
        description: form.value.description || `MCP server from ${form.value.type} source`,
        tools: [
          { name: 'example_tool', description: 'Example tool generated from source' }
        ],
        resources: [],
        prompts: []
      };
      currentStep.value = 2; // Move to transform step
    }, 2000);

  } catch (error) {
    isTransforming.value = false;
    transformError.value = error instanceof Error ? error.message : 'Transformation failed';
  }
};

const retryTransform = () => {
  performTransformation();
};

// Reset wizard when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    currentStep.value = 0;
    form.value = {
      type: 'openapi',
      name: '',
      description: '',
      source: '',
      sourceType: 'url',
      sources: [],
      auth: { type: 'transparent' },
      overrides: {}
    };
    overridesText.value = '';
    uploadedFile.value = null;
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.wizard-modal {
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  background: white !important;
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

.wizard-progress {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 15px;
  left: 50%;
  right: -50%;
  height: 2px;
  background: #dee2e6;
  z-index: 1;
}

.step.completed:not(:last-child)::after {
  background: #28a745;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #dee2e6;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
}

  .step.active .step-number {
    background: #16a34a;
    color: white;
  }

.step.completed .step-number {
  background: #28a745;
  color: white;
}

.step-label {
  font-size: 12px;
  color: #6c757d;
  text-align: center;
}

  .step.active .step-label {
    color: #16a34a;
  }

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.wizard-step h4 {
  margin: 0 0 16px 0;
  color: #495057;
}

.wizard-step p {
  margin: 0 0 20px 0;
  color: #6c757d;
}

.transformation-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.type-card {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

  .type-card:hover {
    border-color: #16a34a;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.1);
  }

  .type-card.selected {
    border-color: #16a34a;
    background: #f0fdf4;
  }

  .type-icon {
    font-size: 24px;
    color: #16a34a;
    margin-bottom: 12px;
    text-align: center;
  }

.type-content h5 {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 16px;
}

.type-content p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
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
  min-height: 80px;
}

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6c757d;
}

.server-selection {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.server-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fa;
  transition: background 0.2s;
}

.server-option:last-child {
  border-bottom: none;
}

.server-option:hover {
  background: #f8f9fa;
}

.server-option.selected {
  background: #e3f2fd;
}

.server-option input[type="checkbox"] {
  margin: 0;
}

.server-info strong {
  display: block;
  color: #495057;
}

.server-info small {
  color: #6c757d;
}

.source-type-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.source-type-btn {
  padding: 8px 16px;
  border: 1px solid #ced4da;
  background: #f8f9fa;
  color: #495057;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.source-type-btn:hover {
  background: #e9ecef;
}

.source-type-btn.active {
  background: #16a34a;
  color: white;
  border-color: #16a34a;
}

.file-info {
  margin-top: 8px;
  padding: 8px;
  background: #f0f8ff;
  border-radius: 4px;
  font-size: 14px;
  color: #1565c0;
}

.transform-section,
.transforming-section,
.error-section {
  text-align: center;
  padding: 20px;
}

.transforming-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #16a34a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 20px;
  color: #c33;
}

.spec-preview-section {
  max-width: none;
}

.spec-editor {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
}

.spec-field {
  margin-bottom: 16px;
}

.spec-field label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #495057;
}

.spec-summary {
  display: flex;
  gap: 20px;
  margin: 16px 0;
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.summary-item {
  text-align: center;
  flex: 1;
}

.spec-details {
  margin-top: 16px;
}

.spec-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #16a34a;
}

.spec-json {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  margin-top: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.spec-section {
  margin-top: 24px;
  padding: 16px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.spec-section h6 {
  margin: 0 0 12px 0;
  color: #16a34a;
  font-weight: 600;
}

.tools-list,
.resources-list,
.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tool-item,
.resource-item,
.prompt-item {
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #fafafa;
}

.tool-header,
.resource-header,
.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.tool-header strong,
.resource-header strong,
.prompt-header strong {
  color: #16a34a;
  font-size: 16px;
}

.tool-title {
  color: #6c757d;
  font-size: 14px;
}

.resource-header code {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #5f6368;
}

.tool-fields,
.resource-fields,
.prompt-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-group label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.tool-details,
.resource-details {
  margin-top: 12px;
}

.tool-details summary,
.resource-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #16a34a;
  font-size: 14px;
}

.schema-json {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 8px;
  margin-top: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.arguments-section {
  margin-top: 12px;
}

.arguments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.argument-item {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 8px;
  align-items: start;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.argument-item .form-control {
  font-size: 13px;
}

.argument-item label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.empty-section {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.review-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.review-section h5 {
  margin: 0 0 16px 0;
  color: #495057;
}

.review-list {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 8px 16px;
  margin: 0;
}

.review-list dt {
  font-weight: 500;
  color: #6c757d;
}

.review-list dd {
  margin: 0;
  color: #495057;
}

.creating-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #e3f2fd;
  border-radius: 8px;
  color: #1565c0;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #90caf9;
  border-top: 2px solid #1565c0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.wizard-actions {
  display: flex;
  gap: 12px;
}

/* Button styles */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

  .btn-primary {
    background: #16a34a;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #15803d;
  }

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
}

.icon-spin {
  animation: spin 1s linear infinite;
}
</style>