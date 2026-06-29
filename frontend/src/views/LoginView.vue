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
        autocomplete="off"
        @submit.prevent="submit"
      >
        <el-form-item :label="t('login.username')" prop="username">
          <el-input
            v-model="form.username"
            :prefix-icon="User"
            autocomplete="off"
            :placeholder="t('login.username')"
          />
        </el-form-item>
        <el-form-item :label="t('login.password')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :prefix-icon="Lock"
            autocomplete="new-password"
            show-password
            :placeholder="t('login.password')"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="login-submit"
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

const { t } = useI18n();
const emit = defineEmits(['success']);

const formRef = ref();
const loading = ref(false);
const form = reactive({ username: '', password: '' });

const rules = {
  username: [{ required: true, message: '', trigger: 'blur' }],
  password: [{ required: true, message: '', trigger: 'blur' }]
};

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
    emit('success');
  } catch (err) {
    ElMessage.error(err?.message || t('login.request_error'));
  } finally {
    loading.value = false;
  }
}
</script>
