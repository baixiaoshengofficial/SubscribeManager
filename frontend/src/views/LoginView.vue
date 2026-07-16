<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">
          <el-icon><Box /></el-icon>
        </div>
        <h1 class="login-title">{{ t('login.title') }}</h1>
        <p class="login-subtitle">{{ t('login.subtitle') }}</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        autocomplete="on"
        @submit.prevent="submit"
      >
        <el-form-item :label="t('login.username')" prop="username">
          <el-input
            v-model="form.username"
            data-testid="login-username"
            :prefix-icon="User"
            name="username"
            autocomplete="username"
            :placeholder="t('login.username')"
          />
        </el-form-item>
        <el-form-item :label="t('login.password')" prop="password">
          <el-input
            v-model="form.password"
            data-testid="login-password"
            type="password"
            :prefix-icon="Lock"
            name="password"
            autocomplete="current-password"
            show-password
            :placeholder="t('login.password')"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="rememberMe" data-testid="login-remember" @change="onRememberMeChange">
            {{ t('login.remember_me') }}
          </el-checkbox>
        </el-form-item>
        <el-button
          type="primary"
          class="login-submit"
          data-testid="login-submit"
          :loading="loading"
          @click="submit"
        >{{ loading ? t('login.submitting') : t('login.submit') }}</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { api } from '../api/client';
import { loadRememberedCredentials, saveRememberedCredentials, clearRememberedCredentials } from '../utils/rememberedCredentials';

const { t } = useI18n();
const emit = defineEmits(['success']);

const formRef = ref();
const loading = ref(false);
const rememberMe = ref(false);
const form = reactive(loadRememberedCredentials());
rememberMe.value = Boolean(form.username || form.password);

const rules = {
  username: [{ required: true, message: '', trigger: 'blur' }],
  password: [{ required: true, message: '', trigger: 'blur' }]
};

function onRememberMeChange(value) {
  if (!value) {
    clearRememberedCredentials();
  }
}

async function submit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  loading.value = true;
  try {
    await api.login(form);
    ElMessage.success(t('login.success'));
    if (rememberMe.value) {
      saveRememberedCredentials({ username: form.username, password: form.password });
    }
    emit('success');
  } catch (err) {
    ElMessage.error(err?.message || t('login.request_error'));
  } finally {
    loading.value = false;
  }
}
</script>
