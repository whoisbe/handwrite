# Architecture

## 1. System Overview

The system is composed of five major subsystems:

* Font & Glyph Engine
* Stroke Path Engine
* Animation Engine
* Rendering Engine
* UI Layer

Each subsystem has clearly defined interfaces and responsibilities, enabling testability and gradual expansion.

## 2. Component Diagram

* Font Engine → supplies glyph outlines to Stroke Path Engine
* Stroke Path Engine → produces spline-based stroke paths
* Animation Engine → turns stroke paths into time‑varying reveal positions
* Rendering Engine → builds masks + composites glyphs
* UI Layer → orchestrates user interaction, calls into other layers

## 3. Data Flow

Text → Font Engine → Glyphs → Stroke Paths → Animation Timeline → Rendered Frames → Export

---

# Data Models

## Glyph

* char
* fontId
* outline: vector path
* bbox

## Stroke

* dotPoints
* splinePath
* order
* length

## Animation

* per-stroke timings
* easing
* jitter

## Scene

* text
* glyph instances
* animation settings
* background
* resolution

---

# Editor UX

## Views

1. **Text Input View** — enter text, pick font.
2. **Stroke Editor** — dot placement UI, stroke management.
3. **Animation Preview** — playback, scrub.
4. **Export View** — resolution + format.

## Stroke Editor Tools

* Add/move/delete dots
* Add/remove strokes
* Reverse direction
* Auto-smooth preview

---

# Animation Engine

## Responsibilities

* Arc-length parameterization of strokes
* Easing functions
* Stroke sequencing
* Timing generation

## Key Functions

* `computeArcLength(spline)`
* `getPointAtDistance(d)`
* `applyEasing(t)`
* `generateTimeline(strokes)`

---

# Rendering Engine

## Responsibilities

* Build reveal mask along spline
* Brush rendering
* Composite glyph and background

## Steps

1. Pre-render glyph
2. Build brush mask (union of circles)
3. Composite mask + glyph
4. Render final frame

---

# File Structure

```
src/
  fonts/
  glyph/
  stroke/
  animation/
  rendering/
  ui/
  export/
  utils/
assets/
config/
tests/
```

---

# Implementation Plan

## Phase 1: Foundations

* Implement glyph loading
* Implement dot-based stroke editor

## Phase 2: Animation

* Spline generation
* Arc-length parameterization
* Easing + timing engine

## Phase 3: Rendering

* Brush mask generation
* Frame compositing
* Real-time preview

## Phase 4: Export

* Render frames to buffer
* Encode to MP4/GIF

## Phase 5: Polish

* UI improvements
* Error handling
* Add second font

---

This bundle of documents provides granular technical detail needed for an AI-assisted editor to generate consistent, high-quality implementation code.
