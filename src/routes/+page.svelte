<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Toaster from '$lib/components/ui/Toaster.svelte';
  import { toast } from '$lib/utils/toast';
  import { Undo, Eraser, StepForward, Check, Play, Pause, Moon, Palette, Sun } from 'lucide-svelte';
  
  import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
  import CustomSlider from '$lib/components/ui/CustomSlider.svelte';
  import StrokeEditorCanvas from '$lib/components/StrokeEditorCanvas.svelte';
  import AnimationPlayerCanvas from '$lib/components/AnimationPlayerCanvas.svelte';
  
  import type { Stroke } from '$lib/types/stroke';
  import { generateCatmullRomSpline, getCumulativeDistances, type Point } from '$lib/utils/spline';

  let selectedFont = $state("Gloria Hallelujah");
  let inputText = $state("A");
  let currentCharIndex = $state(0);
  let characterStrokes = $state<Record<number, Stroke[]>>({});
  let currentStroke = $state<Point[]>([]);
  let isPlaying = $state(false);
  let speedMultiplier = $state(1);
  let invertColors = $state(false);
  let textColor = $state<string | null>(null);
  
  let colorPickerInput: HTMLInputElement;

  const fonts = [
    "Gloria Hallelujah",
    "Permanent Marker",
    "Indie Flower",
    "Caveat",
    "Dancing Script",
    "Nanum Brush Script"
  ];

  let currentChar = $derived(inputText[currentCharIndex] || "");
  let strokes = $derived(characterStrokes[currentCharIndex] || []);

  function handleAddDot(point: Point) {
    currentStroke = [...currentStroke, point];
  }

  function completeCurrentStroke() {
    if (currentStroke.length < 2) {
      return null;
    }

    const splinePoints = generateCatmullRomSpline(currentStroke);
    const cumulativeDistances = getCumulativeDistances(splinePoints);

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      dots: [...currentStroke],
      splinePoints,
      cumulativeDistances,
      order: strokes.length
    };

    characterStrokes = {
      ...characterStrokes,
      [currentCharIndex]: [...(characterStrokes[currentCharIndex] || []), newStroke]
    };
    currentStroke = [];
    return newStroke;
  }

  function handleDotClick(dotIndex: number) {
    if (currentStroke.length >= 2) {
      completeCurrentStroke();
    }
  }

  function handleUndo() {
    if (currentStroke.length > 0) {
      currentStroke = currentStroke.slice(0, -1);
    } else if (strokes.length > 0) {
      const lastStroke = strokes[strokes.length - 1];
      const newStrokes = strokes.slice(0, -1);
      
      characterStrokes = {
        ...characterStrokes,
        [currentCharIndex]: newStrokes
      };
      
      currentStroke = lastStroke.dots;
    }
  }

  function handleClearCurrent() {
    currentStroke = [];
    characterStrokes = {
      ...characterStrokes,
      [currentCharIndex]: []
    };
    isPlaying = false;
  }

  function handleStepForward() {
    if (currentStroke.length >= 2) {
      completeCurrentStroke();
    }

    if (currentCharIndex < inputText.length - 1) {
      currentCharIndex += 1;
      currentStroke = [];
      isPlaying = false;
    }
  }

  function handleCheck() {
    if (currentStroke.length >= 2) {
      completeCurrentStroke();
    }
    
    currentStroke = [];
    isPlaying = false;
    toast.success(`Strokes recorded for "${currentChar}"`);
  }

  function handlePlay() {
    if (strokes.length === 0) {
      toast.info("Please create at least one stroke first");
      return;
    }
    isPlaying = !isPlaying;
  }

  function handlePlaybackComplete() {
    isPlaying = false;
  }

  function handleTextChange(rawText: string) {
    const sanitizedText = rawText;
    const previousText = inputText;
    inputText = sanitizedText;
    currentCharIndex = 0;
    currentStroke = [];
    isPlaying = false;

    if (!sanitizedText) {
      characterStrokes = {};
      return;
    }

    const next: Record<number, Stroke[]> = {};
    for (let i = 0; i < sanitizedText.length; i++) {
      const prevChar = previousText[i];
      const nextChar = sanitizedText[i];
      if (characterStrokes[i]?.length && prevChar === nextChar) {
        next[i] = characterStrokes[i];
      }
    }
    characterStrokes = next;
  }
</script>

