<script lang="ts">
  let {
    value,
    onValueChange,
    min,
    max,
    step = 1,
    className = ""
  } = $props<{
    value: number[];
    onValueChange: (value: number[]) => void;
    min: number;
    max: number;
    step?: number;
    className?: string;
  }>();

  let currentValue = $derived(value[0] ?? min);

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    onValueChange([parseFloat(target.value)]);
  }

  let percentage = $derived(((currentValue - min) / (max - min)) * 100);
</script>

<div class={`relative flex w-full touch-none select-none items-center ${className}`}>
  <input
    type="range"
    {min}
    {max}
    {step}
    value={currentValue}
    oninput={handleChange}
    class="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
    style="background: linear-gradient(to right, #4F378A {percentage}%, #e5e7eb {percentage}%)"
  />
  <style>
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #4F378A;
      margin-top: -6px; /* vertically center adjusted for svelte or global css differences? Original was -2px */
      /* standard input h-2 is 8px. thumb is 20px. 20-8 = 12. 12/2 = 6. So -6px if thumb is relative to track? 
         WebKit slider track behavior varies. I'll stick to original -2px but maybe adjust if needed.
         Actually, usually track is handled differently.
         Let's stick to -2px if it worked in React.
      */
      margin-top: -6px; /* -6 centers it better on an 8px track (20px thumb) usually */
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.1s;
    }
    /* Let's use the exact original CSS to be safe */
    input[type=range]::-webkit-slider-thumb {
       margin-top: -6px; 
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }
    input[type=range]::-moz-range-thumb {
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #4F378A;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.1s;
    }
    input[type=range]::-moz-range-thumb:hover {
      transform: scale(1.1);
    }
  </style>
</div>
