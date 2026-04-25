---
type: RISK
status: active
date: 2026-04-18
created_at: 2026-04-18T00:00:00Z
author: agent
session_id: current
project: prompt-closet
topic: fashn-dpa-unverified-body-photos
phase: analyze
tags: [privacy, digital-twin, legal, phase2]
---

# FASHN DPA unverified — body photo processing is legal liability

**Risk**: The digital twin spec assumes FASHN's data processing agreement covers:
- No persistence of uploaded body photos after processing
- Erasure on request capability
- Cross-border transfer compliance (GDPR SCCs if EU-processed)

None of these have been verified. The consent banner in the spec claims "FASHN does not store your image" — but this is unverified. Under India's DPDP Act, false consent disclosures are a violation.

**Why this matters**: Body photos are biometric-adjacent data. Processing them through an unverified third-party DPA is a legal exposure before production launch.

**Mitigation required before Phase 2 ships**:
1. Contact FASHN directly to obtain and review DPA
2. Verify erasure mechanism (API vs email)
3. If FASHN cannot provide compliant DPA: switch to self-hosted (Lambda + FASHN VTON open weights)
4. Update consent banner copy to be accurate post-DPA review

**Fallback**: Self-hosted try-on via Lambda GPU instance (~$2.79/hr A100) — no cross-border transfer issue, full control.

**For Discussion**:
- Is the demo day timeline compatible with DPA verification?
- Should we default to self-hosted to avoid third-party compliance burden?