<div class="bg-white min-h-screen p-6">
  <Toaster position="top-right" richColors />
  <!-- Header -->
  <header class="text-center mb-8">
    <h1 class="font-['Nanum_Brush_Script',sans-serif] text-[40px] text-black">
      Handwrite
    </h1>
  </header>

  <!-- Input Controls -->
  <div class="mb-8 space-y-6" style="max-width: 100%;">
    <!-- Font Selector -->
    <div style="display: flex; flex-direction: row; gap: 16px; align-items: flex-start; flex-wrap: wrap;">
      <div class="space-y-2" style="flex: 0 0 auto; min-width: 240px;">
        <label for="font-select" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Font</label>
        <CustomSelect
          value={selectedFont}
          onValueChange={(val) => selectedFont = val}
          options={fonts.map(f => ({ label: f, value: f }))}
          placeholder="Select a font"
          className="w-full"
        />
      </div>
    </div>

    <!-- Text Input -->
    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <label for="text-input" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Text</label>
        <span class="text-xs text-gray-500">{inputText.length}/12</span>
      </div>
      <input
        id="text-input"
        type="text"
        value={inputText}
        oninput={(e) => {
          const target = e.target as HTMLInputElement;
          const newValue = target.value.slice(0, 12);
          handleTextChange(newValue);
        }}
        placeholder="Enter text to animate"
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        maxlength={12}
      />
    </div>

    <!-- Speed Control -->
    <div class="space-y-2">
      <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Animation Speed</label>
      <div class="flex items-center gap-3">
        <CustomSlider
          value={[speedMultiplier]}
          onValueChange={(val) => speedMultiplier = val[0]}
          min={1}
          max={4}
          step={0.5}
          className="w-full"
        />
        <span class="text-sm font-semibold text-gray-900 w-10">{speedMultiplier.toFixed(1)}x</span>
      </div>
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1440px]">
    <!-- Canvas Section - Stroke Editor -->
    <div class="bg-[#eeeeee] rounded-lg overflow-hidden relative h-[400px]">
      <!-- Control Buttons -->
      <div class="absolute top-4 right-4 flex gap-3 z-10">
        <button
          onclick={handleUndo}
          aria-label="Undo last dot or stroke"
          class="bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]"
        >
          <div class="p-[16px] size-[56px]">
            <div class="size-[24px] text-[#4F378A]">
              <Undo class="w-full h-full" />
            </div>
          </div>
        </button>

        <button
          onclick={handleClearCurrent}
          aria-label="Clear all strokes for current character"
          class="bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]"
        >
          <div class="p-[16px] size-[56px]">
            <div class="size-[24px] text-[#4F378A]">
              <Eraser class="w-full h-full" />
            </div>
          </div>
        </button>

        <button
          onclick={handleStepForward}
          aria-label="Complete character and move to next"
          disabled={currentCharIndex >= inputText.length - 1}
          class={`bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow ${currentCharIndex >= inputText.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]'}`}
        >
          <div class="p-[16px] size-[56px]">
            <div class="size-[24px] text-[#4F378A]">
               <StepForward class="w-full h-full" />
            </div>
          </div>
        </button>

        <button
          onclick={handleCheck}
          aria-label="Confirm strokes"
          class="bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]"
        >
          <div class="p-[16px] size-[56px]">
            <div class="size-[24px] text-[#4F378A]">
              <Check class="w-full h-full" />
            </div>
          </div>
        </button>
      </div>

      <!-- Character and Stroke Info -->
      <div class="absolute top-4 left-4 z-10 bg-white/90 px-3 py-2 rounded-lg text-sm">
        <div class="font-semibold">Character: {currentChar || '—'} ({currentCharIndex + 1}/{inputText.length})</div>
        <div>Strokes: {strokes.length}</div>
        <div>Current dots: {currentStroke.length}</div>
      </div>

      <!-- Canvas Display -->
      <div class="absolute inset-0">
        <StrokeEditorCanvas
          text={currentChar}
          fontFamily={selectedFont}
          strokes={strokes}
          currentStroke={currentStroke}
          onAddDot={handleAddDot}
          onDotClick={handleDotClick}
          width={800}
          height={400}
        />
      </div>
    </div>

    <!-- Animation Player Section -->
    <div class="bg-[#eeeeee] rounded-lg overflow-hidden relative h-[400px]">
      <!-- Control Buttons -->
      <div class="absolute top-4 left-4 z-10 flex gap-3">
        <button
          onclick={handlePlay}
          aria-label={isPlaying ? "Pause animation" : "Play animation"}
          class="bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]"
        >
          <div class="p-[16px] size-[56px]">
            <div class="size-[24px] text-[#4F378A]">
              {#if isPlaying}
                <Pause class="w-full h-full" />
              {:else}
                <Play class="w-full h-full" />
              {/if}
            </div>
          </div>
        </button>

        <button
          onclick={() => invertColors = !invertColors}
          aria-label={invertColors ? "Disable color inversion" : "Enable color inversion"}
          class="bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]"
        >
          <div class="p-[16px] size-[56px]">
            <div class="size-[24px] text-[#4F378A]">
              {#if invertColors}
                 <Sun class="w-full h-full" />
              {:else}
                 <Moon class="w-full h-full" />
              {/if}
            </div>
          </div>
        </button>

        <div class="relative">
          <input
            type="color"
            bind:this={colorPickerInput}
            value={textColor || (invertColors ? '#ffffff' : '#000000')}
            oninput={(e) => {
               const target = e.target as HTMLInputElement;
               textColor = target.value || null;
            }}
            class="sr-only"
            aria-label="Pick text color"
            style="position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;"
          />
          <button
            onclick={() => colorPickerInput?.click()}
            aria-label="Pick text color"
            class="bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]"
          >
            <div class="p-[16px] size-[56px]">
              <div class="size-[24px] text-[#4F378A]">
                <Palette class="w-full h-full" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Animation Display -->
      <div class="absolute inset-0">
        <AnimationPlayerCanvas
          text={inputText}
          fontFamily={selectedFont}
          strokes={strokes}
          characterStrokes={characterStrokes}
          isPlaying={isPlaying}
          onPlaybackComplete={handlePlaybackComplete}
          strokeDuration={800}
          strokeGap={150}
          characterGap={200}
          speedMultiplier={speedMultiplier}
          easing="easeInOut"
          width={800}
          height={400}
          invertColors={invertColors}
          textColor={textColor}
        />
      </div>
    </div>
  </div>

  <!-- Instructions -->
  <div class="mt-8 max-w-[1440px]">
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-3">How to Use</h2>
      <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>Click on the canvas to place dots along your desired writing path (minimum 2 dots per stroke)</li>
        <li>Double-click or click an existing dot to complete the current stroke and start a new one</li>
        <li><strong>↶ Undo</strong> - Remove last dot or go back to previous stroke for editing</li>
        <li><strong>Eraser</strong> - Reset all strokes for the current character</li>
        <li><strong>Skip</strong> - Save current character and move to next character</li>
        <li><strong>Check</strong> - Finish recording strokes (in-memory)</li>
        <li><strong>Play</strong> - Preview the animation for current character</li>
      </ol>
    </div>
  </div>
</div>
