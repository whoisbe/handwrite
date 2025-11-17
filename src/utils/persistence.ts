import { Stroke } from "../types/stroke";

const STORAGE_KEY = "handwrite-traces-v1";

interface TraceStore {
  [font: string]: {
    [char: string]: Stroke[];
  };
}

const isBrowser = typeof window !== "undefined";

function readStore(): TraceStore {
  if (!isBrowser) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as TraceStore;
  } catch (error) {
    console.error("Failed to read trace store", error);
    return {};
  }
}

function writeStore(store: TraceStore) {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to persist trace store", error);
  }
}

function cloneStroke(stroke: Stroke): Stroke {
  return {
    ...stroke,
    dots: stroke.dots.map((point) => ({ ...point })),
    splinePoints: stroke.splinePoints.map((point) => ({ ...point })),
    cumulativeDistances: [...stroke.cumulativeDistances],
  };
}

function cloneStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map(cloneStroke);
}

export function persistGlyphStrokes(font: string, character: string, strokes: Stroke[]) {
  if (!font || !character || strokes.length === 0) {
    return;
  }

  const charKey = character;
  const store = readStore();
  const fontBucket = store[font] ?? {};
  fontBucket[charKey] = cloneStrokes(strokes);
  store[font] = fontBucket;
  writeStore(store);
}

export function loadStrokesForText(text: string, font: string): Record<number, Stroke[]> {
  if (!font || !text) {
    return {};
  }

  const store = readStore();
  const fontBucket = store[font];
  if (!fontBucket) {
    return {};
  }

  const hydrated: Record<number, Stroke[]> = {};
  Array.from(text).forEach((char, index) => {
    const charKey = char;
    const stored = fontBucket[charKey];
    if (stored?.length) {
      hydrated[index] = cloneStrokes(stored);
    }
  });

  return hydrated;
}

export function loadStrokesForGlyph(font: string, character: string): Stroke[] | undefined {
  if (!font || !character) {
    return undefined;
  }

  const store = readStore();
  const charKey = character;
  const stored = store[font]?.[charKey];
  if (!stored?.length) {
    return undefined;
  }

  return cloneStrokes(stored);
}
