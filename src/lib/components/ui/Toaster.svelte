<script lang="ts">
  import { toasts } from '$lib/utils/toast';

  let { position = 'top-right', richColors = false } = $props<{
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    richColors?: boolean;
  }>();

  const positionClass = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const typeClasses = (type: string) => {
    if (!richColors) return 'bg-gray-900 text-white';
    if (type === 'success') return 'bg-emerald-600 text-white';
    if (type === 'error') return 'bg-rose-600 text-white';
    if (type === 'loading') return 'bg-slate-700 text-white';
    return 'bg-sky-600 text-white';
  };
</script>

<div class={`fixed z-50 flex flex-col gap-2 ${positionClass()}`}>
  {#each $toasts as toastItem (toastItem.id)}
    <div
      class={`min-w-[220px] max-w-[360px] rounded-md px-3 py-2 text-sm shadow-lg ${typeClasses(toastItem.type)}`}
      role="status"
      aria-live="polite"
    >
      {toastItem.message}
    </div>
  {/each}
</div>
