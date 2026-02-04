<script lang="ts">
  let { children, content } = $props<{ children: any; content: any }>();
  let isVisible = $state(false);
</script>

<div
  class="relative inline-block"
  onmouseenter={() => isVisible = true}
  onmouseleave={() => isVisible = false}
  onfocus={() => isVisible = true}
  onblur={() => isVisible = false}
  role="tooltip"
  tabindex="0"
>
  {@render children()}
  {#if isVisible}
    <div class="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-sm opacity-100 transition-opacity bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 whitespace-nowrap pointer-events-none">
      {content}
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  {/if}
</div>
