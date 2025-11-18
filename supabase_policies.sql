-- Enable RLS policies for anonymous access
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous selects from fonts" ON fonts;
DROP POLICY IF EXISTS "Allow anonymous inserts to fonts" ON fonts;
DROP POLICY IF EXISTS "Allow anonymous selects from glyphs" ON glyphs;
DROP POLICY IF EXISTS "Allow anonymous inserts to glyphs" ON glyphs;
DROP POLICY IF EXISTS "Allow anonymous updates to glyphs" ON glyphs;
DROP POLICY IF EXISTS "Allow anonymous selects from stroke_sets" ON stroke_sets;
DROP POLICY IF EXISTS "Allow anonymous inserts to stroke_sets" ON stroke_sets;

-- Allow anonymous users to SELECT from fonts table
CREATE POLICY "Allow anonymous selects from fonts"
ON fonts FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to INSERT into fonts table
CREATE POLICY "Allow anonymous inserts to fonts"
ON fonts FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to SELECT from glyphs table
CREATE POLICY "Allow anonymous selects from glyphs"
ON glyphs FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to INSERT into glyphs table
CREATE POLICY "Allow anonymous inserts to glyphs"
ON glyphs FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to UPDATE glyphs table
CREATE POLICY "Allow anonymous updates to glyphs"
ON glyphs FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to SELECT from stroke_sets table
CREATE POLICY "Allow anonymous selects from stroke_sets"
ON stroke_sets FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to INSERT into stroke_sets table
CREATE POLICY "Allow anonymous inserts to stroke_sets"
ON stroke_sets FOR INSERT
TO anon
WITH CHECK (true);

-- Verify policies were created
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('fonts', 'glyphs', 'stroke_sets')
ORDER BY tablename, policyname;
