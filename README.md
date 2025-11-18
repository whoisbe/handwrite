# Handwrite

A React + TypeScript application for creating realistic handwriting-style text animations. Trace letter paths with dots, generate smooth splines, and animate text reveal along those paths with natural timing and easing.

![Handwrite](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Vite](https://img.shields.io/badge/Vite-6.5.5-646CFF)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)

## 🎯 Overview

Handwrite enables users to create handwriting-style animations by:

1. **Selecting a font** from a curated list of handwriting fonts
2. **Tracing letter paths** by placing dots along the desired writing trajectory
3. **Auto-generating smooth splines** from those dots using Catmull-Rom interpolation
4. **Previewing animations** that reveal text progressively along the stroke paths
5. **Saving and syncing** stroke data with hybrid persistence (localStorage + Supabase)

Perfect for creating engaging text animations, educational content, or artistic handwriting effects.

## ✨ Features

### Core Functionality
- **Interactive Stroke Editor**: Click to place dots along your desired writing path
- **Real-time Spline Preview**: See smooth curves generated from your dots as you place them
- **Multi-stroke Support**: Create multiple strokes per character for complex letters
- **Mask-based Animation**: Text reveals progressively following your stroke paths with brush-like effects
- **Full Word Animation**: Animate entire words with proper character spacing and sequencing
- **Speed Control**: Adjustable animation speed multiplier (1x to 4x)
- **Offline Capability**: Hybrid persistence with instant local saves and background cloud sync

### Font Support
Currently supports 6 handwriting fonts:
- Gloria Hallelujah
- Permanent Marker
- Indie Flower
- Caveat
- Dancing Script
- Nanum Brush Script

### Animation Features
- **Easing Functions**: Linear, easeIn, easeOut, easeInOut for natural motion
- **Configurable Timing**: Adjustable stroke duration, gaps between strokes, and character delays
- **Sequential Playback**: Strokes animate in order with natural pauses
- **Visual Feedback**: Numbered dots, color-coded strokes, and hover previews

### Data Persistence
- **Hybrid Storage**: Immediate saves to localStorage + background sync to Supabase
- **Version Control**: Tracked stroke sets with version history
- **Cross-device Sync**: Access your strokes from any device once synced
- **Automatic Retry**: Failed syncs stay in queue and retry automatically

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase project (for cloud persistence - optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/whoisbe/handwrite.git
   cd handwrite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase (optional)**
   
   If you want cloud persistence, create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   See `supabase_policies.sql` for required database schema.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

### Building for Production

```bash
npm run build
```

The built files will be in the `build/` directory.

## 📖 How to Use

### Creating Stroke Paths

1. **Enter text** (up to 6 characters) in the text input field
2. **Select a font** from the dropdown
3. **Click on the left canvas** to place dots along your desired writing path
   - Minimum 2 dots required per stroke
   - Place dots where you want the pen to travel
4. **Complete a stroke** by:
   - Double-clicking anywhere
   - Clicking an existing dot
   - Clicking the "Step Forward" button
5. **Create multiple strokes** for complex letters (e.g., "A" needs 3 strokes)
6. **Preview your animation** by clicking the "Play" button on the right canvas

### Controls

- **↶ Undo**: Remove the last dot or last completed stroke
- **⊗ Clear**: Reset all strokes for the current character
- **▶| Step Forward**: Complete current stroke and move to next character
- **✓ Check**: Save all strokes (syncs to localStorage immediately, then Supabase)
- **▶ Play**: Start/stop animation playback
- **Speed Slider**: Adjust animation speed (1x to 4x)

### Navigation

- The app displays one character at a time in the editor
- Use "Step Forward" to save the current character and move to the next
- Animation preview shows all characters together with proper spacing
- Character indicator shows your position (e.g., "A (1/3)")

## 🏗️ Architecture

### Core Components

- **`StrokeEditorCanvas.tsx`**: Interactive canvas for dot placement and stroke editing
- **`AnimationPlayerCanvas.tsx`**: Canvas for animation playback with mask-based reveal
- **`App.tsx`**: Main application with state management and UI controls

### Key Utilities

- **`spline.ts`**: Catmull-Rom spline generation and arc-length parameterization
- **`easing.ts`**: Timing functions for natural animation motion
- **`layout.ts`**: Character positioning and layout calculations
- **`fontLoader.ts`**: Font loading utilities with proper async handling

### Data Layer

- **`hybridPersistence.ts`**: Hybrid storage with localStorage + Supabase sync
- **`tracesRepository.ts`**: Supabase data access layer
- **`deviceId.ts`**: Unique device identification for sync tracking

### Project Structure

```
src/
├── components/
│   ├── StrokeEditorCanvas.tsx    # Left panel: stroke editor
│   ├── AnimationPlayerCanvas.tsx  # Right panel: animation player
│   └── ui/                        # Reusable UI components
├── lib/
│   ├── hybridPersistence.ts      # Storage layer
│   ├── tracesRepository.ts       # Supabase repository
│   └── supabaseClient.ts         # Supabase configuration
├── utils/
│   ├── spline.ts                 # Spline algorithms
│   ├── easing.ts                 # Animation easing
│   ├── layout.ts                 # Character layout
│   └── fontLoader.ts             # Font utilities
├── types/
│   └── stroke.ts                 # TypeScript definitions
└── App.tsx                        # Main application
```

## 🔧 Technical Details

### Spline Generation
- Uses **Catmull-Rom interpolation** for natural handwriting curves
- Passes through all user-placed control points
- Generates smooth, continuous paths

### Animation System
- **Arc-length parameterization**: Ensures constant speed along curved paths
- **Mask-based reveal**: Brush stamps follow spline paths
- **Composite operations**: Progressive text revelation using canvas blending modes
- **Timeline management**: Handles stroke sequencing, gaps, and character transitions

### Coordinate System
- Logical canvas size: 800x400px
- Strokes stored in normalized logical coordinates
- Responsive scaling for different display sizes
- Proper device pixel ratio handling for high-DPI displays

### Data Models

```typescript
interface Stroke {
  id: string;
  dots: Point[];                    // User-placed control points
  splinePoints: Point[];            // Generated smooth curve points
  cumulativeDistances: number[];    // Arc-length parameterization
  order: number;                    // Stroke sequence order
}
```

## 🧪 Development

### Debug Features

The app includes a debug section with:
- Sync status monitoring
- Manual sync trigger
- localStorage inspection
- Saved data JSON export

### Branch Structure

- `main`: Stable production branch
- `feature/zoom-functionality`: Zoom feature exploration (stashed)
- `feature/font-size-and-animation-fix`: Font size and animation scaling experiments (stashed)

## 📝 License

This project is private and not licensed for public use.

## 🙏 Acknowledgments

- Original Figma design: [Font Picker and Canvas](https://www.figma.com/design/SVFM4J5Pfe7RiKYUZkBKc0/Font-Picker-and-Canvas)
- Fonts provided by Google Fonts
- Built with React, TypeScript, Vite, and Supabase

## 🔮 Future Enhancements

Potential features for future development:
- Video/GIF export
- Additional font support
- Stroke path auto-suggestion
- More easing functions
- Stroke pressure variation
- Customizable brush sizes
- Export to various formats

---

**Made with ❤️ for creating beautiful handwriting animations**
