<template>
  <div class="login-step">
    <div class="step-header">
      <h3>Authenticate with SUSE AI Universal Proxy</h3>
      <p>Login to access the proxy services.</p>
    </div>

    <div v-if="loading" class="loading-section">
      <Loading />
      <p>Loading authentication configuration...</p>
    </div>

    <div v-else-if="error" class="error-section">
      <Banner color="error">
        <strong>Authentication Error</strong>
        <p>{{ error }}</p>
        <button class="btn btn-sm bg-primary mt-10" @click="retry">Retry</button>
      </Banner>
    </div>

    <div v-else class="auth-content">
      <!-- Dev Mode - Skip Login -->
      <div v-if="authMode?.mode === 'dev'" class="dev-mode">
        <Banner color="info">
          <strong>Development Mode</strong>
          <p>Authentication is bypassed in development mode.</p>
        </Banner>
        <div class="actions">
          <button class="btn-primary" @click="$emit('login-success')">Continue</button>
        </div>
      </div>

      <!-- Local Authentication -->
      <div v-else-if="authMode?.mode === 'local'" class="local-auth">
        <form @submit.prevent="handleLocalLogin" class="login-form">
          <div class="form-group">
            <label for="username">Username:</label>
            <input
              id="username"
              v-model="localCredentials.user_id"
              type="text"
              required
              class="form-control"
              placeholder="admin"
            />
          </div>

          <div class="form-group">
            <label for="password">Password:</label>
            <input
              id="password"
              v-model="localCredentials.password"
              type="password"
              required
              class="form-control"
              placeholder="Enter password"
            />
          </div>

          <div v-if="loginError" class="error-message">
            <p>{{ loginError }}</p>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="loginLoading">
              {{ loginLoading ? 'Logging in...' : 'Login' }}
            </button>
          </div>
        </form>

        <!-- Password Change Form (shown after successful login if required) -->
        <form v-if="showPasswordChange" @submit.prevent="handlePasswordChange" class="password-change-form">
          <h4>Change Password</h4>
          <p>You must change the default password on first login.</p>

          <div class="form-group">
            <label for="newPassword">New Password:</label>
            <input
              id="newPassword"
              v-model="passwordChange.newPassword"
              type="password"
              required
              class="form-control"
              placeholder="Enter new password"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password:</label>
            <input
              id="confirmPassword"
              v-model="passwordChange.confirmPassword"
              type="password"
              required
              class="form-control"
              placeholder="Confirm new password"
            />
          </div>

          <div v-if="passwordError" class="error-message">
            <p>{{ passwordError }}</p>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="passwordLoading">
              {{ passwordLoading ? 'Changing...' : 'Change Password' }}
            </button>
          </div>
        </form>
      </div>

      <!-- OAuth Authentication -->
      <div v-else-if="authMode?.mode === 'github' || authMode?.mode === 'rancher'" class="oauth-auth">
        <div class="oauth-info">
          <p>Authenticate using {{ authMode.mode === 'github' ? 'GitHub' : 'Rancher' }} OAuth.</p>
        </div>

        <div v-if="oauthError" class="error-message">
          <p>{{ oauthError }}</p>
        </div>

        <div class="actions">
          <button class="btn-primary" @click="handleOAuthLogin" :disabled="oauthLoading">
            {{ oauthLoading ? 'Redirecting...' : `Login with ${authMode.mode === 'github' ? 'GitHub' : 'Rancher'}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { ProxyAuthService } from '../../services/proxy-auth-service'
import { AuthMode } from '../../services/base-api'
import Loading from '@shell/components/Loading'
import { Banner } from '@rancher/shell/rancher-components/Banner'

export default defineComponent({
  name: 'LoginStep',
  components: {
    Loading,
    Banner
  },
  props: {
    proxyUrl: {
      type: String,
      required: true
    }
  },
  emits: ['login-success'],

  setup(props, { emit }) {
    const authService = new ProxyAuthService({
      baseURL: props.proxyUrl,
      timeout: 10000,
      retries: 3
    })

    const authMode = ref<AuthMode | null>(null)
    const loading = ref(true)
    const error = ref('')
    const loginLoading = ref(false)
    const loginError = ref('')
    const oauthLoading = ref(false)
    const oauthError = ref('')
    const passwordLoading = ref(false)
    const passwordError = ref('')
    const showPasswordChange = ref(false)

    const localCredentials = ref({
      user_id: 'admin',
      password: 'admin'
    })

    const passwordChange = ref({
      newPassword: '',
      confirmPassword: ''
    })

    const fetchAuthMode = async () => {
      try {
        loading.value = true
        error.value = ''
        authMode.value = await authService.getAuthMode()
      } catch (err: any) {
        error.value = err.message || 'Failed to load authentication configuration'
      } finally {
        loading.value = false
      }
    }

    const handleLocalLogin = async () => {
      try {
        loginLoading.value = true
        loginError.value = ''
        const response = await authService.login(localCredentials.value)
        emit('login-success')
      } catch (err: any) {
        loginError.value = err.message || 'Login failed'
        // Check if password change is required
        if (err.message?.includes('password change')) {
          showPasswordChange.value = true
        }
      } finally {
        loginLoading.value = false
      }
    }

    const handlePasswordChange = async () => {
      if (passwordChange.value.newPassword !== passwordChange.value.confirmPassword) {
        passwordError.value = 'Passwords do not match'
        return
      }

      try {
        passwordLoading.value = true
        passwordError.value = ''
        await authService.changePassword({
          current_password: localCredentials.value.password,
          new_password: passwordChange.value.newPassword
        })
        emit('login-success')
      } catch (err: any) {
        passwordError.value = err.message || 'Password change failed'
      } finally {
        passwordLoading.value = false
      }
    }

    const handleOAuthLogin = async () => {
      try {
        oauthLoading.value = true
        oauthError.value = ''
        const response = await authService.initiateOAuth({
          provider: authMode.value!.mode as 'github' | 'rancher'
        })

        // Open OAuth URL in new window
        const authWindow = window.open(response.auth_url, 'oauth', 'width=600,height=700')

        // Poll for window close or success
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed)
            oauthLoading.value = false
            // In a real implementation, you'd need to handle the callback
            // For now, assume success on window close
            emit('login-success')
          }
        }, 1000)

      } catch (err: any) {
        oauthError.value = err.message || 'OAuth login failed'
        oauthLoading.value = false
      }
    }

    const retry = () => {
      fetchAuthMode()
    }

    onMounted(() => {
      fetchAuthMode()
    })

    return {
      authMode,
      loading,
      error,
      loginLoading,
      loginError,
      oauthLoading,
      oauthError,
      passwordLoading,
      passwordError,
      showPasswordChange,
      localCredentials,
      passwordChange,
      handleLocalLogin,
      handlePasswordChange,
      handleOAuthLogin,
      retry
    }
  }
})
</script>

<style scoped>
.login-step {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.step-header {
  margin-bottom: 24px;
}

.step-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.step-header p {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

.loading-section {
  text-align: center;
  padding: 40px 20px;
}

.error-section {
  margin-bottom: 20px;
}

.auth-content {
  max-width: 400px;
  margin: 0 auto;
}

.dev-mode,
.local-auth,
.oauth-auth {
  text-align: center;
}

.login-form,
.password-change-form {
  text-align: left;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--body-text);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--body-bg);
  color: var(--body-text);
}

.error-message {
  color: var(--error, #dc3545);
  font-size: 14px;
  margin-bottom: 16px;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

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

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.bg-primary {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
}
</style>