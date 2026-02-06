<template>
  <div class="install-steps pt-20 outlet">
    <Wizard
      class="wizard windowsIncompatible"
      :steps="simpleSteps"
      :init-step-index="0"
      :edit-first-step="true"
      title="Test Wizard"
      subtitle="Minimal Test"
      finish-mode="install"
      @next="onNext"
      @cancel="onCancel"
      @finish="onFinish"
    >
      <template #step1>
        <div>
          <h3>Step 1 Content</h3>
          <p>This is a minimal test step.</p>
        </div>
      </template>

      <template #step2>
        <div>
          <h3>Step 2 Content</h3>
          <p>This is the second step.</p>
        </div>
      </template>
    </Wizard>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Wizard from '@shell/components/Wizard';

const simpleSteps = ref([
  {
    name: 'step1',
    label: 'Step 1',
    ready: true,
    weight: 1
  },
  {
    name: 'step2', 
    label: 'Step 2',
    ready: true,
    weight: 2
  }
]);

function onNext(data: any) {
  console.log('Next:', data);
}

function onCancel() {
  console.log('Cancel');
}

function onFinish() {
  console.log('Finish');
}
</script>

<style>
/* Target all elements that could cause horizontal overflow */
* {
  box-sizing: border-box !important;
  max-width: 100% !important;
}

/* Root-level overflow hiding */
html {
  overflow-x: hidden !important;
}

body {
  overflow-x: hidden !important;
}

/* Container level fixes */
.dashboard-content,
.dashboard-root,
.outlet {
  overflow-x: hidden !important;
  max-width: 100% !important;
}

/* Wizard specific fixes */
.wizard {
  overflow-x: hidden !important;
  max-width: 100% !important;
}

.wizard .step-container {
  overflow-x: hidden !important;
  max-width: 100% !important;
}

/* Hide scrollbars entirely */
::-webkit-scrollbar:horizontal {
  display: none !important;
}

/* Firefox scrollbar hiding */
html, body {
  scrollbar-width: none !important;
}
</style>

<style scoped>
/* No custom component styles - pure test */
</style>