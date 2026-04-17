# Self-Pressure Test

This tool is being built by an AI agent under operator steering.

That matters because the API it exposes is mainly meant to be used by AI. The human operator governs the direction, but the day-to-day pressure test is: does this interface actually help the AI do its job well?

That means tool-use friction is not just annoyance. It is design feedback.

Examples:

- the API does not describe itself clearly enough
- the AI has to read source files just to figure out what it can ask
- the API answers the wrong question, or answers too weakly to support a confident next step
- continuation hints are missing, vague, or not honest about blockers
- the same question keeps forcing source spelunking instead of being answerable through the read surface

Right now there is no write surface yet, so it is normal that code changes still require opening source files. But the read surface should keep getting stronger. Ideally, the AI should be able to understand what it needs to understand by using the API itself, and only open source when it is time to actually change code.

So the standing question is:

Is this API helping the AI engineer work with clarity, confidence, and good reviewability?

If the answer is no, that is not just usage friction. It is a signal that the product still has a missing capability, a missing explanation, or a poor abstraction boundary.
