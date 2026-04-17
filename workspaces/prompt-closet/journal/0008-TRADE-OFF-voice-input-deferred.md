# TRADE-OFF: Voice Input Deferred to Phase 1.1

**Phase**: 02-todos
**Date**: 2026-04-17

## Trade-off

Voice input (microphone in Magic Bar) is deferred. Phase 1 ships text-only Magic Bar.

## Why Not Implement

- `expo-speech` provides text-to-speech (TTS) but limited speech-to-text (STT) on both iOS and Android
- No verified cross-platform STT API in the current dependency list
- Voice is "impressive to MBA audience" per UX design, but a broken voice feature on demo day is worse than no voice feature
- Text-only Magic Bar is fully functional and demonstrates the NL reasoning pipeline

## What Phase 1 Ships

- Magic Bar text input with full NL reasoning
- "Tap microphone" icon placeholder in UI (visually ready for voice, non-functional)
- Voice implementation as Phase 1.1 task with verified STT library

## Cost of Deferral

- Demo cannot show voice interaction
- The "impressive to MBA audience" moment from voice is lost
- This is acceptable — the Stream of Thought processing and outfit reasoning are the substantive ML demonstrations

## Filed As

- `todos/active/Phase-1-Task-Breakdown.md` § Decision D3
- `journal/0005-GAP-voice-input-not-fully-specified.md`
