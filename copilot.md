# Handwrite Animation App - Copilot Context

## Current Implementation Summary

### Overview
A React + TypeScript app for creating handwriting-style text animations. Users trace letter paths with dots, the system generates smooth splines, and animates text reveal along those paths.

### Core Architecture

#### Data Models (`src/types/stroke.ts`)
- **Stroke**: Contains `dots`, `splinePoints`, `cumulativeDistances`, `order`
- **Point**: `{x, y}` coordinate
- **GlyphData**: Character with associated strokes and animations

#### State Management (App.tsx)
```typescript
- currentCharIndex: number  // Which character is being edited
- characterStrokes: Record<number, Stroke[]>  // Strokes per character index
- currentStroke: Point[]  // Dots being placed for current stroke
- isPlaying: boolean  // Animation playback state
- savedData: any  // Exported JSON for debugging
```

#### Key Algorithms

**Spline Generation** (`src/utils/spline.ts`)
- `generateCatmullRomSpline(dots)`: Converts user dots into smooth curves
- `getCumulativeDistances(points)`: Arc-length parameterization for constant speed
- `getPointAtDistance(points, distances, targetDistance)`: Get position along path

**Easing Functions** (`src/utils/easing.ts`)
- Linear, easeIn, easeOut, easeInOut
- Applied to animation timing for natural motion

**Animation Engine** (`AnimationPlayerCanvas.tsx`)
- Mask-based reveal using brush stamps along spline path
- Time-based progression with configurable duration and gaps
- Composite operations to reveal text progressively

### Current Workflow

#### Character-by-Character Editing
1. User sees one character at a time (e.g., "A" from "AGENT")
2. Click canvas to place dots along desired writing path
3. System shows real-time spline preview
4. Click existing dot or double-click to complete stroke
5. Multiple strokes per character supported

#### Control Buttons (Left Canvas)
- **↶ Undo**: Remove last dot, or revert last stroke to editable
- **⊗ Clear**: Reset all strokes for current character only
- **▶| Step Forward**: Auto-save current stroke, save character, move to next char (disabled on last char)
- **✓ Check**: Save all strokes, export JSON, clear canvas, show success

#### Animation Preview (Right Canvas)
- **▶ Play**: Preview animation for current character only
- Shows mask-based progressive reveal
- 800ms per stroke, 150ms gap between strokes

#### UI Layout
```
[Font Selector] [Text Input (max 6 chars)]
[Canvas: Stroke Editor] [Canvas: Animation Player]
[Instructions]          [JSON Debug Display]
```

### Canvas Implementation Details

**StrokeEditorCanvas.tsx**
- Displays current character with semi-transparent outline
- Shows completed strokes (colored splines + numbered dots)
- Shows current stroke being drawn (dashed polyline + preview spline)
- Hover preview dot (with proper coordinate scaling)
- Click detection for dots (10px radius)
- Double-click to complete stroke

**AnimationPlayerCanvas.tsx**
- Real-time animation loop using `requestAnimationFrame`
- Brush-based reveal (8px radius circular stamps)
- Offscreen canvas for text rendering
- Mask canvas for progressive reveal
- Composite operation: `destination-in`

### Coordinate System
- Logical canvas size: 800x400px
- Display size: 100% of container
- Mouse coordinates scaled: `(clientX - rect.left) * (width / rect.width)`

### Data Storage
- Per-character strokes stored in `characterStrokes` object keyed by index
- Export format:
```json
{
  "text": "AGENT",
  "fontFamily": "Gloria Hallelujah",
  "glyphs": [
    {
      "char": "A",
      "fontFamily": "Gloria Hallelujah",
      "strokes": [
        {
          "id": "stroke-1234567890",
          "dots": [{x, y}, ...],
          "order": 0
        }
      ]
    }
  ]
}
```

