<template>
  <div class="create-agent-modal" v-if="showModal">
    <div class="modal-overlay" @click="closeModal"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Smart Agent</h2>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <form @submit.prevent="submitForm" class="create-agent-form">
          <div class="form-group">
            <label for="agentName">Smart Agent Name <span class="required-asterisk">*</span></label>
            <input
              id="agentName"
              v-model="formData.agentName"
              type="text"
              placeholder="Enter a name for the agent"
              required
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="agentDescription">Smart Agent Description</label>
            <textarea
              id="agentDescription"
              v-model="formData.agentDescription"
              placeholder="Describe what this agent does..."
              rows="3"
              class="form-control"
             ></textarea>
              </div>

               <div class="form-group">
                 <label for="agentContext">Smart Agent Context</label>
                 <textarea
                   id="agentContext"
                   v-model="formData.agentContext"
                   placeholder="Provide context for the agent's behavior and role..."
                   rows="4"
                   class="form-control"
                 ></textarea>
               </div>

               <div class="form-group">
                 <label for="costBalance">Cost Balance</label>
                 <input
                   id="costBalance"
                   v-model="formData.costBalance"
                   type="range"
                   min="0"
                   max="10"
                   step="5"
                   class="slider"
                 />
                 <div class="slider-labels">
                   <span>Min Savings (0)</span>
                   <span>Standard (5)</span>
                   <span>Max Savings (10)</span>
                 </div>
                 <div class="slider-value">Current: {{ formData.costBalance }}</div>
               </div>

               <div class="form-group">
                 <label for="remoteProvider">Select Remote Provider <span class="required-asterisk">*</span></label>
               <select
                 id="remoteProvider"
                 v-model="formData.remoteProvider"
                 @change="onRemoteProviderChange"
                 required
                 class="form-control"
               >
                 <option value="">Select a provider...</option>
                 <option v-for="provider in remoteProviders" :key="provider" :value="provider" :disabled="isProviderNotReady(provider)">
                   {{ getProviderDisplayName(provider) }}
                 </option>
               </select>
              </div>

              <div class="form-group">
                <label for="remoteApiKey">API Key <span class="required-asterisk" v-if="formData.remoteProvider !== 'ollama'">*</span></label>
                <input
                  id="remoteApiKey"
                  v-model="formData.remoteApiKey"
                  type="password"
                  placeholder="Enter your API key"
                  :required="formData.remoteProvider !== 'ollama'"
                  class="form-control"
                />
              </div>

             <div class="form-group">
               <label for="remoteModel">Select Model <span class="required-asterisk">*</span></label>
             <select
               id="remoteModel"
               v-model="formData.remoteModel"
               required
               class="form-control"
               :disabled="!formData.remoteProvider"
             >
               <option value="">Select a model...</option>
               <option v-for="model in availableRemoteModels" :key="model" :value="model">
                 {{ model}}
               </option>
              </select>
            </div>

            <!-- Custom URL checkbox for remote provider -->
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="isCustomRemoteUrl" />
                Custom URL
              </label>
            </div>

            <!-- Custom URL input (shown when checkbox is checked) -->
            <div v-if="isCustomRemoteUrl" class="form-group">
              <label for="customRemoteUrl">Custom URL</label>
              <input
                id="customRemoteUrl"
                v-model="formData.customRemoteUrl"
                type="text"
                placeholder="e.g., https://api.example.com/v1"
                class="form-control"
              />
            </div>

         <!-- Section 3: Local Provider Configuration (moved to bottom) -->
        <div class="form-section">
          <h3>Local Provider Configuration</h3>

           <div class="form-group">
             <label for="localProvider">Select Local Provider <span class="required-asterisk">*</span></label>
             <select
               id="localProvider"
               v-model="formData.localProvider"
               @change="onLocalProviderChange"
               required
               class="form-control"
             >
               <option value="">Select a provider...</option>
               <option value="ollama">Ollama</option>
               <option value="vllm">vLLM</option>
             </select>
          </div>

           <!-- Custom URL checkbox (only for Ollama) -->
           <div v-if="formData.localProvider === 'ollama'" class="form-group">
             <label class="checkbox-label">
               <input type="checkbox" v-model="isCustomUrl" />
               Custom URL
             </label>
           </div>

           <!-- Custom URL input (shown when checkbox is checked) -->
           <div v-if="isCustomUrl && formData.localProvider === 'ollama'" class="form-group">
             <label for="customOllamaUrl">Ollama URL</label>
             <input
               id="customOllamaUrl"
               v-model="customOllamaUrl"
               type="text"
               placeholder="e.g., http://localhost:11434"
               class="form-control"
             />
              <button type="button" @click="checkAndFetchOllamaModels('local')" class="btn btn-primary btn-small btn-half-height">Check & Fetch Models</button>
           </div>

          <div class="form-group">
            <label for="localApiKey">API Key</label>
            <input
              id="localApiKey"
              v-model="formData.localApiKey"
              type="password"
              placeholder="Enter API key (if required)"
              class="form-control"
            />
          </div>

           <div class="form-group">
             <label for="localModel">Available Models</label>
             <select
               id="localModel"
               v-model="formData.localModel"
               class="form-control"
               :disabled="!formData.localProvider"
             >
               <option value="">Select a model...</option>
               <option v-for="model in availableLocalModels" :key="model" :value="model">
                 {{ model }}
               </option>
             </select>
           </div>
             <div class="form-group">
               <label class="checkbox-label">
                 <input
                   type="checkbox"
                   v-model="formData.mcpIntegration"
                 />
                 Enable MCP Integration
               </label>
             </div>

              <!-- MCP JSON textarea (shown when enabled) -->
              <div v-if="formData.mcpIntegration" class="form-group">
                <label for="mcpJson">MCP JSON Configuration</label>
                <textarea
                  id="mcpJson"
                  v-model="formData.mcpJson"
                  placeholder="Enter JSON configuration for MCP tools..."
                  rows="4"
                  class="form-control"
                ></textarea>
              </div>

          </div>

          <!-- Section 4: Advanced Configuration -->
          <div class="form-section">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="showAdvanced" />
                Advanced Configuration
              </label>
            </div>

            <div v-if="showAdvanced">
              <div class="form-group">
                <label for="temperature">Temperature</label>
                <input
                  id="temperature"
                  v-model.number="formData.temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="topP">Top P</label>
                <input
                  id="topP"
                  v-model.number="formData.topP"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="topK">Top K</label>
                <input
                  id="topK"
                  v-model.number="formData.topK"
                  type="number"
                  min="1"
                  class="form-control"
                />
              </div>

            <div class="form-group">
              <label for="maxRounds">Max Rounds (based on Cost Balance)</label>
              <input
                id="maxRounds"
                :value="maxRounds"
                type="number"
                min="1"
                class="form-control"
                disabled
              />
            </div>

              <div class="form-group">
                <label for="stopSequences">Stop Sequences (comma-separated)</label>
                <input
                  id="stopSequences"
                  v-model="formData.stopSequences"
                  type="text"
                  placeholder="e.g., \n, ."
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="presencePenalty">Presence Penalty</label>
                <input
                  id="presencePenalty"
                  v-model.number="formData.presencePenalty"
                  type="number"
                  step="0.1"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="frequencyPenalty">Frequency Penalty</label>
                <input
                  id="frequencyPenalty"
                  v-model.number="formData.frequencyPenalty"
                  type="number"
                  step="0.1"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="repetitionPenalty">Repetition Penalty</label>
                <input
                  id="repetitionPenalty"
                  v-model.number="formData.repetitionPenalty"
                  type="number"
                  step="0.1"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="seed">Seed</label>
                <input
                  id="seed"
                  v-model.number="formData.seed"
                  type="number"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="responseFormatType">Response Format Type</label>
                <select
                  id="responseFormatType"
                  v-model="formData.responseFormatType"
                  class="form-control"
                >
                  <option value="text">Text</option>
                  <option value="json_object">JSON Object</option>
                </select>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="formData.stream"
                  />
                  Stream Response
                </label>
              </div>

              <div class="form-group">
                <label for="toolChoice">Tool Choice</label>
                <select
                  id="toolChoice"
                  v-model="formData.toolChoice"
                  class="form-control"
                >
                  <option value="auto">Auto</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div class="form-group">
                <label for="user">User</label>
                <input
                  id="user"
                  v-model="formData.user"
                  type="text"
                  placeholder="Unique identifier for the end-user"
                  class="form-control"
                />
              </div>
            </div>

          </div>

        <div class="form-actions">
          <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">{{ isEditing ? 'Save Smart Agent' : 'Create Smart Agent' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface RemoteProviderData {
  provider: string;
  name: string;
  models: Array<{ id: string; name: string }>;
  ready: boolean;
}

