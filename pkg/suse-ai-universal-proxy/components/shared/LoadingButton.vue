<template>
  <button 
    :type="type"
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <i v-if="loading" class="icon icon-spinner icon-spin"></i>
    <i v-else-if="icon" :class="`icon ${icon}`"></i>
    <span v-if="$slots.default || text">
      <slot>{{ text }}</slot>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
  name: 'LoadingButton',
  
  props: {
    type: {
      type: String as PropType<'button' | 'submit' | 'reset'>,
      default: 'button'
    },
    
    variant: {
      type: String as PropType<'primary' | 'secondary' | 'tertiary' | 'danger'>,
      default: 'primary'
    },
    
    size: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'md'
    },
    
    loading: {
      type: Boolean,
      default: false
    },
    
    disabled: {
      type: Boolean,
      default: false
    },
    
    icon: {
      type: String,
      default: null
    },
    
    text: {
      type: String,
      default: null
    },
    
    block: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['click'],
  
  setup(props) {
    const buttonClasses = computed(() => {
      const classes = ['btn'];
      
      // Size
      if (props.size !== 'md') {
        classes.push(`btn-${props.size}`);
      }
      
      // Variant
      switch (props.variant) {
        case 'primary':
          classes.push('role-primary');
          break;
        case 'secondary':
          classes.push('role-secondary');
          break;
        case 'tertiary':
          classes.push('role-tertiary');
          break;
        case 'danger':
          classes.push('bg-error');
          break;
      }
      
      // State modifiers
      if (props.loading) {
        classes.push('btn-loading');
      }
      
      if (props.block) {
        classes.push('btn-block');
      }
      
      return classes;
    });
    
    return {
      buttonClasses
    };
  }
});
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
}

.btn-block {
  width: 100%;
}

.btn-loading {
  pointer-events: none;
}

.role-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-text);
}

.role-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.role-secondary {
  background: var(--accent-btn);
  border-color: var(--accent-btn);
  color: var(--accent-btn-text);
}

.role-secondary:hover:not(:disabled) {
  background: var(--accent-btn-hover);
  border-color: var(--accent-btn-hover);
}

.role-tertiary {
  background: transparent;
  border-color: var(--border);
  color: var(--body-text);
}

.role-tertiary:hover:not(:disabled) {
  background: var(--input-bg);
  border-color: var(--primary);
  color: var(--primary);
}

.bg-error {
  background: var(--error);
  border-color: var(--error);
  color: var(--error-text);
}

.bg-error:hover:not(:disabled) {
  background: var(--error-hover);
  border-color: var(--error-hover);
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>