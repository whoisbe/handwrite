# Requirements (MVP)

## 1. Primary Goal

Build an app that produces **realistic handwriting-style animation** for text rendered in informal calligraphy fonts (e.g., Caveat, Gloria Hallelujah, Permanent Marker). The animation reveals text as if being written dynamically, without showing a hand or tool.

---

## 2. Core User Story

**As a user**, I want to:

* Select a font.
* Enter characters/words (initially limited subset: A, G, E, N, T).
* Quickly define or refine stroke paths using **dot-based stroke guidance**.
* Preview a handwriting-style animation.
* Export animation as video.

---

## 3. Functional Requirements

### 3.1 Text & Font Handling

* Load professional fonts (TTF/OTF).
* Extract glyph vector outlines directly from font (no image processing).
* Normalize glyphs into a stable coordinate system.
* Support initial font set: **Gloria Hallelujah**, possibly **Caveat**.
* Initial character support: **A, G, E, N, T (uppercase)**.

### 3.2 Stroke Path Definition (Hybrid / Dot-Based)

* Allow user (power user) to place **ordered dots** on glyphs.
* Dots represent intended writing direction and approximate stroke flow.
* Automatically convert dots → polyline → smoothed spline (Bezier/Spline).
* Allow multiple strokes per glyph.
* Allow user to:

  * Add/remove/reorder dots.
  * Add/remove strokes.
  * Change stroke start and direction.
* Store stroke paths as metadata for (font, character).

### 3.3 Auto Path Assistance (Rule-Based)

* System generates an **initial heuristic path suggestion** (optional):

  * Detect glyph skeleton.
  * Extract potential stroke segments.
  * Suggest stroke ordering.
* User can accept, refine, or overwrite using dot-based editor.

### 3.4 Animation Engine

* Animate reveal of glyph along stroke path.
* Reveal is done via a **path-driven brush mask**, not vertical/typewriter wipes.
* Must support easing functions:

  * Linear
  * Ease-in
  * Ease-out
  * Ease-in-out
* Allow global speed control (e.g., “handwriting speed”).
* Stroke-level variability:

  * ±5–10% speed variation
  * Pause between strokes
  * Longer pause between glyphs

### 3.5 Rendering

* Generate vector-based mask evolving along the stroke path.
* Composite mask with fully-rendered glyph.
* Support background:

  * Whiteboard
  * Blackboard
* Render preview in real-time.
* Export video at fixed FPS (e.g., 30fps) and resolution (1080p is fine).

### 3.6 User Interface

* Font selector
* Text input field
* Glyph preview canvas
* Dot-based stroke editor:

  * Place dots
  * Move dots
  * Delete dots
  * Add stroke
  * Remove stroke
  * Reorder strokes
* Playback controls:

  * Play / Pause / Scrub
  * Speed slider
* Export button

---

## 4. Non-Functional Requirements

### 4.1 Performance

* Preview animation should play at ≥ 30 FPS.
* Video export should complete in < 10 seconds for a 2–3 second animation.

### 4.2 Reliability

* Stroke definitions must persist between sessions.
* Font loading should gracefully handle errors.

### 4.3 Usability

* Dot editor should feel lightweight and forgiving.
* No artistic expertise required.
* Default heuristic path should be “good enough” for many glyphs.

### 4.4 Extensibility

* Architecture should support:

  * Adding more characters
  * Adding more fonts
  * Later ML-powered stroke inference
  * Pressure-based brush simulation (future)

---

## 5. Constraints & MVP Scope

* Only supports uppercase A, G, E, N, T initially.
* Only supports 1–2 fonts initially.
* No full stroke drawing by user (dots only).
* No ML required in MVP.
* No API or cloud sync needed.

---

## 6. Success Criteria for MVP

* Animation looks **realistic** and **handwritten**, not like typewriter wipes.
* Dot-based input allows a power user to define strokes in **<10 seconds per glyph**.
* “AGENT” in selected font(s) produces visually impressive animation.
* Video export works reliably.
