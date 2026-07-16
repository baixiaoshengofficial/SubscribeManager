import { computed, reactive, ref } from 'vue';
import { api } from '../api/client';

export function useImportActions({ t, toast, loadNodes, loadSubscriptions }) {
  const importing = ref(false);
  const importVisible = ref(false);
  const importForm = reactive({ path: '', importUrl: '' });
  const importResult = ref(null);

  const importResultTitle = computed(() => {
    if (!importResult.value) return '';
    const d = importResult.value;
    return `${t('import.imported')}: ${d.importedCount || 0} · ${t('import.updated')}: ${d.updatedCount || 0} · ${t('import.skipped')}: ${d.skippedCount || 0} · ${t('import.failed')}: ${d.failedCount || 0}`;
  });

  const importResultDetail = computed(() => {
    if (!importResult.value) return '';
    const parts = [
      `${t('import.total_after')}: ${importResult.value.totalAfterImport || 0}`
    ];
    if (importResult.value.sourceCount) {
      parts.push(`${t('import.source_count')}: ${importResult.value.sourceCount}`);
    }
    if (importResult.value.failedSourceCount) {
      parts.push(`${t('import.source_failed')}: ${importResult.value.failedSourceCount}`);
    }
    return parts.join(' · ');
  });

  function openImport(path) {
    importForm.path = path;
    importForm.importUrl = '';
    importResult.value = null;
    importVisible.value = true;
  }

  async function importNodes() {
    const importUrls = importForm.importUrl
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (!importUrls.length) {
      toast('warning', t('import.url_required'));
      return;
    }
    for (const url of importUrls) {
      try {
        new URL(url);
      } catch {
        toast('warning', t('import.invalid_url'));
        return;
      }
    }
    importing.value = true;
    try {
      const result = await api.importNodes(importForm.path, importUrls);
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
