<template>
  <div class="alpha-banner">
    <div class="banner-content">
      <div class="banner-line-1">
        <strong>Alpha Software</strong>
      </div>
      <div class="banner-line-2">
        Universal Proxy is currently in alpha version. This software is not production-ready. Interfaces, APIs, and behavior may change without notice as we iterate on the design. We welcome any feedback via <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ExperimentalBanner'
});
</script>

<style scoped>
.alpha-banner {
  background-color: #90ebcd;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 16px 24px 16px;
  display: flex;
  align-items: flex-start;
  color: #0b3835;
  border: 1px solid rgba(11, 56, 53, 0.1);
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.banner-line-1 strong {
  font-weight: 700;
  font-size: 16px;
}

.banner-line-2 {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.banner-line-2 a {
  color: #0b3835;
  text-decoration: underline;
  font-weight: 600;
}

.banner-line-2 a:hover {
  opacity: 0.8;
}
</style>
