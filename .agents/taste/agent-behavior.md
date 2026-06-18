# Agent Behavior Taste

- Reason about the user's underlying intent before acting; ask only when repo context cannot answer safely. Confidence: 0.90
- When adding a rule from a specific example, generalize to the right level and do not over-broaden it. Confidence: 0.90
- Never implement code unless the user clearly asks for implementation; if ambiguous, ask. Confidence: 0.95
- Suggest taste updates only when the pattern is durable and not already owned by formal docs. Confidence: 0.80
- Before implementing any change, state a plan in 3-5 bullet points. Confidence: 0.85
- For non-trivial changes, enumerate at least 3 edge cases before writing code. Confidence: 0.80
- When auditing data pipelines, systematically cross-reference every source field against every destination field in a visible matrix. Confidence: 0.90
