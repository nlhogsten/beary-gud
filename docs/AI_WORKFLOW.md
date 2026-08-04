# AI workflow

Use `$transparent-character-studio` from this repository. Ask naturally, for example:

- “Create a four-frame sleepy fox that blinks and emits blue smoke.”
- “Convert `old-character.sh`, make the smoke less dense, and export a 20-second alpha loop.”
- “Create a new scene where this character drifts upward with a rainbow trail.”

Codex should create or version source data, validate it, render it, inspect the generated alpha outputs, and return the exact export paths. It must not execute pasted animation scripts.
