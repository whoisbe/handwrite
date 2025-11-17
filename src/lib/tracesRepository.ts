import { supabase } from "./supabaseClient";
import { Stroke } from "../types/stroke";

interface IdRow {
  id: string;
}

interface StrokeSetRow {
  id: string;
  strokes: Stroke[];
  version: number;
}

const fontCache = new Map<string, string>();
const glyphCache = new Map<string, string>();

function fontNameToSlug(fontName: string) {
  return fontName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function glyphCacheKey(fontId: string, char: string) {
  return `${fontId}:${char}`;
}

async function getOrCreateFont(fontName: string): Promise<{ id: string; slug: string }> {
  const slug = fontNameToSlug(fontName);
  if (fontCache.has(slug)) {
    return { id: fontCache.get(slug) as string, slug };
  }

  const { data, error } = await supabase
    .from("fonts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    fontCache.set(slug, data.id);
    return { id: data.id, slug };
  }

  const { data: insertData, error: insertError } = await supabase
    .from("fonts")
    .insert({ slug, display_name: fontName })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  fontCache.set(slug, insertData.id);
  return { id: insertData.id, slug };
}

async function getGlyph(fontId: string, char: string, createIfMissing: boolean) {
  const cacheKey = glyphCacheKey(fontId, char);
  if (glyphCache.has(cacheKey)) {
    return glyphCache.get(cacheKey) as string;
  }

  const { data, error } = await supabase
    .from("glyphs")
    .select("id")
    .eq("font_id", fontId)
    .eq("unicode_codepoint", char)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    glyphCache.set(cacheKey, data.id);
    return data.id;
  }

  if (!createIfMissing) {
    return undefined;
  }

  const { data: insertData, error: insertError } = await supabase
    .from("glyphs")
    .insert({ font_id: fontId, unicode_codepoint: char })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  glyphCache.set(cacheKey, insertData.id);
  return insertData.id;
}

async function fetchLatestStrokeSet(glyphId: string): Promise<Stroke[] | undefined> {
  const { data, error } = await supabase
    .from("stroke_sets")
    .select("id, strokes, version")
    .eq("glyph_id", glyphId)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.strokes;
}

async function fetchNextVersion(glyphId: string): Promise<number> {
  const { data, error } = await supabase
    .from("stroke_sets")
    .select("version")
    .eq("glyph_id", glyphId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.version ?? 0) + 1;
}

export async function fetchGlyphStrokes(fontName: string, char: string): Promise<Stroke[] | undefined> {
  if (!fontName || !char) {
    return undefined;
  }

  try {
    const { id: fontId } = await getOrCreateFont(fontName);
    const glyphId = await getGlyph(fontId, char, false);
    if (!glyphId) {
      return undefined;
    }
    return await fetchLatestStrokeSet(glyphId);
  } catch (error) {
    console.error("Failed to fetch glyph strokes", { fontName, char, error });
    return undefined;
  }
}

export async function saveGlyphStrokes(fontName: string, char: string, strokes: Stroke[], options?: { userId?: string }) {
  if (!fontName || !char || strokes.length === 0) {
    return;
  }

  const { id: fontId } = await getOrCreateFont(fontName);
  const glyphId = await getGlyph(fontId, char, true);
  if (!glyphId) {
    throw new Error("Unable to resolve glyph id");
  }

  const nextVersion = await fetchNextVersion(glyphId);

  const { data, error } = await supabase
    .from("stroke_sets")
    .insert({
      glyph_id: glyphId,
      version: nextVersion,
      status: "approved",
      strokes,
      created_by: options?.userId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await supabase
    .from("glyphs")
    .update({ current_stroke_set_id: data.id })
    .eq("id", glyphId);
}