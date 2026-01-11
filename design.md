# Design Document (MVP)

## 1. High-Level Architecture

The MVP architecture consists of five major subsystems:

1. **Font & Glyph Engine** – loads font files, extracts glyph outlines.
2. **Stroke Path Engine** – manages dot-based input, spline generation, stroke ordering.
3. **Animation Engine** – converts stroke paths + timing profiles into reveal masks.
4. **Rendering Engine** – composites masks with glyphs and backgrounds.
5. **UI Layer** – text entry, stroke editor, playback controls, export.

These systems are modular and communicate via well-defined data models.

---

## 2. Data Models

### 2.1 Glyph Data Model

Represents the structure of a single glyph.

```
Glyph {
  char: 'A',
  fontId: 'gloria-hallelujah',
  outline: VectorBezierPath,     // extracted directly from font
  boundingBox: {x,y,width,height},
  normalizedCoordinates: [...]    // mapping to 0–1 coordinate space
}
```

### 2.2 Stroke Model

A glyph contains 1+ strokes. A stroke is a sequence of dots provided by the user.

```
Stroke {
  id: string,
  dotPoints: [ {x, y}, ... ],           // ordered dots placed by user
  splinePath: SplineCurve,              // auto-generated from dots
  length: number,                       // arc length in normalized units
  order: number                         // writing order
}
```

### 2.3 Animation Timeline

Defines timing, easing, and progression per stroke.

```
StrokeAnimation {
  strokeId: string,
  startTime: ms,
  duration: ms,
  easing: 'easeIn' | 'easeOut' | 'easeInOut',
  jitter: number,      // small randomness applied to speed
}
```

### 2.4 Scene Data

```
Scene {
  text: 'AGENT',
  glyphs: [GlyphInstance],
  animation: [StrokeAnimation],
  background: 'whiteboard' | 'blackboard',
  resolution: {width, height}
}
```

---

## 3. Subsystem Designs

## 3.1 Font & Glyph Engine

**Responsibilities:**

* Load TTF/OTF file.
* Extract glyph outlines as vectors (Bezier curves).
* Normalize glyph coordinates.
* Provide kerning, baseline placement, and glyph layout.

**Why vector extraction?**

* Avoids raster edge detection.
* Gives perfect resolution-independence.
* Allows spline fitting and skeleton analysis.

**Output:** A complete vector outline ready for stroke processing.

---

## 3.2 Stroke Path Engine

This subsystem turns user dot input into smooth, natural handwriting paths.

### Step 1 — Dot Capture

* User selects a glyph.
* User places ordered dots by clicking on the outline.
* Each series of dots represents one stroke.

### Step 2 — Polyline Generation

* Connect dots in order with straight lines.
* Validate that polyline remains mostly inside glyph fill.

### Step 3 — Spline Fitting

Options:

* Catmull–Rom spline
* Cubic Bézier interpolation
* Uniform B-spline

**Choice:** Catmull–Rom spline (natural and intuitive for handwriting-like motion).

### Step 4 — Path Refinement

Automatic operations:

* Smooth curvature.
* Equalize segment density.
* Clamp path inside glyph outline (slight nudging).
* Compute arc-length parameterization.

### Step 5 — Stroke Validation

* Detect and warn if stroke jumps across non-contiguous regions.
* Ensure stroke direction aligns with typical writing.
* Allow user to reverse stroke direction with a button.

**Output:** High-quality stroke path ready for animation.

---

## 3.3 Animation Engine

**Goal:** Turn strokes + timing profiles into progression along a path.

### Time Parameterization

Given stroke path arc length `L`, define:

```
s(t) = easing( (t - startTime) / duration ) * L
```

Where:

* `s(t)` = distance revealed along the path at time t
* `easing(...)` = easing curve
* Start/stop time ensures correct sequencing

### Easing Functions

* easeIn: slow start
* easeOut: slow finish
* easeInOut: symmetric natural handwriting motion

