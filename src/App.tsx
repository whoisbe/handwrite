import { useState, useCallback, useEffect, useRef } from "react";
import svgPaths from "./imports/svg-x7f6vq0myw";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import StrokeEditorCanvas from "./components/StrokeEditorCanvas";
import AnimationPlayerCanvas from "./components/AnimationPlayerCanvas";
import { Stroke } from "./types/stroke";
import { Point, generateCatmullRomSpline, getCumulativeDistances } from "./utils/spline";
import { 
  saveGlyphStrokesLocal, 
  loadStrokesForText, 
  fetchAndHydrateStrokes, 
  processSyncQueue, 
  startAutoSync,
  getSyncStatus,
  syncFontFromSupabase,
  markAsUsedAsIs,
  loadGlyphStrokesWithMetadata
} from "./lib/hybridPersistence";

// Canvas control button icons
function UndoIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d={svgPaths.p22d78f90} fill="var(--fill-0, #4F378A)" />
    </svg>
  );
}

function ClearCurrentIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="var(--fill-0, #4F378A)" />
    </svg>
  );
}

function StepForwardIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d={svgPaths.p15f6aaf0} fill="var(--fill-0, #4F378A)" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="var(--fill-0, #4F378A)" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d="M8 19V5L19 12L8 19Z" fill="var(--fill-0, #4F378A)" />
    </svg>
  );
}

