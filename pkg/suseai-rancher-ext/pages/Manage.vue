<script lang="ts">
import { defineComponent } from 'vue';
import AppWizard from './components/AppWizard.vue';

export default defineComponent({
  name: 'ManageApp',
  components: { AppWizard },
  props: { slug: { type: String, required: true } }
});
</script>

<style scoped>
/* Experimental Banner */
.experimental-banner {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 12px 16px;
  margin: 16px 24px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #856404;
}

.banner-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.experimental-banner strong {
  font-weight: 600;
  color: #856404;
}

.experimental-banner p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.experimental-banner a {
  color: #d63384;
  text-decoration: underline;
}

.experimental-banner a:hover {
  color: #b02a5b;
}
</style>

<template>
  <div class="experimental-banner">
    <span class="banner-icon">⚠️</span>
    <strong>Experimental Feature</strong>
    <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
  </div>
  <AppWizard :slug="slug" mode="manage" />
</template>