import { computed, reactive, ref } from 'vue';
import { api } from '../api/client';

export function useImportActions({ t, toast, loadNodes, loadSubscriptions }) {
  const importing = ref(false);
  const importVisible = ref(false);
  const importForm = reactive({ path: '', importType: 'universal', importUrl: '' });
  const importResult = ref(null);

  const importResultTitle = computed(() => {
    if (!importResult.value) return '';
    const d = importResult.value;
    return `${t('import.imported')}: ${d.importedCount || 0} · ${t('import.updated')}: ${d.updatedCount || 0} · ${t('import.failed')}: ${d.failedCount || 0}`;
  });

  const importResultDetail = computed(() => {
    if (!importResult.value) return '';
    return `${t('import.total_after')}: ${importResult.value.totalAfterImport || 0}`;
  });

  function openImport(path, importType) {
    importForm.path = path;
    importForm.importType = importType || 'universal';
    importForm.importUrl = '';
    importResult.value = null;
    importVisible.value = true;
  }

  async function importNodes() {
    if (!importForm.importUrl.trim()) {
      toast('warning', t('import.url_required'));
      return;
    }
    try {
      new URL(importForm.importUrl.trim());
    } catch {
      toast('warning', t('import.invalid_url'));
      return;
    }
    importing.value = true;
    try {
      const result = await api.importNodes(importForm.path, importForm.importUrl.trim(), importForm.importType);
      importResult.value = result.data || {};
      toast('success', t('import.imported') + ': ' + (result.data?.importedCount || 0));
      await loadNodes(importForm.path);
      await loadSubscriptions();
    } catch (error) {
      toast('error', error.message);
    } finally {
      importing.value = false;
    }
  }

  return {
    importing,
    importVisible,
    importForm,
    importResult,
    importResultTitle,
    importResultDetail,
    openImport,
    importNodes
  };
}