interface ApiModel {
  id: string;
  name: string;
  [key: string]: any; // Allow other properties
}

  interface FormData {
       remoteProvider: string;
       remoteApiKey: string;
       remoteModel: string;
       localProvider: string;
       localApiKey: string;
       localModel: string;
       agentName: string;
       agentDescription: string;
       agentContext: string;
       mcpIntegration: boolean;
       costBalance: number;
       customGroqUrl: string;
       customRemoteUrl: string;
        mcpJson: string;
        maxRounds: number;
        temperature: number;
       topP: number;
       topK: number;
       maxNewTokens: number;
       stopSequences: string;
       presencePenalty: number;
       frequencyPenalty: number;
       repetitionPenalty: number;
       seed: number;
       responseFormatType: string;
       stream: boolean;
       toolChoice: string;
       user: string;
     }

const showModal = ref(false);
const isEditing = ref(false);
const editingAgentId = ref<number | null>(null);
const showAdvanced = ref(false);

const maxRounds = computed(() => {
  const cb = formData.value.costBalance;
  if (cb === 10) return 1;
  if (cb === 5) return 3;
  if (cb === 0) return 5;
  return 3; // default
});
const remoteProvidersData = ref<RemoteProviderData[]>([]);
const localModels = ref<Record<string, string[]>>({
  ollama: [],
  vllm: []
});

