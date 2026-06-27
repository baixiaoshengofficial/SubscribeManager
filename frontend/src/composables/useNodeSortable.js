import { nextTick, onBeforeUnmount } from 'vue';
import Sortable from 'sortablejs';

/**
 * 节点列表拖拽排序（表格 tbody / 卡片网格）
 */
export function useNodeSortable({ getExpanded, getViewMode, getBatchMode, getTableRef, getCardGridRef, onReorder }) {
  const instances = {};

  function destroy(path) {
    if (instances[path]) {
      instances[path].destroy();
      delete instances[path];
    }
  }

  function destroyAll() {
    Object.keys(instances).forEach(destroy);
  }

  async function refresh(path) {
    await nextTick();
    destroy(path);

    if (!getExpanded(path) || getBatchMode(path)) return;

    const view = getViewMode(path);
    if (view === 'table') {
      const table = getTableRef(path);
      const tbody = table?.$el?.querySelector('.el-table__body-wrapper tbody');
      if (!tbody) return;

      instances[path] = Sortable.create(tbody, {
        animation: 160,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: (evt) => onReorder(path, evt.oldIndex, evt.newIndex)
      });
      return;
    }

    const grid = getCardGridRef(path);
    if (!grid) return;

    instances[path] = Sortable.create(grid, {
      animation: 160,
      draggable: '.node-card',
      handle: '.node-card-drag',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: (evt) => onReorder(path, evt.oldIndex, evt.newIndex)
    });
  }

  onBeforeUnmount(destroyAll);

  return { refresh, destroy, destroyAll };
}
