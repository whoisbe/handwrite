<script lang="ts">
  import CustomTooltip from './ui/CustomTooltip.svelte';

  let {
    fontFamily,
    coverage,
    onCharacterClick,
    currentChar
  } = $props<{
    fontFamily: string;
    coverage: Record<string, boolean>;
    onCharacterClick?: (char: string) => void;
    currentChar?: string;
  }>();

  const KEYBOARD_LAYOUT = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  ];

  let coveragePercentage = $derived.by(() => {
    const values = Object.values(coverage);
    if (values.length === 0) return 0;
    const covered = values.filter(Boolean).length;
    return Math.round((covered / values.length) * 100);
  });
</script>

<div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
  <div style="font-size: 0.75rem; color: #4b5563; font-weight: 500; text-align: center;">
    {coveragePercentage}% coverage
  </div>

  <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
    {#each KEYBOARD_LAYOUT as row}
      <div style="display: flex; flex-direction: row; gap: 4px; justify-content: center; flex-wrap: wrap; width: 100%;">
        {#each row as char}
          {@const isAvailable = coverage[char] ?? false}
          {@const isActive = currentChar === char}
          
          <CustomTooltip content={`${char}: ${isAvailable ? 'Available' : 'Not available'}`}>
            <button
              onclick={() => onCharacterClick?.(char)}
              style="width: 36px; height: 36px; min-width: 36px; flex-shrink: 0; border-radius: 4px; font-size: 0.875rem; font-weight: 500; transition: all 0.2s ease-in-out; border: {isActive ? '3px solid #ff1493' : '1px solid'}; display: flex; align-items: center; justify-content: center; box-shadow: {isActive ? '0 0 0 3px rgba(255, 20, 147, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}; user-select: none; cursor: {onCharacterClick ? 'pointer' : 'default'}; background: {isAvailable ? 'linear-gradient(to bottom right, #34d399, #10b981)' : '#f3f4f6'}; color: {isAvailable ? '#ffffff' : '#6b7280'}; border-color: {isActive ? '#ff1493' : (isAvailable ? '#059669' : '#d1d5db')};"
              onmouseenter={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  if (isAvailable) {
                      target.style.background = 'linear-gradient(to bottom right, #10b981, #059669)';
                  } else {
                      target.style.background = '#e5e7eb';
                  }
              }}
              onmouseleave={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  if (isAvailable) {
                      target.style.background = 'linear-gradient(to bottom right, #34d399, #10b981)';
                  } else {
                      target.style.background = '#f3f4f6';
                  }
              }}
              onmousedown={(e) => {
                  if (onCharacterClick) {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
                  }
              }}
              onmouseup={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
              aria-label={`Character ${char}: ${isAvailable ? 'Available' : 'Not available'}`}
            >
              {char}
            </button>
          </CustomTooltip>
        {/each}
      </div>
    {/each}
  </div>
</div>
