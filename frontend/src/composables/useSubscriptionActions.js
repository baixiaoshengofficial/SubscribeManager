import { reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { api } from '../api/client';

export function useSubscriptionActions({ t, toast, submitting, subscriptions, expandedPaths, loadSubscriptions }) {
  const addSubVisible = ref(false);
  const editSubVisible = ref(false);
  const addSubFormRef = ref();
  const editSubFormRef = ref();
  const addSubForm = reactive({ name: '', path: '' });
  const editSubForm = reactive({ name: '', path: '', originalPath: '' });

  const subRules = {
    name: [{ required: true, message: () => t('subscription.name_required'), trigger: 'blur' }],
    path: [
      { required: true, message: () => t('subscription.path_invalid'), trigger: 'blur' },
      { pattern: /^[a-z0-9-]{5,50}$/, message: () => t('subscription.path_invalid'), trigger: 'blur' }
    ]
  };

  function openAddSubscription() {
    addSubForm.name = '';
    addSubForm.path = '';
    addSubVisible.value = true;
  }

  async function createSubscription() {
    try {
      await addSubFormRef.value?.validate();
    } catch {
      return;
    }
    submitting.value = true;
    try {
      await api.createSubscription({ name: addSubForm.name.trim(), path: addSubForm.path.trim() });
      toast('success', t('subscription.created'));
      addSubVisible.value = false;
      await loadSubscriptions();
    } catch (error) {
      toast('error', error.message);
    } finally {
      submitting.value = false;
    }
  }

  function openEditSubscription(sub) {
    editSubForm.originalPath = sub.path;
    editSubForm.name = sub.name;
    editSubForm.path = sub.path;
    editSubVisible.value = true;
  }

  async function updateSubscription() {
    try {
      await editSubFormRef.value?.validate();
    } catch {
      return;
    }
    submitting.value = true;
    try {
      const existing = subscriptions.value.find((s) => s.path === editSubForm.originalPath);
      await api.updateSubscription(editSubForm.originalPath, {
        name: editSubForm.name.trim(),
        path: editSubForm.path.trim(),
        subconvert_url: existing?.subconvert_url || null,
        custom_template: existing?.custom_template || null,
        use_default_template: Boolean(existing?.use_default_template)
      });
      toast('success', t('subscription.updated'));
      editSubVisible.value = false;
      if (editSubForm.path.trim() !== editSubForm.originalPath) {
        expandedPaths.value = expandedPaths.value.map((p) => (p === editSubForm.originalPath ? editSubForm.path.trim() : p));
      }
      await loadSubscriptions();
    } catch (error) {
      toast('error', error.message);
    } finally {
      submitting.value = false;
    }
  }

  async function confirmDeleteSubscription() {
    try {
      await ElMessageBox.confirm(t('subscription.delete_confirm'), t('common.confirm'), { type: 'warning' });
    } catch {
      return;
    }
    submitting.value = true;
    try {
      await api.deleteSubscription(editSubForm.originalPath);
      toast('success', t('subscription.deleted'));
      editSubVisible.value = false;
      expandedPaths.value = expandedPaths.value.filter((p) => p !== editSubForm.originalPath);
      await loadSubscriptions();
    } catch (error) {
      toast('error', error.message);
    } finally {
      submitting.value = false;
    }
  }

  return {
    addSubVisible,
    editSubVisible,
    addSubFormRef,
    editSubFormRef,
    addSubForm,
    editSubForm,
    subRules,
    openAddSubscription,
    createSubscription,
    openEditSubscription,
    updateSubscription,
    confirmDeleteSubscription
  };
}
