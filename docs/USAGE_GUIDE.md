# Usage guide

1. Start the editor with `npm run dev`, then open `http://localhost:4173`.
2. Create or select a draft character, choose a palette color, and click canvas cells to paint. The timeline controls the preview frame; inspector controls and effects update the preview. Drafts are stored in the browser.
3. Use **Export PNG** to download the current transparent frame.
4. For a production character, keep its source in `characters/<name>/` and run `npm run validate -- <name>`, then `npm run render -- <name>`.
5. Review `exports/<name>/<name>_contact-sheet.png`. In Premiere, import `<name>_loop_30s.mov`; it already has alpha and repeats for 30 seconds.

Use the PNG sequence when you need to alter individual frames. Use the MOV for the quick workflow.
