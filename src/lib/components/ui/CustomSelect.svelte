<script lang="ts">
  import { onMount } from 'svelte';
  import { ChevronDown, Check } from 'lucide-svelte';

  let {
    value,
    onValueChange,
    options,
    placeholder = "Select...",
    className = ""
  } = $props<{
    value: string;
    onValueChange: (value: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
    className?: string;
  }>();

  let isOpen = $state(false);
  let container: HTMLDivElement;

  function handleClickOutside(event: MouseEvent) {
    if (container && !container.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  let selectedLabel = $derived(options.find(opt => opt.value === value)?.label || placeholder);
</script>

<div class={`relative ${className}`} bind:this={container}>
  <button
    type="button"
    onclick={() => isOpen = !isOpen}
    class="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span class="truncate">{selectedLabel}</span>
    <ChevronDown class="h-4 w-4 opacity-50" />
  </button>

  {#if isOpen}
    <div class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white text-gray-950 shadow-md animate-in fade-in-0 zoom-in-95">
      <div class="p-1">
        {#each options as option (option.value)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
          <div
            class={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 hover:text-gray-900 ${value === option.value ? 'bg-gray-100' : ''}`}
            onclick={() => {
              onValueChange(option.value);
              isOpen = false;
            }}
            role="option"
            aria-selected={value === option.value}
            tabindex="0"
          >
            {#if value === option.value}
              <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <Check class="h-4 w-4" />
              </span>
            {/if}
            <span class="truncate">{option.label}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
