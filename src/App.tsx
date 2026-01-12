import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import svgPaths from "./imports/svg-x7f6vq0myw";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import StrokeEditorCanvas from "./components/StrokeEditorCanvas";
import AnimationPlayerCanvas from "./components/AnimationPlayerCanvas";
import FontCoverageHeatmap from "./components/FontCoverageHeatmap";
import { Stroke } from "./types/stroke";
import { Point, generateCatmullRomSpline, getCumulativeDistances } from "./utils/spline";
import { downloadJSON, uploadJSON, getAllStrokesForFont } from "./utils/persistence";
import {
  saveGlyphStrokesLocal,
  fetchAndHydrateStrokes,
  loadGlyphStrokesWithMetadata,
  getFontCoverage
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

function InvertIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="var(--fill-0, #4F378A)" />
      <path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8V4z" fill="var(--fill-0, #4F378A)" />
    </svg>
  );
}

function ColorPickerIcon() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="var(--fill-0, #4F378A)" />
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
      className={`bg-white box-border flex items-center justify-center overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] size-[56px] transition-shadow ${disabled
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

  // Color inversion control
  const [invertColors, setInvertColors] = useState(false);

  // Text color picker control
  const [textColor, setTextColor] = useState<string | null>(null);

  // Saved data for debug display
  const [savedData, setSavedData] = useState<any>(null);

  // Coverage refresh trigger
  const [coverageRefreshTrigger, setCoverageRefreshTrigger] = useState(0);

  // Get actual font coverage from localStorage
  const fontCoverage = useMemo(() => getFontCoverage(selectedFont), [selectedFont, coverageRefreshTrigger]);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [conflictingChars, setConflictingChars] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestTextRef = useRef(inputText);
  const colorPickerInputRef = useRef<HTMLInputElement>(null);
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
    "Dancing Script",
    "Nanum Brush Script"
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
      toast.info("No strokes to save yet.");
      return;
    }

    // Save to localStorage first (instant, offline-capable)
    // Check if each character was locally edited or used as-is
    let localSaveSuccess = true;
    const locallyEditedChars: string[] = [];

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
        }
      }
    });

    if (!localSaveSuccess) {
      toast.error("Failed to save strokes locally. Please check your browser storage.");
      return;
    }

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

    const savedOutput = {
      text: inputText,
      fontFamily: selectedFont,
      glyphs: allGlyphData
    };

    console.log("Saved strokes:", savedOutput);
    setSavedData(savedOutput);

    // Show success message immediately
    toast.success(`Saved strokes for "${inputText}" locally!`);

    // Refresh coverage heatmap
    setCoverageRefreshTrigger(prev => prev + 1);

    await hydratePersistedStrokes(inputText, selectedFont);
    setCurrentStroke([]);
    setCurrentCharIndex(0);
    setIsPlaying(false);
  }, [characterStrokes, currentStroke, completeCurrentStroke, inputText, selectedFont, hydratePersistedStrokes, currentCharIndex]);

  // Toggle playback
  const handlePlay = useCallback(() => {
    if (strokes.length === 0) {
      toast.info("Please create at least one stroke first");
      return;
    }
    setIsPlaying(prev => !prev);
  }, [strokes.length]);

  // Handle playback complete
  const handlePlaybackComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Toggle color inversion
  const handleToggleInvert = useCallback(() => {
    setInvertColors(prev => !prev);
  }, []);

  // Handle character selection from heatmap
  const handleCharacterSelect = useCallback(async (selectedChar: string) => {
    // Discard current in-progress stroke (do NOT auto-save it via handleCheck)
    setCurrentStroke([]);

    // Auto-save only the already-completed strokes if any exist
    // We don't call handleCheck() here because it would save the discarded stroke due to closure
    // The completed strokes are already saved in characterStrokes state

    // Find if character exists in inputText
    const existingIndex = inputText.indexOf(selectedChar);
    
    if (existingIndex !== -1) {
      // Character exists - navigate to it
      setCurrentCharIndex(existingIndex);
    } else {
      // Character doesn't exist - add it
      if (inputText.length < 6) {
        // Append to text
        const newText = inputText + selectedChar;
        setInputText(newText);
        setCurrentCharIndex(newText.length - 1);
        await hydratePersistedStrokes(newText, selectedFont);
      } else {
        // Text is full - replace at current position
        const chars = Array.from(inputText);
        const oldChar = chars[currentCharIndex];
        const indexToKeep = currentCharIndex;
        chars[indexToKeep] = selectedChar;
        const newText = chars.join('');
        setInputText(newText);
        
        // Clear strokes at current position since the character changed
        // (hydratePersistedStrokes skips indices that already have strokes)
        if (oldChar !== selectedChar) {
          setCharacterStrokes(prev => {
            const next = { ...prev };
            delete next[indexToKeep];
            return next;
          });
        }
        
        // Keep same index, now pointing to new character
        setCurrentCharIndex(indexToKeep);
        await hydratePersistedStrokes(newText, selectedFont);
      }
    }
    
    setIsPlaying(false);
  }, [characterStrokes, currentCharIndex, inputText, selectedFont, handleCheck, hydratePersistedStrokes]);

  // Handle color picker change
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setTextColor(color || null);
  }, []);

  // Handle Export
  const handleExport = useCallback(() => {
    const allStrokes = getAllStrokesForFont(selectedFont);
    const charCount = Object.keys(allStrokes).length;
    
    if (charCount === 0) {
      toast.info("No strokes to export for this font");
      return;
    }

    // Prepare export data with metadata
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
  }, [selectedFont]);

  // Handle Import file selection
  const handleImportFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadJSON(file);
      
      // Validate JSON structure
      if (!data.version || !data.fontFamily || !Array.isArray(data.glyphs)) {
        toast.error("Invalid stroke data file format");
        return;
      }

      // Check if the font exists in available fonts
      const importedFont = data.fontFamily;
      if (!fonts.includes(importedFont)) {
        toast.error(`Font "${importedFont}" is not available in this app`);
        return;
      }

      // Detect conflicts (characters that will be overwritten)
      const existingStrokes = getAllStrokesForFont(importedFont);
      const conflicts: string[] = [];
      
      data.glyphs.forEach((glyph: any) => {
        if (existingStrokes[glyph.char]?.length > 0) {
          conflicts.push(glyph.char);
        }
      });

      setImportData(data);
      setConflictingChars(conflicts);
      setImportDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read file");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [fonts]);

  // Confirm Import
  const handleConfirmImport = useCallback(async () => {
    if (!importData) return;

    try {
      const importedFont = importData.fontFamily;
      let importedCount = 0;

      // Process each glyph
      for (const glyph of importData.glyphs) {
        if (!glyph.char || !Array.isArray(glyph.strokes)) continue;

        // Reconstruct strokes with spline data
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

        // Save to localStorage
        const success = saveGlyphStrokesLocal(importedFont, glyph.char, reconstructedStrokes, {
          isLocalEdit: false // Mark as imported, not user-created
        });

        if (success) importedCount++;
      }

      // Refresh coverage heatmap
      setCoverageRefreshTrigger(prev => prev + 1);

      // If imported font matches current font, reload current character's strokes if it was imported
      if (importedFont === selectedFont) {
        const currentCharData = importData.glyphs.find((g: any) => g.char === currentChar);
        if (currentCharData) {
          const reloadedStrokes = await fetchAndHydrateStrokes(selectedFont, currentChar);
          if (reloadedStrokes) {
            setCharacterStrokes(prev => ({
              ...prev,
              [currentCharIndex]: reloadedStrokes
            }));
            setCurrentStroke([]);
          }
        }
      }

      toast.success(`Imported ${importedCount} character${importedCount > 1 ? 's' : ''} for ${importedFont}`);
      setImportDialogOpen(false);
      setImportData(null);
      setConflictingChars([]);
    } catch (error) {
      toast.error("Failed to import strokes");
      console.error("Import error:", error);
    }
  }, [importData, selectedFont, currentChar, currentCharIndex]);

  // Cancel Import
  const handleCancelImport = useCallback(() => {
    setImportDialogOpen(false);
    setImportData(null);
    setConflictingChars([]);
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

    const hydrate = async () => {
      if (!text) {
        setCharacterStrokes({});
        setCurrentStroke([]);
        setCurrentCharIndex(0);
        return;
      }

      setCharacterStrokes({});
      setCurrentStroke([]);
      setCurrentCharIndex(0);
      await hydratePersistedStrokes(text, selectedFont);
    };

    void hydrate();
  }, [selectedFont, hydratePersistedStrokes]);

  return (
    <div className="bg-white min-h-screen p-6">
      <Toaster position="top-right" richColors />
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="font-['Nanum_Brush_Script',sans-serif] text-[40px] text-black">
          Handwrite
        </h1>

      </header>

      {/* Input Controls */}
      <div className="mb-8 space-y-6" style={{ maxWidth: '100%' }}>
        {/* Font Selector with Heatmap */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="space-y-2" style={{ flex: '0 0 auto', minWidth: '240px' }}>
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
            
            {/* Export/Import Controls */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleExport}
                disabled={Object.keys(getAllStrokesForFont(selectedFont)).length === 0}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Export Font
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Import Font
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <div style={{ flex: '0 0 auto', minWidth: '1080px' }}>
            <FontCoverageHeatmap
              fontFamily={selectedFont}
              coverage={fontCoverage}
              onCharacterClick={handleCharacterSelect}
              currentChar={currentChar}
            />
          </div>
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
          {/* Control Buttons */}
          <div className="absolute top-4 left-4 z-10 flex gap-3">
            <ControlButton
              icon={<PlayIcon />}
              onClick={handlePlay}
              ariaLabel={isPlaying ? "Pause animation" : "Play animation"}
            />
            <ControlButton
              icon={<InvertIcon />}
              onClick={handleToggleInvert}
              ariaLabel={invertColors ? "Disable color inversion" : "Enable color inversion"}
            />
            <div className="relative">
              <input
                type="color"
                ref={colorPickerInputRef}
                value={textColor || (invertColors ? '#ffffff' : '#000000')}
                onChange={handleColorChange}
                className="sr-only"
                aria-label="Pick text color"
                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
              />
              <ControlButton
                icon={<ColorPickerIcon />}
                onClick={() => {
                  colorPickerInputRef.current?.click();
                }}
                ariaLabel="Pick text color"
              />
            </div>
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
              invertColors={invertColors}
              textColor={textColor}
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
            {/* Debug Info removed for local-only version */}

            <div className="space-y-2">
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
                    toast.info(`localStorage: ${queueData.length} items in queue, traces ${traces ? 'present' : 'empty'}. See console for details.`);
                  } catch (error) {
                    console.error("Error reading localStorage:", error);
                    toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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

      {/* Import Confirmation Dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Stroke Data</AlertDialogTitle>
            <AlertDialogDescription>
              {importData && (
                <div className="space-y-3">
                  <p>
                    You are about to import <strong>{importData.glyphs?.length || 0} character(s)</strong> for font{' '}
                    <strong>{importData.fontFamily}</strong>.
                  </p>
                  
                  {conflictingChars.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                      <p className="font-semibold text-amber-900 mb-2">
                        ⚠️ The following {conflictingChars.length} character(s) will be overwritten:
                      </p>
                      <p className="text-sm text-amber-800 font-mono">
                        {conflictingChars.join(', ')}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600">
                    {conflictingChars.length > 0
                      ? 'Existing strokes for these characters will be replaced. This action cannot be undone.'
                      : 'New strokes will be added for these characters.'}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelImport}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              {conflictingChars.length > 0 ? 'Overwrite & Import' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
