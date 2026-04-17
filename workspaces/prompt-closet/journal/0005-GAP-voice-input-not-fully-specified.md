# GAP: Voice Input Implementation Not Fully Specified

**Phase**: 01-analysis
**Date**: 2026-04-17

## Gap

The Magic Bar spec (magic-bar.md) includes voice input as a primary feature:

- "Tap microphone to start recording"
- "Press-and-hold also supported"
- "Voice icon pulses amber while recording"

But the implementation plan (02-plans/01-architecture.md) contains **zero** details on:

- Which speech-to-text API (Expo Speech, iOS Speech framework, Android Speech API)
- How voice is transcribed and displayed inline before submission
- Error handling for microphone permission denial
- Offline voice capability

## Why This Matters

Voice is flagged as "critical for the demo" in the UX design (§3.2) because users may be dressing while holding the phone. But the tech stack plan does not include any speech-to-text library or API.

## Resolution Needed

Either:

1. Add voice implementation to Phase 1 scope (requires speech-to-text API)
2. Defer voice to Phase 1.1 and show only text input in demo
3. Use Expo Speech module (if available) — needs verification

## Filed As

- `specs/magic-bar.md` §3.1 (unspecified implementation)
- `02-plans/01-architecture.md` (missing voice layer)