// Ollama URL and availability
const isCustomUrl = ref(false);
const customOllamaUrl = ref('');
const ollamaWarning = ref('');
const isOllamaAvailable = ref(false);

// Groq URL
const isCustomGroqUrl = ref(false);

// Remote URL
const isCustomRemoteUrl = ref(false);

// Developer prompts
const supervisorSystemPrompt = ref('');
const supervisorDeveloperPrompt = ref('');
const workerSystemPrompt = ref('');
const workerDeveloperPrompt = ref('');

// Provider default URLs
const providerDefaults: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434',
  vllm: 'http://localhost:8000/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  // Add more as needed
};

// Get URL for provider
const getProviderUrl = (provider: string) => {
  if (isCustomRemoteUrl.value && formData.value.customRemoteUrl) return formData.value.customRemoteUrl;
  if (provider === 'groq' && isCustomGroqUrl.value && formData.value.customGroqUrl) return formData.value.customGroqUrl;
  if (provider === 'ollama' && isCustomUrl.value && customOllamaUrl.value) return customOllamaUrl.value;
  return providerDefaults[provider] || '';
};

// Load developer prompts from YAML
const loadPrompts = async () => {
  try {
    // Hardcoded from smartagents-prompts.yaml for now
    supervisorSystemPrompt.value = `You are an expert at analyzing task complexity and routing decisions between language models.
Your goal is to determine whether a given task requires a more powerful remote model or can be handled by a local model.
Assume that both models have equal access to the task context. The local model is {local_model_name} and the remote model is {remote_model_name}.

Consider the following aspects when making your decision:
1. Task complexity and reasoning requirements
2. Domain knowledge needed
3. Potential for errors or hallucinations
4. Need for up-to-date or specialized knowledge
5. Multi-step reasoning or computation requirements

Current task: {task}
Current conversation round: {round_num} out of {max_rounds}
Previous context length: {context_length} characters
Description of the context: {doc_metadata}

DO NOT Try to answer anything that is not strictly related to the {task}`;

    supervisorDeveloperPrompt.value = `We need to perform the following task.
### Task
{task}
### Instructions
You will not have direct access to the context, but you can chat with a small language model that has read the entire content.
Let's use an incremental, step-by-step approach to ensure we fully decompose the task before proceeding. Please follow these steps:
1. Decompose the Task:
  Break down the overall task into its key components or sub-tasks. Identify what needs to be done and list these sub-tasks.
2. Explain Each Component:
  For each sub-task, briefly explain why it is important and what you expect it to achieve. This helps clarify the reasoning behind your breakdown.
3. Formulate a Focused Message:
  Based on your breakdown, craft a single, clear message to send to the small language model. This message should represent one focused sub-task derived from your decomposition.
4. Conclude with a Final Answer:  
  After your reasoning, please provide a **concise final answer** that directly and conclusively addresses the original task. Make sure this final answer includes all the specific details requested in the task.`;

    workerSystemPrompt.value = `You are the Worker (a small model). You have access to the following context: 
{context}
Answer the Supervisor's questions concisely, providing enough detail for the Supervisor to confidently understand your response.

Current task: {task} as instructed by the supervisor
  Current conversation round: {round_num} out of {max_rounds}
  Final answer: when {max_rounds} is reached you'll provide a final answer.
  Previous context length: {context_length} characters try to optimize repsonses
  Description of the context: {doc_metadata}
DO NOT Try to answer anything that is not strictly related to the {task}`;

    workerDeveloperPrompt.value = `Be specific and concise.
Explicitly state instructions.
Analyze and then ask.`;
  } catch (error) {
    console.error('Failed to load prompts:', error);
    supervisorSystemPrompt.value = 'Default supervisor system prompt';
    supervisorDeveloperPrompt.value = 'Default supervisor developer prompt';
    workerSystemPrompt.value = 'Default worker system prompt';
    workerDeveloperPrompt.value = 'Default worker developer prompt';
  }
};







    const formData = ref<FormData>({
       remoteProvider: '',
       remoteApiKey: '',
       remoteModel: '',
       localProvider: '',
       localApiKey: '',
       localModel: '',
       agentName: '',
       agentDescription: '',
       agentContext: '',
       mcpIntegration: false,
       costBalance: 5,
       customGroqUrl: '',
       customRemoteUrl: '',
        mcpJson: '',
        maxRounds: 10,
        temperature: 0.7,
       topP: 1.0,
       topK: 50,
       maxNewTokens: 1000,
       stopSequences: '',
       presencePenalty: 0.0,
       frequencyPenalty: 0.0,
       repetitionPenalty: 1.0,
       seed: 0,
       responseFormatType: 'text',
       stream: false,
       toolChoice: 'auto',
       user: ''
     });



