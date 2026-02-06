<template>
  <div v-if="isEnabled" class="feature-flag">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, getCurrentInstance } from 'vue';
import { featureEnabled, getClusterVersion } from '../../config/feature-flags';
import type { FeatureFlag } from '../../config/feature-flags';

export default defineComponent({
  name: 'FeatureFlag',
  
  props: {
    feature: {
      type: String,
      required: true
    },
    
    clusterId: {
      type: String,
      default: null
    },
    
    fallback: {
      type: Boolean,
      default: false
    },
    
    invert: {
      type: Boolean,
      default: false
    }
  },
  
  setup(props) {
    const vm = getCurrentInstance();
    const store = (vm as any)?.proxy?.$store;
    const route = (vm as any)?.proxy?.$route;
    
    const isEnabled = computed(() => {
      try {
        // Get cluster ID from props, route, or default
        const clusterIdToUse = props.clusterId || 
                             (route?.params?.cluster as string) || 
                             'local';
        
        // Check if feature is enabled
        const enabled = featureEnabled(props.feature as FeatureFlag, clusterIdToUse, store);
        
        // Apply invert logic if specified
        return props.invert ? !enabled : enabled;
      } catch (error) {
        console.error('[FeatureFlag] Error checking feature:', props.feature, error);
        return props.fallback;
      }
    });
    
    return {
      isEnabled
    };
  }
});
</script>

<style scoped>
.feature-flag {
  width: 100%;
  height: 100%;
}
</style>