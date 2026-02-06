<template>
  <div class="error-boundary">
    <div v-if="hasError" class="error-display">
      <div class="error-container">
        <div class="error-icon">
          <i class="icon icon-warning"></i>
        </div>
        
        <div class="error-content">
          <h3 class="error-title">{{ errorTitle }}</h3>
          <p class="error-message">{{ displayMessage }}</p>
          
          <div v-if="showDetails && errorDetails" class="error-details">
            <details>
              <summary>Technical Details</summary>
              <pre class="error-stack">{{ errorDetails }}</pre>
            </details>
          </div>
          
          <div class="error-actions">
            <button class="btn role-primary" @click="retry">
              <i class="icon icon-refresh"></i>
              Try Again
            </button>
            
            <button v-if="showReload" class="btn role-secondary" @click="reload">
              <i class="icon icon-refresh"></i>
              Reload Page
            </button>
            
            <button v-if="onReport" class="btn role-tertiary" @click="onReport">
              <i class="icon icon-bug"></i>
              Report Issue
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="error-content-wrapper">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onErrorCaptured, nextTick, PropType } from 'vue';

export default defineComponent({
  name: 'ErrorBoundary',
  
  props: {
    errorTitle: {
      type: String,
      default: 'Something went wrong'
    },
    
    fallbackMessage: {
      type: String,
      default: 'An unexpected error occurred. Please try again.'
    },
    
    showDetails: {
      type: Boolean,
      default: false
    },
    
    showReload: {
      type: Boolean,
      default: true
    },
    
    onReport: {
      type: Function as PropType<() => void>,
      default: null
    },
    
    onRetry: {
      type: Function,
      default: null
    }
  },
  
  emits: ['error'],
  
  setup(props, { emit }) {
    const hasError = ref(false);
    const errorDetails = ref<string | null>(null);
    const displayMessage = ref(props.fallbackMessage);
    
    onErrorCaptured((error: Error, instance, errorInfo) => {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component instance:', instance);
      console.error('[ErrorBoundary] Error info:', errorInfo);
      
      hasError.value = true;
      errorDetails.value = error.stack || error.message;
      displayMessage.value = error.message || props.fallbackMessage;
      
      emit('error', { error, instance, errorInfo });
      
      // Prevent the error from propagating
      return false;
    });
    
    const retry = async () => {
      hasError.value = false;
      errorDetails.value = null;
      displayMessage.value = props.fallbackMessage;
      
      if (props.onRetry) {
        try {
          await props.onRetry();
        } catch (error) {
          console.error('[ErrorBoundary] Retry failed:', error);
          hasError.value = true;
          errorDetails.value = (error as Error).stack || (error as Error).message;
          displayMessage.value = (error as Error).message || 'Retry failed';
        }
      } else {
        // Force component re-render
        await nextTick();
      }
    };
    
    const reload = () => {
      window.location.reload();
    };
    
    return {
      hasError,
      errorDetails,
      displayMessage,
      retry,
      reload
    };
  }
});
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-content-wrapper {
  width: 100%;
  height: 100%;
}

.error-display {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 32px;
  background: var(--body-bg);
}

.error-container {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  max-width: 600px;
  padding: 32px;
  background: var(--nav-bg);
  border: 1px solid var(--error-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--error-banner-bg);
  border-radius: 50%;
  color: var(--error);
}

.error-icon .icon {
  font-size: 24px;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.error-message {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.error-details {
  margin: 16px 0;
}

.error-details summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 8px;
}

.error-details summary:hover {
  color: var(--body-text);
}

.error-stack {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  color: var(--muted);
  overflow: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-text);
}

.role-primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.role-secondary {
  background: var(--accent-btn);
  border-color: var(--accent-btn);
  color: var(--accent-btn-text);
}

.role-secondary:hover {
  background: var(--accent-btn-hover);
  border-color: var(--accent-btn-hover);
}

.role-tertiary {
  background: transparent;
  border-color: var(--border);
  color: var(--body-text);
}

.role-tertiary:hover {
  background: var(--input-bg);
  border-color: var(--primary);
  color: var(--primary);
}
</style>