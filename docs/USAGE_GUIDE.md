# `transparent-character` engine usage guide

This is the current working engine descended from the original Bash character workflow. VOXL planning preserves it as an independent engine; `voxl-humanoid-skin` and future visual asset types will use separate documents, validators, renderers, editors, and exports. Engine names describe their visual artifact, never an external target product.

1. Start the editor with `npm run dev`, then open `http://localhost:4173`.
2. Create or select a draft character, choose a palette color, and click canvas cells to paint. Painting a pixel with its existing color does nothing; use **Erase** to remove it. **Undo**, **Redo**, **Pick**, and **Add color** are available above and below the canvas. The timeline controls the preview frame; inspector controls and effects update the preview. Drafts, undo history, and the activity log are stored in the browser.
3. Use **Export animation** for a looping transparent animated PNG or sprite sheet. Use **Export current frame** for a still transparent PNG.
4. For a production character, keep its source in `characters/<name>/` and run `npm run validate -- <name>`, then `npm run render -- <name>`.
5. Review `exports/<name>/<name>_contact-sheet.png`. In Premiere, import `<name>_loop_30s.mov`; it already has alpha and repeats for 30 seconds.

Use the PNG sequence when you need to alter individual frames. Use the MOV for the quick workflow.

For the componentized platform direction, read [VOXL product research and architecture](VOXL_PRODUCT_RESEARCH.md) and [VOXL implementation plan](VOXL_IMPLEMENTATION_PLAN.md).
