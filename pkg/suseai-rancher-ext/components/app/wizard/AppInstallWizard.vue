<template>
  <div class="app-install-wizard">
    <!-- Wizard Header -->
    <div class="wizard-header">
      <div class="wizard-title">
        <h1>{{ mode === 'install' ? 'Install' : 'Manage' }} Application</h1>
        <p v-if="app" class="app-subtitle">
          <img :src="logoFor(app)" alt="" class="app-icon" />
          <span class="app-name">{{ app.name }}</span>
          <span v-if="app.version" class="app-version">v{{ app.version }}</span>
        </p>
      </div>
      
      <div class="wizard-progress" v-if="showProgress">
        <div class="progress-steps">
          <div 
            v-for="(step, index) in steps" 
            :key="step.name"
            :class="{
              'step': true,
              'active': index === currentStep,
              'completed': index < currentStep,
              'disabled': index > currentStep
            }"
          >
            <div class="step-icon">
              <i v-if="index < currentStep" class="icon icon-checkmark"></i>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Wizard Content -->
    <div class="wizard-content">
      <slot 
        :currentStep="currentStep" 
        :steps="steps"
        :app="app"
        :mode="mode"
        :canProceed="canProceed"
        :isProcessing="isProcessing"
        :error="error"
      />
    </div>

    <!-- Wizard Footer -->
    <div class="wizard-footer">
      <div class="wizard-actions">
        <button 
          class="btn role-secondary" 
          @click="$emit('cancel')"
          :disabled="isProcessing"
        >
          Cancel
        </button>
        
        <div class="action-buttons">
          <button 
            v-if="currentStep > 0"
            class="btn role-secondary" 
            @click="previousStep"
            :disabled="isProcessing"
          >
            Previous
          </button>
          
          <button 
            v-if="currentStep < steps.length - 1"
            class="btn role-primary" 
            @click="nextStep"
            :disabled="!canProceed || isProcessing"
          >
            Next
          </button>
          
          <button 
            v-if="currentStep === steps.length - 1"
            class="btn role-primary" 
            :class="{ 'btn-loading': isProcessing }"
            @click="$emit('finish')"
            :disabled="!canProceed || isProcessing"
          >
            <i v-if="isProcessing" class="icon icon-spinner icon-spin"></i>
            <span>{{ mode === 'install' ? 'Install' : 'Update' }}</span>
          </button>
        </div>
      </div>
      
      <div v-if="error" class="error-message">
        <i class="icon icon-warning"></i>
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import type { PropType } from 'vue';
import type { AppCollectionItem } from '../../../models/app/app-collection';

type WizardStep = {
  name: string;
  label: string;
  component?: string;
};

export default defineComponent({
  name: 'AppInstallWizard',
  
  props: {
    app: {
      type: Object as PropType<AppCollectionItem>,
      default: null
    },
    
    mode: {
      type: String as PropType<'install' | 'manage'>,
      default: 'install'
    },
    
    steps: {
      type: Array as PropType<WizardStep[]>,
      default: () => [
        { name: 'basic', label: 'Basic Info' },
        { name: 'config', label: 'Configuration' },
        { name: 'review', label: 'Review & Install' }
      ]
    },
    
    showProgress: {
      type: Boolean,
      default: true
    },
    
    canProceed: {
      type: Boolean,
      default: true
    },
    
    isProcessing: {
      type: Boolean,
      default: false
    },
    
    error: {
      type: String,
      default: null
    }
  },
  
  emits: [
    'step-changed',
    'cancel',
    'finish'
  ],
  
  setup(props, { emit }) {
    const currentStep = ref(0);
    
    const nextStep = () => {
      if (currentStep.value < props.steps.length - 1) {
        currentStep.value++;
        emit('step-changed', currentStep.value);
      }
    };
    
    const previousStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--;
        emit('step-changed', currentStep.value);
      }
    };
    
    const logoFor = (item: AppCollectionItem): string => {
      return item.logo_url || '/img/generic-app.svg';
    };
    
    return {
      currentStep,
      nextStep,
      previousStep,
      logoFor
    };
  }
});
</script>

<style scoped>
.app-install-wizard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--body-bg);
}

.wizard-header {
  padding: 24px 32px;
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.wizard-title {
  margin-bottom: 24px;
}

.wizard-title h1 {
  font-size: 24px;
  font-weight: 400;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.app-subtitle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: var(--muted);
}

.app-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
}

.app-name {
  font-weight: 500;
  color: var(--body-text);
}

.app-version {
  padding: 2px 8px;
  background: var(--accent-btn);
  border-radius: 12px;
  font-size: 12px;
  color: var(--accent-btn-text);
}

.progress-steps {
  display: flex;
  align-items: center;
  gap: 32px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  transition: all 0.2s ease;
}

.step.active {
  color: var(--primary);
  font-weight: 500;
}

.step.completed {
  color: var(--success);
}

.step.disabled {
  opacity: 0.5;
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.step.active .step-icon {
  background: var(--primary);
  color: var(--primary-text);
}

.step.completed .step-icon {
  background: var(--success);
  color: var(--success-text);
}

.step.disabled .step-icon {
  background: var(--disabled-bg);
  color: var(--disabled-text);
}

.step:not(.active):not(.completed):not(.disabled) .step-icon {
  background: var(--input-bg);
  border: 2px solid var(--border);
  color: var(--body-text);
}

.step-label {
  font-size: 14px;
  white-space: nowrap;
}

.wizard-content {
  flex: 1;
  overflow: auto;
  padding: 32px;
}

.wizard-footer {
  padding: 24px 32px;
  background: var(--nav-bg);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.wizard-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-loading {
  position: relative;
}

.btn-loading .icon-spin {
  margin-right: 8px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--error-banner-bg);
  border: 1px solid var(--error-border);
  border-radius: 4px;
  color: var(--error);
  font-size: 14px;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>