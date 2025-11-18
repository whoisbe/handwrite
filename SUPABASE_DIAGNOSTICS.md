# Supabase 401 Error - Diagnostics

## Issue
Getting 401 Unauthorized when trying to save to Supabase.

## Likely Causes

### 1. Row Level Security (RLS) Policies Not Set
Supabase tables have RLS enabled by default. You need to add policies to allow anonymous inserts.

**Solution**: Run these SQL commands in Supabase SQL Editor:

```sql
-- Allow anonymous users to INSERT into fonts table
CREATE POLICY "Allow anonymous inserts to fonts"
ON fonts FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to INSERT into glyphs table
CREATE POLICY "Allow anonymous inserts to glyphs"
ON glyphs FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to INSERT into stroke_sets table
CREATE POLICY "Allow anonymous inserts to stroke_sets"
ON stroke_sets FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to UPDATE glyphs table
CREATE POLICY "Allow anonymous updates to glyphs"
ON glyphs FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to SELECT from all tables (for reading)
CREATE POLICY "Allow anonymous selects from fonts"
ON fonts FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous selects from glyphs"
ON glyphs FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous selects from stroke_sets"
ON stroke_sets FOR SELECT
TO anon
USING (true);
```

### 2. Tables Don't Exist
The tables might not be created yet.

**Check in Supabase Dashboard**:
1. Go to Table Editor
2. Verify tables exist: `fonts`, `glyphs`, `stroke_sets`
3. Check column names match your schema

### 3. Wrong Anon Key
The anonymous key might be incorrect.

**Verify**:
1. Go to Supabase Dashboard > Settings > API
2. Copy the "anon public" key
3. Update `.env` file

## Quick Test

After fixing policies, refresh the page and click "Test Sync Now" again. 

Check console for detailed error message with the new logging.