// Control button component
function ControlButton({ 
  icon, 
  onClick, 
  ariaLabel,
  disabled = false
}: { 
  icon: React.ReactNode; 
  onClick: () => void; 
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow ${
        disabled 
          ? 'opacity-40 cursor-not-allowed' 
          : 'hover:shadow-[0px_6px_10px_4px_rgba(0,0,0,0.15),0px_2px_4px_0px_rgba(0,0,0,0.3)]'
      }`}
    >
      <div className="p-[16px] size-[56px]">
        <div className="size-[24px]" style={{ "--fill-0": "rgba(79, 55, 138, 1)" } as React.CSSProperties}>
          {icon}
        </div>
      </div>
    </button>
  );
}

export default function App() {
  const [selectedFont, setSelectedFont] = useState("Gloria Hallelujah");
  const [inputText, setInputText] = useState("A");
  
  // Character navigation
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  
  // Stroke management - stores strokes per character
  const [characterStrokes, setCharacterStrokes] = useState<Record<number, Stroke[]>>({});
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Animation speed control (1x to 4x)
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  
  // Saved data for debug display
  const [savedData, setSavedData] = useState<any>(null);
  
  // Sync status
  const [syncStatus, setSyncStatus] = useState<{ pending: number; lastSync: number | null }>({ pending: 0, lastSync: null });

  const latestTextRef = useRef(inputText);
  useEffect(() => {
    latestTextRef.current = inputText;
  }, [inputText]);
  
  // Get strokes for current character
  const strokes = characterStrokes[currentCharIndex] || [];
  const currentChar = inputText[currentCharIndex] || "";

  // Available fonts
  const fonts = [
    "Gloria Hallelujah",
    "Permanent Marker",
    "Indie Flower",
    "Caveat",
    "Dancing Script"
  ];

  const characterStrokesRef = useRef(characterStrokes);
  useEffect(() => {
    characterStrokesRef.current = characterStrokes;
  }, [characterStrokes]);

  const hydratePersistedStrokes = useCallback(async (text: string, fontName: string) => {
    if (!text) {
      setCharacterStrokes({});
      return;
    }

    const chars = Array.from(text);
    const results = await Promise.all(
      chars.map(async (char, index) => {
        if (characterStrokesRef.current[index]?.length) {
          return null;
        }
        const persisted = await fetchAndHydrateStrokes(fontName, char);
        return persisted?.length ? { index, strokes: persisted } : null;
      })
    );

    setCharacterStrokes(prev => {
      let mutated = false;
      const next = { ...prev };
      results.forEach(result => {
        if (!result) {
          return;
        }
        if (!next[result.index]?.length) {
          next[result.index] = result.strokes;
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });
  }, []);

  // Add dot to current stroke
  const handleAddDot = useCallback((point: Point) => {
    setCurrentStroke(prev => [...prev, point]);
  }, []);

  // Complete current stroke helper
  const completeCurrentStroke = useCallback(() => {
    if (currentStroke.length < 2) {
      return null;
    }

    // Generate spline from current dots
    const splinePoints = generateCatmullRomSpline(currentStroke);
    const cumulativeDistances = getCumulativeDistances(splinePoints);

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      dots: [...currentStroke],
      splinePoints,
      cumulativeDistances,
      order: strokes.length
    };

    setCharacterStrokes(prev => ({
      ...prev,
      [currentCharIndex]: [...(prev[currentCharIndex] || []), newStroke]
    }));
    setCurrentStroke([]);
    return newStroke;
  }, [currentStroke, strokes.length, currentCharIndex]);

  // Click on existing dot in current stroke - complete stroke
  const handleDotClick = useCallback((dotIndex: number) => {
    if (currentStroke.length >= 2) {
      completeCurrentStroke();
    }
  }, [currentStroke.length, completeCurrentStroke]);

  // Undo - go back through strokes
  const handleUndo = useCallback(() => {
    if (currentStroke.length > 0) {
      // Remove last dot from current stroke
      setCurrentStroke(prev => prev.slice(0, -1));
    } else if (strokes.length > 0) {
      // Move last completed stroke back to current stroke for editing
      const lastStroke = strokes[strokes.length - 1];
      setCharacterStrokes(prev => ({
        ...prev,
        [currentCharIndex]: prev[currentCharIndex].slice(0, -1)
      }));
      setCurrentStroke(lastStroke.dots);
    }
  }, [currentStroke.length, strokes.length, currentCharIndex]);

  // Clear all strokes for current character only
  const handleClearCurrent = useCallback(() => {
    setCurrentStroke([]);
    setCharacterStrokes(prev => ({
      ...prev,
      [currentCharIndex]: []
    }));
    setIsPlaying(false);
  }, [currentCharIndex]);

  // Step Forward - save current character and move to next
  const handleStepForward = useCallback(() => {
    // Auto-save current stroke if any dots exist
    if (currentStroke.length >= 2) {
      completeCurrentStroke();
    }

    // Check if there's a next character
    if (currentCharIndex < inputText.length - 1) {
      setCurrentCharIndex(prev => prev + 1);
      setCurrentStroke([]);
      setIsPlaying(false);
    }
  }, [currentStroke.length, currentCharIndex, inputText.length, completeCurrentStroke]);

  // Check button - save all strokes
  const handleCheck = useCallback(async () => {
    let workingStrokes = characterStrokes;

    if (currentStroke.length >= 2) {
      const flushedStroke = completeCurrentStroke();
      if (flushedStroke) {
        workingStrokes = {
          ...characterStrokes,
          [currentCharIndex]: [...(characterStrokes[currentCharIndex] || []), flushedStroke]
        };
      }
    }

    const glyphEntries = Object.entries(workingStrokes);
    if (glyphEntries.length === 0) {
      alert("No strokes to save yet.");
      return;
    }

    // Save to localStorage first (instant, offline-capable)
    // Check if each character was locally edited or used as-is
    let localSaveSuccess = true;
    const locallyEditedChars: string[] = [];
    const usedAsIsChars: string[] = [];

    glyphEntries.forEach(([charIndex, charStrokes]) => {
      const glyphChar = inputText[parseInt(charIndex, 10)];
      if (glyphChar && charStrokes?.length) {
        // Check if this character was locally edited by comparing with existing data
        const existing = loadGlyphStrokesWithMetadata(selectedFont, glyphChar);
        
        // If existing data exists and isLocalEdit is false (from Supabase), check if strokes match
        let isLocalEdit = true; // Default to local edit (user created/modified)
        
        if (existing && existing.metadata?.isLocalEdit === false) {
          // Compare strokes to see if they match (simple comparison by stroke count and IDs)
          const existingStrokeIds = existing.strokes.map(s => s.id).sort().join(',');
          const newStrokeIds = charStrokes.map(s => s.id).sort().join(',');
          const existingStrokeCount = existing.strokes.length;
          const newStrokeCount = charStrokes.length;
          
          // If stroke IDs and count match, it's likely the same (used as-is)
          if (existingStrokeIds === newStrokeIds && existingStrokeCount === newStrokeCount) {
            isLocalEdit = false; // Used as-is from Supabase
          }
        }
        
        // Save with isLocalEdit flag
        const success = saveGlyphStrokesLocal(selectedFont, glyphChar, charStrokes, {
          isLocalEdit: isLocalEdit
        });
        
        if (!success) {
          localSaveSuccess = false;
        } else if (isLocalEdit) {
          locallyEditedChars.push(glyphChar);
        } else {
          usedAsIsChars.push(glyphChar);
        }
      }
    });

    if (!localSaveSuccess) {
      alert("Failed to save strokes locally. Please check your browser storage.");
      return;
    }

    // Mark characters that were used as-is (quality indicator, no new version created)
    usedAsIsChars.forEach(char => {
      markAsUsedAsIs(selectedFont, char);
    });
    
    if (usedAsIsChars.length > 0) {
      console.log(`✓ Marked ${usedAsIsChars.length} character(s) as used-as-is (quality indicator)`);
    }
    if (locallyEditedChars.length > 0) {
      console.log(`✓ ${locallyEditedChars.length} character(s) marked for sync as new version(s)`);
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

    const savedOutput = {
      text: inputText,
      fontFamily: selectedFont,
      glyphs: allGlyphData
    };

    console.log("Saved strokes:", savedOutput);
    setSavedData(savedOutput);

    // Show success message immediately
    alert(`✓ Saved strokes for "${inputText}" locally! Syncing to cloud in background...`);

    // Update sync status
    setSyncStatus(getSyncStatus());

    // Sync to Supabase in background (non-blocking)
    processSyncQueue().then(result => {
      console.log("Background sync result:", result);
      setSyncStatus(getSyncStatus());
    }).catch(error => {
      console.error("Background sync error:", error);
      setSyncStatus(getSyncStatus());
    });

    await hydratePersistedStrokes(inputText, selectedFont);
    setCurrentStroke([]);
    setCurrentCharIndex(0);
    setIsPlaying(false);
  }, [characterStrokes, currentStroke, completeCurrentStroke, inputText, selectedFont, hydratePersistedStrokes, currentCharIndex]);

  // Toggle playback
  const handlePlay = useCallback(() => {
    if (strokes.length === 0) {
      alert("Please create at least one stroke first");
      return;
    }
    setIsPlaying(prev => !prev);
  }, [strokes.length]);

  // Handle playback complete
  const handlePlaybackComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Reset character index when text changes
  const handleTextChange = useCallback((rawText: string) => {
    const sanitizedText = rawText;
    const previousText = inputText;
    setInputText(sanitizedText);
    setCurrentCharIndex(0);
    setCurrentStroke([]);
    setIsPlaying(false);

    if (!sanitizedText) {
      setCharacterStrokes({});
      return;
    }

    setCharacterStrokes(prev => {
      const next: Record<number, Stroke[]> = {};
      for (let i = 0; i < sanitizedText.length; i++) {
        const prevChar = previousText[i];
        const nextChar = sanitizedText[i];
        if (prev[i]?.length && prevChar === nextChar) {
          next[i] = prev[i];
        }
      }
      return next;
    });

    void hydratePersistedStrokes(sanitizedText, selectedFont);
  }, [inputText, selectedFont, hydratePersistedStrokes]);

  useEffect(() => {
    const text = latestTextRef.current;
    
    // Sync font from Supabase first (blocking)
    const syncAndHydrate = async () => {
      if (!text) {
        setCharacterStrokes({});
        setCurrentStroke([]);
        setCurrentCharIndex(0);
        return;
      }

      // Sync all glyphs for the selected font from Supabase
      console.log(`Syncing font "${selectedFont}" from Supabase...`);
      const syncedCount = await syncFontFromSupabase(selectedFont);
      console.log(`Synced ${syncedCount} character(s) for font "${selectedFont}"`);

      // Then hydrate persisted strokes
      setCharacterStrokes({});
      setCurrentStroke([]);
      setCurrentCharIndex(0);
      await hydratePersistedStrokes(text, selectedFont);
    };

    void syncAndHydrate();
  }, [selectedFont, hydratePersistedStrokes]);

  // Initialize auto-sync on mount
  useEffect(() => {
    startAutoSync(30000); // Sync every 30 seconds
    setSyncStatus(getSyncStatus());
    
    // Update sync status periodically
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white min-h-screen p-6">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="font-['Nanum_Brush_Script',sans-serif] text-[40px] text-black">
          Handwrite
        </h1>
        {/* Sync Status Indicator */}
        <div className="mt-1 text-xs text-gray-600">
          {syncStatus.pending > 0 ? (
            <span>Sync: {syncStatus.pending} pending | <button onClick={async () => {
              console.log("=== MANUAL SYNC ===");
              const result = await processSyncQueue();
              console.log("Result:", result);
              setSyncStatus(getSyncStatus());
            }} className="underline">sync now</button></span>
          ) : syncStatus.lastSync ? (
            <span>Sync: up to date</span>
          ) : (
            <span>Sync: no data</span>
          )}
        </div>
      </header>

      {/* Input Controls */}
      <div className="max-w-[280px] mb-8 space-y-6">
        {/* Font Selector */}
        <div className="space-y-2">
          <Label htmlFor="font-select">Font</Label>
          <Select value={selectedFont} onValueChange={setSelectedFont}>
            <SelectTrigger id="font-select" className="w-full">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="text-input">Text</Label>
            <span className="text-xs text-gray-500">{inputText.length}/6</span>
          </div>
          <Input
            id="text-input"
            type="text"
            value={inputText}
            onChange={(e) => {
              const newValue = e.target.value.slice(0, 6); // Limit to 6 characters
              handleTextChange(newValue);
            }}
            placeholder="Enter text to animate"
            className="w-full"
            maxLength={6}
          />
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
            <Label>Animation Speed</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[speedMultiplier]}
                onValueChange={([value]) => setSpeedMultiplier(value)}
                min={1}
                max={4}
                step={0.5}
                className="w-full"
              />
              <span className="text-sm font-semibold text-gray-900 w-10">{speedMultiplier.toFixed(1)}x</span>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1440px]">
        {/* Canvas Section - Stroke Editor */}
        <div className="bg-[#eeeeee] rounded-lg overflow-hidden relative h-[400px]">
          {/* Control Buttons - New order: Undo, Clear, Step Forward, Check */}
          <div className="absolute top-4 right-4 flex gap-3 z-10">
            <ControlButton 
              icon={<UndoIcon />} 
              onClick={handleUndo} 
              ariaLabel="Undo last dot or stroke"
            />
            <ControlButton 
              icon={<ClearCurrentIcon />} 
              onClick={handleClearCurrent} 
              ariaLabel="Clear all strokes for current character"
            />
            <ControlButton 
              icon={<StepForwardIcon />} 
              onClick={handleStepForward} 
              ariaLabel="Save character and move to next"
              disabled={currentCharIndex >= inputText.length - 1}
            />
            <ControlButton 
              icon={<CheckIcon />} 
              onClick={() => { void handleCheck(); }} 
              ariaLabel="Save all strokes"
            />
          </div>

          {/* Character and Stroke Info */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 px-3 py-2 rounded-lg text-sm">
            <div className="font-semibold">Character: {currentChar || '—'} ({currentCharIndex + 1}/{inputText.length})</div>
            <div>Strokes: {strokes.length}</div>
            <div>Current dots: {currentStroke.length}</div>
          </div>

          {/* Canvas Display */}
          <div className="absolute inset-0">
            <StrokeEditorCanvas
              text={currentChar}
              fontFamily={selectedFont}
              strokes={strokes}
              currentStroke={currentStroke}
              onAddDot={handleAddDot}
              onDotClick={handleDotClick}
              onUndo={handleUndo}
              onClear={handleClearCurrent}
              onCompleteStroke={completeCurrentStroke}
              width={800}
              height={400}
            />
          </div>
        </div>

        {/* Animation Player Section */}
        <div className="bg-[#eeeeee] rounded-lg overflow-hidden relative h-[400px]">
          {/* Play/Pause Button */}
          <div className="absolute top-4 left-4 z-10">
            <ControlButton 
              icon={<PlayIcon />} 
              onClick={handlePlay} 
              ariaLabel={isPlaying ? "Pause animation" : "Play animation"}
            />
          </div>

          {/* Animation Display */}
          <div className="absolute inset-0">
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
            />
          </div>
        </div>
      </div>

      {/* Instructions and Debug Section */}
      <div className="mt-8 max-w-[1440px] grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instructions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Click on the canvas to place dots along your desired writing path (minimum 2 dots per stroke)</li>
            <li>Double-click or click an existing dot to complete the current stroke and start a new one</li>
            <li><strong>↶ Undo</strong> - Remove last dot or go back to previous stroke for editing</li>
            <li><strong>⊗ Clear</strong> - Reset all strokes for the current character</li>
            <li><strong>▶| Step Forward</strong> - Save current character and move to next character</li>
            <li><strong>✓ Check</strong> - Save all strokes and export data</li>
            <li><strong>▶ Play</strong> - Preview the animation for current character</li>
          </ol>
        </div>

        {/* Debug Display */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Debug Info</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold mb-1">Sync Status:</h3>
              <div className="text-xs bg-gray-50 rounded p-2">
                <div>Pending: {syncStatus.pending}</div>
                <div>Last Sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : 'Never'}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={async () => {
                  console.log("=== MANUAL SYNC TEST ===");
                  try {
                    const result = await processSyncQueue();
                    console.log("Sync result:", result);
                    setSyncStatus(getSyncStatus());
                    alert(`✓ Sync complete\nSuccess: ${result.success}\nFailed: ${result.failed}\n\nCheck console for details.`);
                  } catch (error) {
                    console.error("Sync error:", error);
                    alert(`✗ Sync failed: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Test Sync Now
              </button>
              
              <button
                onClick={() => {
                  try {
                    const syncQueue = localStorage.getItem('handwrite-sync-queue');
                    const traces = localStorage.getItem('handwrite-traces-v1');
                    const status = localStorage.getItem('handwrite-sync-status');
                    
                    console.log("=== LOCALSTORAGE INSPECTION ===");
                    console.log("Sync Queue:", syncQueue ? JSON.parse(syncQueue) : null);
                    console.log("Traces:", traces ? JSON.parse(traces) : null);
                    console.log("Status:", status ? JSON.parse(status) : null);
                    
                    const queueData = syncQueue ? JSON.parse(syncQueue) : [];
                    alert(`localStorage Contents:\n\nSync Queue: ${queueData.length} items\nTraces: ${traces ? 'Present' : 'Empty'}\n\nSee console for details`);
                  } catch (error) {
                    console.error("Error reading localStorage:", error);
                    alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                className="w-full px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Inspect localStorage
              </button>
            </div>
            
            {savedData && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Saved Data:</h3>
                <div className="bg-gray-50 rounded p-3 overflow-auto max-h-[200px]">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(savedData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
