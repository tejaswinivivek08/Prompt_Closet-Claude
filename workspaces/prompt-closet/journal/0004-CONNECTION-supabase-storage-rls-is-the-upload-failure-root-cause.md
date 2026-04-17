# CONNECTION: Supabase Storage RLS Is the Root Cause of Upload Failures

**Phase**: 01-analysis
**Date**: 2026-04-17

## Connection

Two independent analysis documents flagged "upload fails silently" as a Major risk:

- `01-analysis/01-failure-analysis.md` Risk R4: Expo-to-Supabase Storage fails silently
- `01-analysis/03-requirements-gaps.md` Gap G1: Error handling for upload-to-embedding chain

Both trace to the **same root cause**: Supabase Storage requires Row Level Security (RLS) policies on the `storage.objects` table. Without explicit INSERT policies, authenticated users cannot upload files. The error is a generic "Unauthorized" wrapped poorly by `@supabase/storage-js`.

## The Non-Obvious Part

The RLS policies on the `storage.objects` table are **separate** from the RLS policies on the `clothing_items` database table. Most developers set up database RLS correctly but forget Storage RLS. This is the most common Supabase Storage misconfiguration.

## Implication

The architecture plan and image-pipeline spec must explicitly include Storage RLS policy setup as a required step — not optional, not assumed.

## Filed As

- `specs/image-pipeline.md` (Storage RLS section)
- `02-plans/01-architecture.md` (Week 1 foundation step)
