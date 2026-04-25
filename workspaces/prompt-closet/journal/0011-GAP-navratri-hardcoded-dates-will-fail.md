---
type: GAP
status: active
date: 2026-04-18
created_at: 2026-04-18T00:00:00Z
author: agent
session_id: current
project: prompt-closet
topic: navratri-hardcoded-dates-will-fail
phase: analyze
tags: [indian-occasion, navratri, bug, phase2]
---

# Navratri hardcoded dates are year-specific and will fail

**Gap**: Phase 2 plan seeds Navratri dates as `2026-03/04` and `2026-04/05` — ambiguous and wrong. Chaitra Navratri 2026 falls in March/April (spring), Ashwin Navratri falls in September/October (autumn). The plan uses the wrong months and the format is unintelligible.

**Why this matters**: A feature that gives wrong day-color recommendations after September 2026 is worse than no feature — it demonstrates the system cannot be trusted.

**Root cause**: Hindu calendar dates depend on lunar tithis, not Gregorian months. There is no lunar calendar library in the tech stack.

**Fix options**:
1. **Remove Navratri day-color feature** from Phase 2 scope — keep occasion profiles but no per-day colors
2. **Use an Indian holiday calendar API** — there are APIs that return accurate Navratri/Chaitra dates
3. **Make금 it user-input** — ask "which Navratri are you celebrating?" with manual date entry
4. **Subscribe to a lunar calendar service** — lunar date computation is available via library

**Recommendation**: Remove per-day Navratri color logic from Phase 2. Keep the general "festive/Navratri" occasion profile without day-specific colors. Add dynamic date resolution as a future enhancement.

**For Discussion**:
- Is per-day Navratri color a must-have for Phase 2 demo?
- Should we use a holiday API or remove the feature?