const remoteProviders = computed(() => {
  // Separate ready and not ready providers
  const readyProviders = remoteProvidersData.value.filter(p => p.ready).map(p => p.provider);
  const notReadyProviders = remoteProvidersData.value.filter(p => !p.ready).map(p => p.provider);

  // Put ready providers first, then not ready ones
  const allProviders = [...readyProviders, ...notReadyProviders];
  console.log('Ready providers:', readyProviders);
  console.log('Not ready providers:', notReadyProviders);
  console.log('Final provider list:', allProviders);

  return allProviders;
});

const availableRemoteModels = computed(() => {
  console.log('Computing availableRemoteModels for provider:', formData.value.remoteProvider);

  // For Ollama and vLLM in remote provider, use the models from remote providers data
  if (formData.value.remoteProvider === 'ollama') {
    const ollamaProvider = remoteProvidersData.value.find(p => p.provider === 'ollama');
    const models = ollamaProvider?.models.map(m => m.name) || [];
    console.log('Returning remote Ollama models:', models.length, 'models');
    return models;
  } else if (formData.value.remoteProvider === 'vllm') {
    const vllmProvider = remoteProvidersData.value.find(p => p.provider === 'vllm');
    const models = vllmProvider?.models.map(m => m.name) || [];
    console.log('Returning remote vLLM models:', models.length, 'models');
    return models;
  }
  const providerData = remoteProvidersData.value.find(p => p.provider === formData.value.remoteProvider);
  const models = providerData?.models.map(m => m.name) || [];
  console.log('Returning other provider models:', models.length, 'models');
  return models;
});

const availableLocalModels = computed(() => {
  return localModels.value[formData.value.localProvider] || [];
});