### Variability

* Introduce speed jitter (random ±5–10%).
* Add pauses between strokes.
* Add a slightly longer pause between letters.

### Output

A time-dependent range along each spline path that determines reveal mask growth.

---

## 3.4 Rendering Engine

**Goal:** Reveal glyph shapes smoothly along stroke paths.

### Approach: Mask-based Reveal

1. Pre-render glyph to offscreen surface.
2. Construct a dynamic mask:

   * Brush shape follows the stroke path.
   * Brush radius approximates the glyph's stroke thickness.
3. At each frame, reveal all pixel regions covered by the brush.

### Brush Rendering

* Circular or soft-edged brush for natural feel.
* Multiple passes for thicker strokes.
* Adjustable opacity curve for calligraphy-style fade.

### Composition

* Background texture (whiteboard / blackboard).
* Masked glyph layer.

### Output

* Real-time preview on canvas.
* Video export pipeline:

  * Render N frames at specified FPS.
  * Encode using standard encoder.

---

## 3.5 UI Layer

Minimal but powerful interface.

### 1. Text Entry View

* Text field
* Font chooser
* Render preview of glyph layout

### 2. Stroke Editor View

* Shows individual glyphs, enlarged
* User tools:

  * Add dot
  * Move dot
  * Delete dot
  * Add stroke
  * Remove stroke
  * Reverse stroke direction
* Auto-smooth button
* Live preview of spline

### 3. Animation Controls

* Play / Pause / Scrub
* Speed slider
* Easing dropdown
* Stroke variability toggle

### 4. Export View

* Resolution selector (fixed options)
* Format selector (MP4/GIF)
* Render/export button

---

## 4. Stroke Authoring Workflow (MVP)

### For each of A, G, E, N, T:

1. Load glyph from selected font.
2. Auto-generate heuristic path (optional).
3. User places dots for each stroke.
4. System generates spline.
5. User adjusts dots as needed.
6. Save stroke path to metadata store.
7. Test animation with preview.

This takes ~10–20 seconds per glyph.

---

## 5. Algorithmic Details

### 5.1 Spline Fitting Algorithm

Use Catmull–Rom interpolation:

* Natural curvature
* Passes through each dot
* Allows tension adjustment

### 5.2 Mask Construction

* Represent brush sweep as union of circles along spline sample points.
* Compute samples at ~1px arc length.
* Composite with glyph in GPU or CPU buffer.

### 5.3 Arc-Length Parameterization

* Sample spline densely
* Compute cumulative distances
* Build mapping: distance → t parameter
* Enables smooth timing

---

## 6. Technology Choices (Flexible)

### Rendering

* Web: Canvas2D or WebGL
* Desktop: GPU canvas via Skia/Metal

### Storage

* Local JSON file for stroke metadata
* Per font + glyph data

### Video Export

* Offscreen frame buffer
* Encode using WebCodecs or FFMPEG bindings

---

## 7. MVP Scope Enforcement

### NOT Included in MVP

* Lowercase letters
* All glyphs for the font
* Multiple pens or pressure-based brushes
* ML stroke prediction
* User-facing stroke library or cloud sync (Removed in local-only version)

### MVP Delivers

* Very realistic handwriting animation for the word **AGENT**
* Dot-based authoring that produces natural paths
* High-quality rendering and video export
* Architecture strong enough to expand later

---

## 8. Future Enhancements

* ML-based stroke inference
* Full alphabet support
* More fonts
* Pressure simulation (calligraphy nibs)
* Stylus input for stroke recording
* Community stroke-sharing system

---

## 9. Conclusion

This design enables a small but powerful MVP with extremely high visual quality. The architecture emphasizes:

* Realism
* Ease of stroke authoring
* Smooth animation
* Scalable extension paths

It also maximizes certainty: if "AGENT" looks magical in one font, you’ve validated the core product.
