# Troubleshooting

**FFmpeg fails:** install FFmpeg with Homebrew, then rerun the render command.

**Premiere shows black:** use the generated `*_loop_30s.mov`; it is ProRes 4444 with alpha. If a PNG sequence is used, import the first frame as an Image Sequence.

**Validation fails:** make every frame the same width and height; add every non-`0` character to `palette` in `character.json`.

**The importer rejects a script:** this is intentional. It only parses the safe, known canvas format and never executes Bash.

**The local editor reports an error:** inspect `logs/dev-server.log`. Requests and server failures are appended there across restarts. The editor's **Activity** panel separately preserves editing and export actions and can download them as a text log.

**A pixel was removed accidentally:** click **Undo** or press `Command/Ctrl+Z`. Painting an already-matching color no longer erases a pixel; only the eraser removes pixels.