// Initialize providers data with hardcoded list
const initializeProviders = () => {
  // Hardcoded list of providers with ready/not ready status
  const providersList = [
    { id: 'ollama', name: 'Ollama', ready: true },
    { id: 'vllm', name: 'vLLM', ready: true },
    { id: 'moonshotai-cn', name: 'Moonshot AI (China) (not ready)', ready: false },
    { id: 'lucidquery', name: 'LucidQuery (not ready)', ready: false },
    { id: 'moonshotai', name: 'Moonshot AI (not ready)', ready: false },
    { id: 'zai-coding-plan', name: 'Z.AI Coding Plan (not ready)', ready: false },
    { id: 'alibaba', name: 'Alibaba (not ready)', ready: false },
    { id: 'xai', name: 'xAI (not ready)', ready: false },
    { id: 'nvidia', name: 'Nvidia (not ready)', ready: false },
    { id: 'upstage', name: 'Upstage (not ready)', ready: false },
    { id: 'groq', name: 'Groq', ready: true },
    { id: 'github-copilot', name: 'GitHub Copilot', ready: true },
    { id: 'mistral', name: 'Mistral', ready: false },
    { id: 'vercel', name: 'Vercel', ready: false },
    { id: 'nebius', name: 'Nebius (not ready)', ready: false },
    { id: 'deepseek', name: 'DeepSeek', ready: false },
    { id: 'alibaba-cn', name: 'Alibaba CN (not ready)', ready: false },
    { id: 'google-vertex-anthropic', name: 'Google Vertex Anthropic (not ready)', ready: false },
    { id: 'venice', name: 'Venice (not ready)', ready: false },
    { id: 'chutes', name: 'Chutes (not ready)', ready: false },
    { id: 'cortecs', name: 'Cortecs (not ready)', ready: false },
    { id: 'togetherai', name: 'Together AI', ready: false },
    { id: 'azure', name: 'Azure', ready: false },
    { id: 'baseten', name: 'Baseten (not ready)', ready: false },
    { id: 'huggingface', name: 'Hugging Face', ready: false },
    { id: 'opencode', name: 'OpenCode (not ready)', ready: false },
    { id: 'fastrouter', name: 'FastRouter (not ready)', ready: false },
    { id: 'google', name: 'Google', ready: false },
    { id: 'cloudflare-workers-ai', name: 'Cloudflare Workers AI (not ready)', ready: false },
    { id: 'inception', name: 'Inception (not ready)', ready: false },
    { id: 'wandb', name: 'Wandb (not ready)', ready: false },
    { id: 'openai', name: 'OpenAI', ready: false },
    { id: 'zhipuai-coding-plan', name: 'ZhipuAI Coding Plan (not ready)', ready: false },
    { id: 'perplexity', name: 'Perplexity', ready: false },
    { id: 'openrouter', name: 'OpenRouter', ready: false },
    { id: 'v0', name: 'V0 (not ready)', ready: false },
    { id: 'synthetic', name: 'Synthetic (not ready)', ready: false },
    { id: 'deepinfra', name: 'DeepInfra (not ready)', ready: false },
    { id: 'zhipuai', name: 'ZhipuAI (not ready)', ready: false },
    { id: 'submodel', name: 'Submodel (not ready)', ready: false },
    { id: 'zai', name: 'Z.AI (not ready)', ready: false },
    { id: 'inference', name: 'Inference (not ready)', ready: false },
    { id: 'requesty', name: 'Requesty (not ready)', ready: false },
    { id: 'morph', name: 'Morph (not ready)', ready: false },
    { id: 'lmstudio', name: 'LM Studio', ready: false },
    { id: 'anthropic', name: 'Anthropic', ready: false },
    { id: 'fireworks-ai', name: 'Fireworks AI (not ready)', ready: false },
    { id: 'modelscope', name: 'ModelScope (not ready)', ready: false },
    { id: 'llama', name: 'Llama', ready: false },
    { id: 'amazon-bedrock', name: 'Amazon Bedrock', ready: false },
    { id: 'cerebras', name: 'Cerebras (not ready)', ready: false }
  ];

  // Transform to the expected format
  remoteProvidersData.value = providersList.map(provider => ({
    provider: provider.id,
    name: provider.name,
    ready: provider.ready,
    models: [] // Empty for now, will be populated based on provider
  }));

  console.log('Initialized providers:', remoteProvidersData.value.length, 'providers');
};

// Check if Ollama is available at the given URL
const checkOllamaAvailability = async (baseUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch (error) {
    console.error('Ollama availability check failed:', error);
    return false;
  }
};

// Fetch models from Ollama with separate handling for remote and local contexts
const fetchOllamaModels = async (target: 'remote' | 'local' = 'local') => {
  const baseUrl = isCustomUrl.value && customOllamaUrl.value ? customOllamaUrl.value : 'http://localhost:11434';

  // First, check availability
  const available = await checkOllamaAvailability(baseUrl);
  if (!available) {
    ollamaWarning.value = `Ollama not available at ${baseUrl}. Please check the URL or enable custom URL.`;
    isOllamaAvailable.value = false;
    // Clear models
    if (target === 'remote') {
      const ollamaProvider = remoteProvidersData.value.find(p => p.provider === 'ollama');
      if (ollamaProvider) ollamaProvider.models = [];
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };
    } else {
      localModels.value.ollama = [];
    }
    return;
  }

  // If available, clear warning and proceed
  ollamaWarning.value = '';
  isOllamaAvailable.value = true;

  try {
    console.log(`Fetching Ollama models for ${target} context from ${baseUrl}`);
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    console.log(`Fetched ${models.length} Ollama models:`, models);

    if (target === 'remote') {
      // Update models for Ollama in remote providers data
      const ollamaProvider = remoteProvidersData.value.find(p => p.provider === 'ollama');
      if (ollamaProvider) {
        ollamaProvider.models = models.map((model: string) => ({
          id: model,
          name: model
        }));
        console.log('Updated remote Ollama provider models');
      }

      // Force reactivity update for the remote models dropdown
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };

    } else {
      // Update local models (existing behavior)
      localModels.value.ollama = models;
      console.log('Updated local Ollama models');
    }
  } catch (error) {
    console.error(`Failed to fetch Ollama models for ${target}:`, error);
    ollamaWarning.value = `Connection error: Unable to connect to Ollama at ${baseUrl}. Please ensure Ollama is running and accessible.`;
    // Clear models on error
    if (target === 'remote') {
      const ollamaProvider = remoteProvidersData.value.find(p => p.provider === 'ollama');
      if (ollamaProvider) ollamaProvider.models = [];
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };
    } else {
      localModels.value.ollama = [];
    }
  }
};

