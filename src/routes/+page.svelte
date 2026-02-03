<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Toaster, toast } from 'sonner';
  import { Undo, Eraser, StepForward, Check, Play, Pause, Moon, Palette } from 'lucide-svelte';
  
  import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
  import CustomSlider from '$lib/components/ui/CustomSlider.svelte';
  import StrokeEditorCanvas from '$lib/components/StrokeEditorCanvas.svelte';
  import AnimationPlayerCanvas from '$lib/components/AnimationPlayerCanvas.svelte';
  import FontCoverageHeatmap from '$lib/components/FontCoverageHeatmap.svelte';
  
  import type { Stroke } from '$lib/types/stroke';
  import { generateCatmullRomSpline, getCumulativeDistances, type Point } from '$lib/utils/spline';
  import {
    downloadJSON,
    uploadJSON,
    persistGlyphStrokes,
    loadStrokesForGlyph,
    getFontCoverage,
    getAllStrokesForFont,
    clearStrokesForFont
  } from '$lib/utils/persistence';

  let selectedFont = $state("Gloria Hallelujah");
  let inputText = $state("A");
  let currentCharIndex = $state(0);
  let characterStrokes = $state<Record<number, Stroke[]>>({});
  let currentStroke = $state<Point[]>([]);
  let isPlaying = $state(false);
  let speedMultiplier = $state(1);
  let invertColors = $state(false);
  let textColor = $state<string | null>(null);
  let savedData = $state<any>(null);
  let coverageRefreshTrigger = $state(0);
  let isImporting = $state(false);
  
  let fileInput: HTMLInputElement;
  let colorPickerInput: HTMLInputElement;

  const fonts = [
    "Gloria Hallelujah",
    "Permanent Marker",
    "Indie Flower",
    "Caveat",
    "Dancing Script",
    "Nanum Brush Script"
  ];

  let fontCoverage = $derived.by(() => {
    // Dependency on coverageRefreshTrigger and selectedFont
    const _ = coverageRefreshTrigger; 
    return getFontCoverage(selectedFont);
  });

  let hasExportableStrokes = $derived.by(() => {
     const _ = coverageRefreshTrigger;
     // Access localStorage only in browser
     if (typeof window === 'undefined') return false;
     return Object.keys(getAllStrokesForFont(selectedFont)).length > 0;
  });

  let currentChar = $derived(inputText[currentCharIndex] || "");
  let strokes = $derived(characterStrokes[currentCharIndex] || []);

  async function hydratePersistedStrokes(text: string, fontName: string) {
    if (!text) {
      characterStrokes = {};
      return;
    }

    const chars = Array.from(text);
    const results = chars.map((char, index) => {
      // Don't overwrite if we have strokes in memory?
      // React code checked `characterStrokesRef.current[index]`.
      // Here we can check `characterStrokes[index]`.
      if (characterStrokes[index]?.length) {
        return null;
      }
      const persisted = loadStrokesForGlyph(fontName, char);
      return persisted?.length ? { index, strokes: persisted } : null;
    });

    // Update state
    let next = { ...characterStrokes };
    let mutated = false;
    results.forEach(result => {
      if (!result) return;
      if (!next[result.index]?.length) {
        next[result.index] = result.strokes;
        mutated = true;
      }
    });
    
    if (mutated) {
      characterStrokes = next;
    }
  }

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

  async function handleCheck() {
    let workingStrokes = { ...characterStrokes };

    if (currentStroke.length >= 2) {
      const flushedStroke = completeCurrentStroke();
      if (flushedStroke) {
        workingStrokes[currentCharIndex] = [...(workingStrokes[currentCharIndex] || []), flushedStroke];
      }
    }

    const glyphEntries = Object.entries(workingStrokes);
    if (glyphEntries.length === 0) {
      toast.info("No strokes to save yet.");
      return;
    }

    let localSaveSuccess = true;
    const locallyEditedChars: string[] = [];

    glyphEntries.forEach(([charIndex, charStrokes]) => {
      const glyphChar = inputText[parseInt(charIndex, 10)];
      if (glyphChar && charStrokes?.length) {
        persistGlyphStrokes(selectedFont, glyphChar, charStrokes);
        locallyEditedChars.push(glyphChar);
      }
    });

    if (locallyEditedChars.length > 0) {
      console.log(`✓ ${locallyEditedChars.length} character(s) saved locally`);
    }

    const allGlyphData = glyphEntries.map(([charIndex, charStrokes]) => ({
      char: inputText[parseInt(charIndex, 10)],
      fontFamily: selectedFont,
      strokes: charStrokes.map(s => ({
        id: s.id,
        dots: s.dots,
        order: s.order
      }))
    }));

    savedData = {
      text: inputText,
      fontFamily: selectedFont,
      glyphs: allGlyphData
    };

    console.log("Saved strokes:", savedData);
    toast.success(`Saved strokes for "${inputText}" locally!`);
    coverageRefreshTrigger += 1;

    await hydratePersistedStrokes(inputText, selectedFont);
    currentStroke = [];
    currentCharIndex = 0;
    isPlaying = false;
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

  async function handleCharacterSelect(selectedChar: string) {
    currentStroke = [];

    const existingIndex = inputText.indexOf(selectedChar);

    if (existingIndex !== -1) {
      currentCharIndex = existingIndex;
    } else {
      if (inputText.length < 6) {
        const newText = inputText + selectedChar;
        inputText = newText;
        currentCharIndex = newText.length - 1;
        await hydratePersistedStrokes(newText, selectedFont);
      } else {
        const chars = Array.from(inputText);
        const oldChar = chars[currentCharIndex];
        chars[currentCharIndex] = selectedChar;
        const newText = chars.join('');
        inputText = newText;

        if (oldChar !== selectedChar) {
          const next = { ...characterStrokes };
          delete next[currentCharIndex];
          characterStrokes = next;
        }

        await hydratePersistedStrokes(newText, selectedFont);
      }
    }
    isPlaying = false;
  }

  function handleExport() {
    const allStrokes = getAllStrokesForFont(selectedFont);
    const charCount = Object.keys(allStrokes).length;

    if (charCount === 0) {
      toast.info("No strokes to export for this font");
      return;
    }

    const exportData = {
      version: 1,
      fontFamily: selectedFont,
      glyphs: Object.entries(allStrokes).map(([char, strokes]) => ({
        char,
        strokes: strokes.map(s => ({
          id: s.id,
          dots: s.dots,
          order: s.order
        }))
      })),
      exportDate: new Date().toISOString(),
      exportedBy: "handwrite-app"
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${selectedFont.replace(/\s+/g, '-')}-strokes-${timestamp}.json`;

    downloadJSON(exportData, filename);
    toast.success(`Exported ${charCount} character${charCount > 1 ? 's' : ''} for ${selectedFont}`);
  }

  function handleClearFontStrokes() {
    if (!hasExportableStrokes) return;

    if (window.confirm(`Are you sure you want to clear ALL strokes for "${selectedFont}"? This cannot be undone.`)) {
      clearStrokesForFont(selectedFont);
      characterStrokes = {};
      currentStroke = [];
      currentCharIndex = 0;
      isPlaying = false;
      coverageRefreshTrigger += 1;
      toast.success(`Cleared all strokes for ${selectedFont}`);
    }
  }

  async function handleImportFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isImporting = true;
    const loadingToast = toast.loading("Processing font file...");

    try {
      const data = await uploadJSON(file);
      
      if (!data.version || !data.fontFamily || !Array.isArray(data.glyphs)) {
        toast.dismiss(loadingToast);
        toast.error("Invalid stroke data file format");
        return;
      }

      const importedFont = data.fontFamily;
      if (!fonts.includes(importedFont)) {
        toast.dismiss(loadingToast);
        toast.error(`Font "${importedFont}" is not available in this app`);
        return;
      }

      toast.dismiss(loadingToast);
      const totalGlyphs = data.glyphs.length;
      toast.info(`Importing ${totalGlyphs} character${totalGlyphs > 1 ? 's' : ''}...`);

      let importedCount = 0;
      const batchSize = 10;
      
      for (let i = 0; i < data.glyphs.length; i += batchSize) {
        const batch = data.glyphs.slice(i, i + batchSize);
        for (const glyph of batch) {
          if (!glyph.char || !Array.isArray(glyph.strokes)) continue;

          const reconstructedStrokes: Stroke[] = glyph.strokes.map((s: any) => {
            const splinePoints = generateCatmullRomSpline(s.dots);
            const cumulativeDistances = getCumulativeDistances(splinePoints);
            return {
              id: s.id,
              dots: s.dots,
              splinePoints,
              cumulativeDistances,
              order: s.order
            };
          });

          persistGlyphStrokes(importedFont, glyph.char, reconstructedStrokes);
          importedCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      toast.success(`Successfully imported ${importedCount} character${importedCount > 1 ? 's' : ''}!`);
      coverageRefreshTrigger += 1;

    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : "Failed to read file");
    } finally {
      isImporting = false;
      if (fileInput) fileInput.value = '';
    }
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
    
    void hydratePersistedStrokes(sanitizedText, selectedFont);
  }

  $effect(() => {
    // Watch selectedFont
    const _ = selectedFont;
    // When font changes, hydrate
    const hydrate = async () => {
      if (!inputText) return;
      characterStrokes = {};
      currentStroke = [];
      currentCharIndex = 0;
      await hydratePersistedStrokes(inputText, selectedFont);
    };
    hydrate();
  });

  onMount(() => {
    coverageRefreshTrigger += 1;
    void hydratePersistedStrokes(inputText, selectedFont);
  });
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
    <!-- Font Selector with Heatmap -->
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

        <!-- Export/Import Controls -->
        <div class="flex gap-2 pt-2">
          <button
            onclick={handleExport}
            disabled={!hasExportableStrokes}
            class={`flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ${!hasExportableStrokes ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Export
          </button>
          <button
            onclick={handleClearFontStrokes}
            disabled={!hasExportableStrokes}
            class={`flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-red-50 hover:text-red-600 hover:border-red-200 h-9 px-3 ${!hasExportableStrokes ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Clear all strokes for this font"
          >
            Clear
          </button>
          <button
            onclick={() => fileInput?.click()}
            disabled={isImporting}
            class={`flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isImporting ? 'Processing...' : 'Import'}
          </button>
          <input
            bind:this={fileInput}
            type="file"
            accept=".json"
            onchange={handleImportFileSelect}
            style="display: none;"
          />
        </div>
      </div>
      <div style="flex: 0 0 auto; min-width: 1080px;">
        <FontCoverageHeatmap
          fontFamily={selectedFont}
          coverage={fontCoverage}
          onCharacterClick={handleCharacterSelect}
          currentChar={currentChar}
        />
      </div>
    </div>

    <!-- Text Input -->
    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <label for="text-input" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Text</label>
        <span class="text-xs text-gray-500">{inputText.length}/6</span>
      </div>
      <input
        id="text-input"
        type="text"
        value={inputText}
        oninput={(e) => {
          const target = e.target as HTMLInputElement;
          const newValue = target.value.slice(0, 6);
          handleTextChange(newValue);
        }}
        placeholder="Enter text to animate"
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        maxlength={6}
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
          aria-label="Save character and move to next"
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
          onclick={() => { void handleCheck(); }}
          aria-label="Save all strokes"
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

  <!-- Instructions and Debug Section -->
  <div class="mt-8 max-w-[1440px] grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Instructions -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-3">How to Use</h2>
      <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>Click on the canvas to place dots along your desired writing path (minimum 2 dots per stroke)</li>
        <li>Double-click or click an existing dot to complete the current stroke and start a new one</li>
        <li><strong>↶ Undo</strong> - Remove last dot or go back to previous stroke for editing</li>
        <li><strong>Eraser</strong> - Reset all strokes for the current character</li>
        <li><strong>Skip</strong> - Save current character and move to next character</li>
        <li><strong>Check</strong> - Save all strokes and export data</li>
        <li><strong>Play</strong> - Preview the animation for current character</li>
      </ol>
    </div>

    <!-- Debug Display -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-3">Debug Info</h2>
      <div class="space-y-3">
        <div class="space-y-2">
          <button
            onclick={() => {
              try {
                const syncQueue = localStorage.getItem('handwrite-sync-queue');
                const traces = localStorage.getItem('handwrite-traces-v1');
                const status = localStorage.getItem('handwrite-sync-status');

                console.log("=== LOCALSTORAGE INSPECTION ===");
                console.log("Sync Queue:", syncQueue ? JSON.parse(syncQueue) : null);
                console.log("Traces:", traces ? JSON.parse(traces) : null);
                console.log("Status:", status ? JSON.parse(status) : null);

                const queueData = syncQueue ? JSON.parse(syncQueue) : [];
                toast.info(`localStorage: ${queueData.length} items in queue, traces ${traces ? 'present' : 'empty'}. See console for details.`);
              } catch (error) {
                console.error("Error reading localStorage:", error);
                toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
              }
            }}
            class="w-full px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            Inspect localStorage
          </button>
        </div>

        {#if savedData}
          <div>
            <h3 class="text-sm font-semibold mb-1">Saved Data:</h3>
            <div class="bg-gray-50 rounded p-3 overflow-auto max-h-[200px]">
              <pre class="text-xs text-gray-800 whitespace-pre-wrap">{JSON.stringify(savedData, null, 2)}</pre>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
