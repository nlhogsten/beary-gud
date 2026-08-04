# Transparent Character Studio

Make crisp pixel characters and export transparent overlays for Premiere Pro. No screen recording, keying, or manual looping.

## Start the local editor

```bash
cd /Users/natehogsten/Desktop/terminal-character-studio
npm run dev
```

Open `http://localhost:4173`. The editor lets you create local draft characters, paint pixels, adjust preview settings, toggle effects, and export the current frame as a transparent PNG. Drafts are saved in your browser.

If port 4173 is already in use, the editor is probably already running; open the URL above. To restart it, stop the existing process with `Ctrl-C` in its original terminal, then run `npm run dev` once.

## Make or change a character

The local editor is for drafting. Production character data lives in `characters/<name>/`. Copy an existing character folder or create a new one, edit `character.json` and its frame files, then run:

```bash
npm run validate -- <name>
npm run render -- <name>
```

Production exports appear in `exports/<name>/`: a transparent PNG sequence, alpha MOV files, and a contact sheet. Import `<name>_loop_30s.mov` into Premiere for the ready-to-loop overlay.

For Codex-driven work, use the repo skill: `$transparent-character-studio`. See [the AI workflow](docs/AI_WORKFLOW.md).

## Old Bash animations

The safe importer supports a quoted canvas/palette/offset animation format. It reads source without executing it:

```bash
npm run import-bash -- /path/to/old-animation.sh new-character
npm run render -- new-character
```

Read [the usage guide](docs/USAGE_GUIDE.md), [animation guide](docs/ANIMATION_GUIDE.md), and [Bash migration guide](docs/BASH_MIGRATION.md).