// Fetch models from vLLM
const fetchVllmModels = async (target: 'remote' | 'local' = 'local') => {
  try {
    const response = await fetch('http://localhost:8000/v1/models');
    const data = await response.json();
    const models = data.data?.map((m: any) => m.id) || [];
    if (target === 'remote') {
      const vllmProvider = remoteProvidersData.value.find(p => p.provider === 'vllm');
      if (vllmProvider) {
        vllmProvider.models = models.map((model: string) => ({
          id: model,
          name: model
        }));
      }
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };
    } else {
      localModels.value.vllm = models;
    }
  } catch (error) {
    console.error('Failed to fetch vLLM models:', error);
    const defaultModels = ['llama-7b', 'codellama-7b'];
    if (target === 'remote') {
      const vllmProvider = remoteProvidersData.value.find(p => p.provider === 'vllm');
      if (vllmProvider) {
        vllmProvider.models = defaultModels.map((model: string) => ({
          id: model,
          name: model
        }));
      }
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };
    } else {
      localModels.value.vllm = defaultModels;
    }
  }
};

// Fetch models from Groq
const fetchGroqModels = async (target: 'remote' | 'local' = 'remote') => {
  if (!formData.value.remoteApiKey) {
    console.warn('Groq API key is required to fetch models');
    return;
  }
  const baseUrl = isCustomGroqUrl.value && formData.value.customGroqUrl ? formData.value.customGroqUrl : 'https://api.groq.com/openai/v1';
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${formData.value.remoteApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const models = data.data?.map((m: any) => m.id) || [];
    console.log(`Fetched ${models.length} Groq models:`, models);
    if (target === 'remote') {
      const groqProvider = remoteProvidersData.value.find(p => p.provider === 'groq');
      if (groqProvider) {
        groqProvider.models = models.map((model: string) => ({
          id: model,
          name: model
        }));
      }
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };
    }
  } catch (error) {
    console.error('Failed to fetch Groq models:', error);
    // Set default models on error
    const defaultModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    if (target === 'remote') {
      const groqProvider = remoteProvidersData.value.find(p => p.provider === 'groq');
      if (groqProvider) {
        groqProvider.models = defaultModels.map((model: string) => ({
          id: model,
          name: model
        }));
      }
      formData.value.remoteModel = '';
      formData.value = { ...formData.value };
    }
  }
};

// Wrapper to check and fetch Ollama models
const checkAndFetchOllamaModels = async (target: 'remote' | 'local') => {
  await fetchOllamaModels(target);
};

const onRemoteProviderChange = () => {
  formData.value.remoteModel = '';
  ollamaWarning.value = '';  // Clear warnings
  // Reset custom URL flags
  isCustomRemoteUrl.value = false;
  formData.value.customRemoteUrl = '';
  if (formData.value.remoteProvider !== 'groq') {
    isCustomGroqUrl.value = false;
    formData.value.customGroqUrl = '';
  }
  // If Ollama is selected in remote provider, fetch Ollama models for remote
  if (formData.value.remoteProvider === 'ollama') {
    fetchOllamaModels('remote');
  } else if (formData.value.remoteProvider === 'vllm') {
    fetchVllmModels('remote');
  } else if (formData.value.remoteProvider === 'groq') {
    fetchGroqModels('remote');
  }
};

