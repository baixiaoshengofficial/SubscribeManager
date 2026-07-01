import { reactive, ref } from 'vue';
import { api } from '../api/client';

export function useSubconverterActions({ t, toast, submitting, loadSubscriptions }) {
  const previewing = ref(false);
  const subconverterVisible = ref(false);
  const subconverterForm = reactive({ path: '', subconvert_url: '', custom_template: '', use_default_template: false });
  const clashPreviewVisible = ref(false);
  const clashPreview = ref('');

  function formatPreviewSize(length) {
    if (length < 1024) return t('subconverter.preview_size_bytes', { size: length });
    if (length < 1024 * 1024) return t('subconverter.preview_size_kb', { size: (length / 1024).toFixed(1) });
    return t('subconverter.preview_size_mb', { size: (length / (1024 * 1024)).toFixed(2) });
  }

  function downloadClashPreview() {
    if (!clashPreview.value) return;
    const blob = new Blob([clashPreview.value], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${subconverterForm.path || 'clash'}.yaml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openSubconverter(sub) {
    subconverterForm.path = sub.path;
    subconverterForm.subconvert_url = sub.subconvert_url || '';
    subconverterForm.custom_template = sub.custom_template || '';
    subconverterForm.use_default_template = sub.use_default_template === 1 || sub.use_default_template === true;
    subconverterVisible.value = true;
  }

  function onSubconverterInput() {
  }

  async function saveSubconverter() {
    submitting.value = true;
    try {
      await api.saveSubconverter(subconverterForm.path, {
        subconvert_url: subconverterForm.subconvert_url.trim() || null,
        custom_template: subconverterForm.custom_template.trim() || null,
        use_default_template: subconverterForm.use_default_template
      });
      toast('success', t('subconverter.updated'));
      subconverterVisible.value = false;
      await loadSubscriptions();
    } catch (error) {
      toast('error', error.message);
    } finally {
      submitting.value = false;
    }
  }

  async function previewClash() {
    previewing.value = true;
    try {
      const result = await api.generateClash({
        subscriptionPath: subconverterForm.path,
        subconvertUrl: subconverterForm.subconvert_url.trim() || undefined,
        templateUrl: subconverterForm.custom_template.trim() || undefined
      });
      clashPreview.value = result.data?.config || '';
      clashPreviewVisible.value = true;
    } catch (error) {
      toast('error', error.message);
    } finally {
      previewing.value = false;
    }
  }

  return {
    previewing,
    subconverterVisible,
    subconverterForm,
    clashPreviewVisible,
    clashPreview,
    formatPreviewSize,
    downloadClashPreview,
    openSubconverter,
    onSubconverterInput,
    saveSubconverter,
    previewClash
  };
}