### Key Features Working
✅ Dot-based stroke capture with spline generation
✅ Multi-stroke support per character
✅ Character-by-character workflow
✅ Undo/redo through stroke history
✅ Real-time animation preview (single character)
✅ Click on dot to complete stroke
✅ Double-click to complete stroke
✅ Coordinate scaling for accurate alignment
✅ JSON export with debug display
✅ Play/pause animation controls

---

## New Feature To Implement: Full Word Animation

### Goal
Extend the animation player to animate the entire word (all characters) in sequence, not just the current character being edited.

### Requirements

1. **Text Input Constraint**
   - Maximum 6 characters to prevent overflow/scaling issues
   - Display character count: "5/6" near input
   - Disable input when limit reached

2. **Animation Player Changes**
   - Show all characters from `inputText` in the animation canvas
   - Layout characters horizontally with appropriate spacing
   - Animate strokes in order: char 0 stroke 0, char 0 stroke 1, ..., char 1 stroke 0, etc.
   - Add small gap between characters (e.g., 200ms)

3. **Character Layout**
   - Determine spacing between letters (kerning)
   - May need to scale down text size if word is long (6 chars max helps)
   - Center the entire word in the canvas

4. **Stroke Sequencing**
   - Collect all strokes from all characters in order
   - Create global timeline: `[char0_stroke0, char0_stroke1, char1_stroke0, ...]`
   - Apply per-stroke timing + character gap delays

5. **Data Structure Needed**
   - Each stroke needs character offset position for rendering
   - Transform stroke coordinates relative to character position in word

6. **Animation Loop Updates**
   - Calculate character positions based on text metrics
   - Apply x-offset to stroke coordinates during render
   - Update brush mask to work across full word canvas

7. **Editor Canvas (Optional)**
   - Keep editing one character at a time
   - OR show preview of full word in faint outline while editing current char

### Implementation Strategy

#### Phase 1: Layout System
- Calculate character positions using font metrics or fixed spacing
- Store character offsets: `{char: 'A', xOffset: 0}, {char: 'G', xOffset: 120}, ...`
- Update AnimationPlayerCanvas to render multiple characters

#### Phase 2: Stroke Transformation
- Transform stroke coordinates: `{x: dot.x + charOffset, y: dot.y}`
- Build global stroke timeline with character metadata
- Add inter-character delays

#### Phase 3: Animation Update
- Extend animation engine to handle multi-character timeline
- Update brush rendering to work across full word
- Test with "AGENT" (5 characters)

#### Phase 4: Input Validation
- Add maxLength to text input
- Show character counter
- Validate on change

### Files to Modify
1. `src/App.tsx` - Add text length validation
2. `src/components/AnimationPlayerCanvas.tsx` - Multi-character layout and rendering
3. `src/types/stroke.ts` - Add character position metadata if needed
4. Possibly create `src/utils/layout.ts` for character positioning logic

### Edge Cases to Handle
- Empty text
- Single character (should work as-is)
- Characters with varying widths
- Strokes that might overlap between characters
- Performance with many strokes (should be fine with 6 char limit)

### Testing Checklist
- [ ] "A" (single char) still works
- [ ] "AG" (two chars) animates in sequence
- [ ] "AGENT" (full word) renders correctly
- [ ] Character spacing looks natural
- [ ] Animation timing flows smoothly between characters
- [ ] Text input respects 6 char limit
- [ ] Saved JSON includes all characters

### Success Criteria
- User can trace paths for each letter in "AGENT"
- Animation player shows full word animating letter-by-letter
- Strokes appear in correct order across all characters
- Layout is centered and readable
- Performance remains smooth (30fps)

---

## Development Notes

### Current Limitations
- Font metrics not extracted (using system fonts via CSS)
- No actual TTF/OTF parsing yet
- Text is rendered via canvas fillText, not vector outlines
- No video export (only real-time preview)

### Future Enhancements (Post-MVP)
- Vector font outline extraction
- Skeleton-based auto-path generation
- ML stroke inference
- Video export to MP4/GIF
- Lowercase letters
- Full alphabet support
- Stroke library/sharing
