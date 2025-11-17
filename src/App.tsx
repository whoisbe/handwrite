import { useState, useCallback } from "react";
import svgPaths from "./imports/svg-x7f6vq0myw";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button } from "./components/ui/button";
import StrokeEditorCanvas from "./components/StrokeEditorCanvas";
import AnimationPlayerCanvas from "./components/AnimationPlayerCanvas";
import { Stroke } from "./types/stroke";
import { Point, generateCatmullRomSpline, getCumulativeDistances } from "./utils/spline";

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
  
  // Saved data for debug display
  const [savedData, setSavedData] = useState<any>(null);
  
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
  const handleCheck = useCallback(() => {
    // Auto-save current stroke if any
    if (currentStroke.length >= 2) {
      completeCurrentStroke();
    }

    // Build complete saved data
    const allGlyphData = Object.entries(characterStrokes).map(([charIndex, charStrokes]) => ({
      char: inputText[parseInt(charIndex)],
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
    
    // Show success and clear
    alert(`Successfully saved strokes for "${inputText}"!`);
    setCharacterStrokes({});
    setCurrentStroke([]);
    setCurrentCharIndex(0);
    setIsPlaying(false);
  }, [currentStroke, characterStrokes, inputText, selectedFont, completeCurrentStroke]);

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
  const handleTextChange = useCallback((newText: string) => {
    setInputText(newText);
    setCurrentCharIndex(0);
    setCurrentStroke([]);
  }, []);

  return (
    <div className="bg-white min-h-screen p-6">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="font-['Permanent_Marker',sans-serif] text-[40px] text-black">
          Handwrite
        </h1>
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
          <Label htmlFor="text-input">Text</Label>
          <Input
            id="text-input"
            type="text"
            value={inputText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter text to animate"
            className="w-full"
          />
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
              onClick={handleCheck} 
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
              text={currentChar}
              fontFamily={selectedFont}
              strokes={strokes}
              isPlaying={isPlaying}
              onPlaybackComplete={handlePlaybackComplete}
              strokeDuration={800}
              strokeGap={150}
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
          <h2 className="text-lg font-semibold mb-3">Saved Data (Debug)</h2>
          {savedData ? (
            <div className="bg-gray-50 rounded p-3 overflow-auto max-h-[300px]">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(savedData, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No data saved yet. Click the ✓ Check button to save.</p>
          )}
        </div>
      </div>
    </div>
  );
}
