<template>
  <div class="home-container">
    <!-- Experimental Banner -->
    <div class="experimental-banner">
      <span class="banner-icon">!</span>
      <strong>Experimental Feature</strong>
      <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="welcome-section">
        <h1>Welcome to SUSE AI Universal Proxy</h1>
        <p>Configure and manage your SUSE AI services through the Settings page.</p>
      </div>

      <div class="setup-section">
        <div class="setup-card">
          <div class="card-icon">
            <i class="icon icon-settings"></i>
          </div>
          <div class="card-content">
            <h3>Configuration Required</h3>
            <p>To get started with SUSE AI services, you need to configure the Universal Proxy first. Open the Global Settings menu and follow the configuration wizard.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Home'
})
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Experimental Banner */
.experimental-banner {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 24px;
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

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.welcome-section {
  text-align: center;
  padding: 48px 24px;
}

.welcome-section h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text, #333);
  margin: 0 0 16px 0;
}

.welcome-section p {
  font-size: 16px;
  color: var(--text-muted, #666);
  margin: 0;
}

/* Setup Section */
.setup-section {
  display: flex;
  justify-content: center;
}

.setup-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #dee2e6);
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 48px;
  color: var(--primary, #007bff);
  margin-bottom: 16px;
}

.setup-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text, #333);
  margin: 0 0 12px 0;
}

.setup-card p {
  font-size: 15px;
  color: var(--text-muted, #666);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.setup-card .btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.setup-card .btn-primary {
  background: var(--primary, #007bff);
  color: white;
  border: 1px solid var(--primary, #007bff);
}

.setup-card .btn-primary:hover {
  background: var(--primary-hover, #0056b3);
  border-color: var(--primary-hover, #0056b3);
}

/* Status Section */
.status-section {
  display: flex;
  justify-content: center;
}

.status-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #dee2e6);
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-card.success {
  border-color: var(--success-border, #d4edda);
  background: var(--success-bg, #f8fff9);
}

.status-card.warning {
  border-color: var(--warning-border, #ffeaa7);
  background: var(--warning-bg, #fffef8);
}

.status-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.status-card.success .status-icon {
  color: var(--success, #28a745);
}

.status-card.warning .status-icon {
  color: var(--warning, #856404);
}

.status-content h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text, #333);
  margin: 0 0 12px 0;
}

.status-content p {
  font-size: 15px;
  color: var(--text-muted, #666);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.status-details {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.detail-item {
  text-align: center;
}

.detail-item strong {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text, #333);
}

.detail-item span {
  font-size: 14px;
  color: var(--text-muted, #666);
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .home-container {
    padding: 16px;
  }

  .welcome-section {
    padding: 32px 16px;
  }

  .welcome-section h1 {
    font-size: 24px;
  }

  .setup-card, .status-card {
    padding: 24px;
  }

  .status-details {
    flex-direction: column;
    gap: 16px;
  }
}

/* Step Styles */
.step {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.step-header {
  margin-bottom: 24px;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.step-header p {
  font-size: 16px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.back-btn {
  font-size: 14px;
  padding: 6px 12px;
  margin-top: 8px;
}

.step-content {
  max-width: 800px;
}

/* Loading Section */
.loading-section {
  text-align: center;
  padding: 40px 20px;
}

/* Error Section */
.error-section {
  margin-bottom: 20px;
}

/* No Pods Section */
.no-pods-section {
  margin-bottom: 20px;
}

/* Clusters Grid */
.clusters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.cluster-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.cluster-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cluster-card.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.05));
}

.tile-header {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.tile-logo-container {
  min-width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-icon {
  font-size: 24px;
  color: var(--primary);
}

.tile-info {
  flex: 1;
}

.tile-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.tile-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
}

.tile-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-info {
  background: var(--info-light, #d1ecf1);
  color: var(--info, #0c5460);
}

.tile-footer {
  padding: 16px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
  background: var(--accent-bg, rgba(0, 123, 255, 0.02));
}

.tile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.radio-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text);
}

.radio-checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.radio-input:checked + .radio-label .radio-checkmark {
  border-color: var(--primary);
  background: var(--primary);
}

.radio-input:checked + .radio-label .radio-checkmark::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
}

/* Completion Message */
.completion-message {
  margin-bottom: 24px;
}

.completion-banner {
  background: var(--success-light, #d4edda);
  border: 1px solid var(--success, #28a745);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--success, #155724);
}

.completion-banner i {
  font-size: 20px;
  color: var(--success, #28a745);
}

/* Configuration Review */
.review-section {
  margin-bottom: 32px;
}

.review-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 16px 0;
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
  padding-bottom: 8px;
}

.review-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.review-icon {
  font-size: 24px;
  color: var(--primary);
  min-width: 24px;
}

.review-info strong {
  display: block;
  font-size: 16px;
  color: var(--body-text);
  margin-bottom: 4px;
}

.review-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.services-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.service-summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.service-summary-item .service-icon {
  font-size: 20px;
  color: var(--primary);
  min-width: 20px;
}

.service-summary-item .service-info strong {
  font-size: 14px;
  color: var(--body-text);
}

/* Proxy Selection */
.proxy-selection {
  max-width: 600px;
}

.proxy-dropdown {
  margin-bottom: 24px;
}

.proxy-dropdown label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--body-text);
}

.proxy-dropdown select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--body-bg);
  color: var(--body-text);
}

.proxy-details {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg);
}

.proxy-details h4 {
  margin: 0 0 16px 0;
  color: var(--body-text);
}

.detail-item {
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-item strong {
  color: var(--body-text);
}

/* Pod Info Section */
.pod-info-section, .proxy-info-section {
  margin-bottom: 24px;
}

/* Pods Grid */
.pods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

/* Service Selection */
.service-selection {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
}

.service-selection-header {
  margin-bottom: 20px;
}

.service-selection-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.service-selection-header p {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

/* Actions */
.actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Button Styles */
.btn-primary {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, darken(var(--primary), 10%));
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--secondary-bg, #f8f9fa);
  color: var(--secondary-text, #495057);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--secondary-hover, #e9ecef);
}

/* Responsive */
@media (max-width: 768px) {
  .home-container {
    padding: 16px;
  }

  .step {
    padding: 16px;
  }

  .pods-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>