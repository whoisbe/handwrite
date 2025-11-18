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

export interface GlyphData {
  char: string;
  strokes: Stroke[];
  version: number;
  fontId: string;
  glyphId: string;
  timestamp: number;
}

/**
 * Fetches all glyphs for a font with their latest approved stroke sets.
 * Returns an array of glyph data including metadata.
 */
export async function fetchAllGlyphsForFont(fontName: string): Promise<GlyphData[]> {
  if (!fontName) {
    return [];
  }

  try {
    const { id: fontId } = await getOrCreateFont(fontName);
    
    // First, fetch all glyphs for this font
    const { data: glyphs, error: glyphsError } = await supabase
      .from("glyphs")
      .select("id, unicode_codepoint")
      .eq("font_id", fontId);

    if (glyphsError) {
      console.error("Failed to fetch glyphs for font", { fontName, error: glyphsError });
      throw glyphsError;
    }

    if (!glyphs || glyphs.length === 0) {
      return [];
    }

    // For each glyph, fetch the latest approved stroke set
    const results: GlyphData[] = [];

    for (const glyph of glyphs) {
      if (!glyph.unicode_codepoint) {
        continue;
      }

      const char = glyph.unicode_codepoint;
      
      // Fetch latest approved stroke set for this glyph
      const { data: strokeSet, error: strokeSetError } = await supabase
        .from("stroke_sets")
        .select("id, strokes, version, created_at")
        .eq("glyph_id", glyph.id)
        .eq("status", "approved")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (strokeSetError) {
        console.error(`Failed to fetch stroke set for glyph ${char}`, strokeSetError);
        continue;
      }

      if (!strokeSet || !strokeSet.strokes) {
        continue;
      }

      // Convert created_at to timestamp
      const timestamp = strokeSet.created_at
        ? new Date(strokeSet.created_at).getTime()
        : Date.now();

      results.push({
        char,
        strokes: strokeSet.strokes as Stroke[],
        version: strokeSet.version,
        fontId: fontId,
        glyphId: glyph.id,
        timestamp,
      });
    }

    console.log(`✓ Fetched ${results.length} glyph(s) for font "${fontName}"`);
    return results;
  } catch (error) {
    console.error("Failed to fetch all glyphs for font", { fontName, error });
    return [];
  }
}

export async function saveGlyphStrokes(fontName: string, char: string, strokes: Stroke[], options?: { userId?: string; deviceId?: string }) {
  if (!fontName || !char || strokes.length === 0) {
    return;
  }

  console.log(`[tracesRepository] Saving to Supabase: ${fontName} "${char}"`);
  if (options?.deviceId) {
    console.log(`[tracesRepository] Device ID: ${options.deviceId}`);
  }
  
  const { id: fontId } = await getOrCreateFont(fontName);
  console.log(`[tracesRepository] Font ID: ${fontId}`);
  
  const glyphId = await getGlyph(fontId, char, true);
  if (!glyphId) {
    throw new Error("Unable to resolve glyph id");
  }
  console.log(`[tracesRepository] Glyph ID: ${glyphId}`);

  const nextVersion = await fetchNextVersion(glyphId);
  console.log(`[tracesRepository] Next version: ${nextVersion}`);

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
    console.error("[tracesRepository] Error inserting stroke_set:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Supabase insert failed: ${error.message} (code: ${error.code})`);
  }

  console.log(`[tracesRepository] Stroke set created: ${data.id}`);

  const { error: updateError } = await supabase
    .from("glyphs")
    .update({ current_stroke_set_id: data.id })
    .eq("id", glyphId);
  
  if (updateError) {
    console.error("[tracesRepository] Error updating glyph:", updateError);
    throw updateError;
  }
  
  console.log(`[tracesRepository] Successfully saved: ${fontName} "${char}"`);
}