const onLocalProviderChange = () => {
  formData.value.localModel = '';
  ollamaWarning.value = '';  // Clear warnings
  if (formData.value.localProvider === 'ollama') {
    fetchOllamaModels('local');
  } else if (formData.value.localProvider === 'vllm') {
    fetchVllmModels('local');
  }
};





 const submitForm = async () => {
   console.log('Form submitted with data:', formData.value);

   // Construct messages for the worker
   const messages = [
     { role: 'system', content: workerSystemPrompt.value },
     { role: 'user', content: formData.value.agentContext || '' }
   ];

   // Construct generation_config
   const generationConfig = {
     temperature: formData.value.temperature,
     top_p: formData.value.topP,
     top_k: formData.value.topK,
     max_new_tokens: formData.value.maxNewTokens,
     stop_sequences: formData.value.stopSequences ? formData.value.stopSequences.split(',').map(s => s.trim()) : [],
     presence_penalty: formData.value.presencePenalty,
     frequency_penalty: formData.value.frequencyPenalty,
     repetition_penalty: formData.value.repetitionPenalty,
     seed: formData.value.seed
   };

   // Construct response_format
   const responseFormat = {
     type: formData.value.responseFormatType
   };

   // Construct tools if MCP integration is enabled
   const tools = formData.value.mcpIntegration && formData.value.mcpJson ? JSON.parse(formData.value.mcpJson) : [];

   // Construct tool_choice
   const toolChoice = formData.value.toolChoice === 'none' ? 'none' : 'auto';

   // Map form data to new Agent API model matching the schema
   const agentData = {
     model: formData.value.localModel,
     task_description: formData.value.agentDescription,
     max_rounds: maxRounds.value,
     messages: messages,
     generation_config: generationConfig,
     response_format: responseFormat,
     stream: formData.value.stream,
     tools: tools,
     tool_choice: toolChoice,
     user: formData.value.user,
     // Keep supervisor info separate as it has no context
     supervisor: {
       provider: formData.value.remoteProvider,
       api: formData.value.remoteApiKey,
       model: formData.value.remoteModel,
       system_prompt: supervisorSystemPrompt.value,
       developer_prompt: supervisorDeveloperPrompt.value,
       url: getProviderUrl(formData.value.remoteProvider)
     },
     // Worker info
     worker: {
       provider: formData.value.localProvider,
       api: formData.value.localApiKey,
       model: formData.value.localModel,
       system_prompt: workerSystemPrompt.value,
       developer_prompt: workerDeveloperPrompt.value,
       context: formData.value.agentContext ? [formData.value.agentContext] : [],
       url: getProviderUrl(formData.value.localProvider)
     },
     // Other fields
     name: formData.value.agentName,
     mcp_integration: formData.value.mcpIntegration,
     mcp_tools: tools,
     cost_balance: formData.value.costBalance,
     user_roles: {},
     created_at: Date.now(),
     updated_at: Date.now()
   };

   try {
     if (isEditing.value) {
       // Update existing agent
       const response = await fetch(`http://localhost:8910/agents/${editingAgentId.value}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(agentData)
       });
       if (!response.ok) throw new Error('Failed to update agent');
       emit('agent-updated');
     } else {
       // Create new agent
       const response = await fetch('http://localhost:8910/agents', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(agentData)
       });
       if (!response.ok) throw new Error('Failed to create agent');
       emit('agent-created');
     }
     closeModal();
   } catch (err) {
     console.error('Submit failed:', err);
     // TODO: Show error to user
   }
 };

const openModal = async (agentId?: string) => {
  if (agentId) {
    // Edit mode
    isEditing.value = true;
    editingAgentId.value = Number(agentId);
    // Fetch agent data from API
    try {
      const response = await fetch(`http://localhost:8910/agents/${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch agent');
      const agent = await response.json();
         formData.value = {
           remoteProvider: agent.supervisor?.provider || '',
           remoteApiKey: agent.supervisor?.api || '',
           remoteModel: agent.supervisor?.model || '',
           localProvider: agent.worker?.provider || '',
           localApiKey: agent.worker?.api || '',
           localModel: agent.worker?.model || '',
           agentName: agent.name || '',
           agentDescription: agent.task_description || agent.description || '',
           agentContext: agent.worker?.context?.[0] || '',
           mcpIntegration: agent.mcp_integration || false,
           costBalance: Number(agent.cost_balance) || 5,
           customGroqUrl: '',
           customRemoteUrl: '',
           mcpJson: JSON.stringify(agent.mcp_tools || []),
           maxRounds: agent.max_rounds || 10,
           temperature: agent.generation_config?.temperature || 0.7,
           topP: agent.generation_config?.top_p || 1.0,
           topK: agent.generation_config?.top_k || 50,
           maxNewTokens: agent.generation_config?.max_new_tokens || 1000,
           stopSequences: agent.generation_config?.stop_sequences?.join(', ') || '',
           presencePenalty: agent.generation_config?.presence_penalty || 0.0,
           frequencyPenalty: agent.generation_config?.frequency_penalty || 0.0,
           repetitionPenalty: agent.generation_config?.repetition_penalty || 1.0,
           seed: agent.generation_config?.seed || 0,
           responseFormatType: agent.response_format?.type || 'text',
           stream: agent.stream || false,
           toolChoice: agent.tool_choice || 'auto',
           user: agent.user || ''
         };
         showAdvanced.value = false;
    } catch (err) {
      console.error('Failed to fetch agent for edit:', err);
    }
  } else {
    // Create mode
    isEditing.value = false;
    editingAgentId.value = null;
   // Reset form
   formData.value = {
     remoteProvider: '',
     remoteApiKey: '',
     remoteModel: '',
     localProvider: '',
     localApiKey: '',
     localModel: '',
     agentName: '',
     agentDescription: '',
     agentContext: '',
     mcpIntegration: false,
     costBalance: 5,
     customGroqUrl: '',
     customRemoteUrl: '',
      mcpJson: '',
      maxRounds: 10,
      temperature: 0.7,
     topP: 1.0,
     topK: 50,
     maxNewTokens: 1000,
     stopSequences: '',
     presencePenalty: 0.0,
     frequencyPenalty: 0.0,
     repetitionPenalty: 1.0,
     seed: 0,
     responseFormatType: 'text',
     stream: false,
     toolChoice: 'auto',
     user: ''
   };
   showAdvanced.value = false;
      showAdvanced.value = false;
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  isEditing.value = false;
  editingAgentId.value = null;
   // Reset form
   formData.value = {
     remoteProvider: '',
     remoteApiKey: '',
     remoteModel: '',
     localProvider: '',
     localApiKey: '',
     localModel: '',
     agentName: '',
     agentDescription: '',
     agentContext: '',
     mcpIntegration: false,
     costBalance: 5,
     customGroqUrl: '',
     customRemoteUrl: '',
     mcpJson: '',
     maxRounds: 10,
     temperature: 0.7,
     topP: 1.0,
     topK: 50,
     maxNewTokens: 1000,
     stopSequences: '',
     presencePenalty: 0.0,
     frequencyPenalty: 0.0,
     repetitionPenalty: 1.0,
     seed: 0,
     responseFormatType: 'text',
     stream: false,
     toolChoice: 'auto',
     user: ''
   };
};

// Watcher for custom URL checkbox
watch(isCustomUrl, (newVal) => {
  if (!newVal) {
    customOllamaUrl.value = '';
    ollamaWarning.value = '';
    if (formData.value.localProvider === 'ollama') {
      fetchOllamaModels('local');  // Re-check with default URL
    }
  }
});

// Watcher for remote custom URL checkbox
watch(isCustomRemoteUrl, (newVal) => {
  if (!newVal) {
    formData.value.customRemoteUrl = '';
  }
});

// Watcher for Groq custom URL checkbox
watch(isCustomGroqUrl, (newVal) => {
  if (!newVal) {
    if (formData.value.remoteProvider === 'groq') {
      fetchGroqModels('remote');  // Re-fetch with default URL
    }
  }
});



// Watcher for remote API key to refetch models when key is provided for Groq
watch(() => formData.value.remoteApiKey, (newKey) => {
  if (formData.value.remoteProvider === 'groq' && newKey) {
    fetchGroqModels('remote');
  }
});

 onMounted(() => {
   initializeProviders();
   loadPrompts();
 });



// Helper method to check if provider is ready
const isProviderNotReady = (providerId: string) => {
  const provider = remoteProvidersData.value.find(p => p.provider === providerId);
  return !provider?.ready;
};

// Helper method to get provider display name
const getProviderDisplayName = (providerId: string) => {
  const provider = remoteProvidersData.value.find(p => p.provider === providerId);
  return provider?.name || providerId;
};

// Props
const props = defineProps<{
}>();

// Emits
const emit = defineEmits<{
  'agent-created': [];
  'agent-updated': [];
}>();

// Expose openModal function to parent component
defineExpose({
  openModal
});
</script>

<style scoped>
.create-agent-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 10000;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  color: #3d98d3;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.close-btn:hover {
  color: #495057;
}

.create-agent-form {
  padding: 24px;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e9ecef;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 1.2rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #495057;
}

.form-group label .required-asterisk {
  color: #dc3545;
  font-weight: bold;
  margin-left: 2px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.warning-message {
  color: #dc3545;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  color: #495057;
  background-color: #fff;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control option {
  color: #000000;
  background-color: #fff;
  font-weight: normal;
}

.form-control:focus {
  border-color: #3d98d3;
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(61, 152, 211, 0.25);
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 1;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #dee2e6;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3d98d3;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3d98d3;
  cursor: pointer;
  border: none;
}

.slider-value {
  text-align: center;
  margin-top: 8px;
  font-size: 12px;
  color: #6c757d;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #6c757d;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
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

  .btn-small {
    padding: 4px 8px;
    font-size: 12px;
    min-height: 20px;
    min-width: 50px;
  }

  .btn-half-height {
    min-height: 10px;
    padding: 2px 8px;
  }

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>