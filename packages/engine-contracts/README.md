# `@voxl/engine-contracts`

Dependency-free runtime contracts and TypeScript declarations for registering and invoking independent VOXL visual engines.

This package intentionally contains no visual-format schema and no generation-provider implementation. Engines own their documents; providers remain replaceable behind engine capabilities.

```js
import { EngineRegistry } from "./src/index.mjs";

const registry = new EngineRegistry();
registry.register({
  descriptor: {
    id: "example-visual",
    version: "1.0.0",
    title: "Example visual",
    documentTypes: ["voxl.example/v1"],
    inputTypes: ["text/plain"],
    outputFormats: ["image/png"],
    capabilities: {
      create: false,
      revise: false,
      validate: true,
      render: false,
      export: false,
      edit2d: false,
      edit3d: false,
      animate: false,
    },
  },
  validate(document) {
    return { ok: document !== null, issues: [] };
  },
});
```

The local engine-neutral harness is available with `npm run voxl -- engines`, `npm run voxl -- describe <engine-id>`, and `npm run voxl -- invoke <engine-id> <operation> <request.json>`.
