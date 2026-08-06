import assert from "node:assert/strict";
import test from "node:test";
import {
  EngineContractError,
  EngineExecutionError,
  EngineRegistry,
  defineEngine,
} from "../packages/engine-contracts/src/index.mjs";

const capabilities = (overrides = {}) => ({
  create: false,
  revise: false,
  validate: false,
  render: false,
  export: false,
  edit2d: false,
  edit3d: false,
  animate: false,
  ...overrides,
});

function animationEngine() {
  return {
    descriptor: {
      id: "transparent-character",
      version: "1.0.0",
      title: "Transparent character",
      documentTypes: ["voxl.transparent-character/v1"],
      inputTypes: ["application/json", "text/plain"],
      outputFormats: ["image/png", "video/quicktime"],
      capabilities: capabilities({ validate: true, animate: true }),
    },
    validate(document) {
      const ok = Array.isArray(document.frames);
      return {
        ok,
        issues: ok ? [] : [{ code: "frames_required", message: "Frames are required.", severity: "error" }],
      };
    },
  };
}

function humanoidSkinEngine() {
  return {
    descriptor: {
      id: "voxl-humanoid-skin",
      version: "1.0.0",
      title: "VOXL humanoid skin",
      documentTypes: ["voxl.humanoid-skin/v1"],
      inputTypes: ["image/png"],
      outputFormats: ["image/png"],
      capabilities: capabilities({ validate: true, render: true, edit2d: true, edit3d: true }),
    },
    validate(document) {
      const ok = document.width === 64 && document.height === 64 && document.pixels instanceof Uint8Array;
      return {
        ok,
        issues: ok ? [] : [{ code: "invalid_atlas", message: "A 64x64 RGBA atlas is required.", severity: "error" }],
      };
    },
    render({ document }) {
      return [{ filename: `${document.profile}.png`, mediaType: "image/png" }];
    },
  };
}

test("registers and discovers independent visual engines", () => {
  const registry = new EngineRegistry([humanoidSkinEngine(), animationEngine()]);

  assert.deepEqual(registry.list().map(({ id }) => id), ["transparent-character", "voxl-humanoid-skin"]);
  assert.equal(registry.getDescriptor("transparent-character").capabilities.animate, true);
  assert.equal(registry.getDescriptor("voxl-humanoid-skin").capabilities.edit3d, true);
});

test("invokes engines with incompatible document schemas without platform assumptions", async () => {
  const registry = new EngineRegistry([animationEngine(), humanoidSkinEngine()]);

  const animation = await registry.invoke("transparent-character", "validate", { frames: ["000.txt"] });
  const skin = await registry.invoke("voxl-humanoid-skin", "validate", {
    width: 64,
    height: 64,
    profile: "wide-arm-64",
    pixels: new Uint8Array(64 * 64 * 4),
  });

  assert.equal(animation.ok, true);
  assert.equal(skin.ok, true);
});

test("rejects duplicate engine IDs", () => {
  const registry = new EngineRegistry([animationEngine()]);

  assert.throws(
    () => registry.register(animationEngine()),
    (error) => error instanceof EngineContractError && error.code === "duplicate_engine",
  );
});

test("rejects capabilities that do not match implemented handlers", () => {
  const missingHandler = animationEngine();
  missingHandler.descriptor.capabilities.create = true;

  assert.throws(
    () => defineEngine(missingHandler),
    (error) => error instanceof EngineContractError && error.code === "missing_engine_handler",
  );

  const unadvertisedHandler = animationEngine();
  unadvertisedHandler.create = async () => ({ status: "succeeded" });
  assert.throws(
    () => defineEngine(unadvertisedHandler),
    (error) => error instanceof EngineContractError && error.code === "unadvertised_engine_handler",
  );
});

test("rejects unsupported operations with a serializable public error", async () => {
  const registry = new EngineRegistry([animationEngine()]);

  await assert.rejects(
    registry.invoke("transparent-character", "render", { frames: [] }),
    (error) => {
      assert.equal(error.code, "unsupported_engine_capability");
      assert.deepEqual(JSON.parse(JSON.stringify(error)), {
        name: "EngineContractError",
        code: "unsupported_engine_capability",
        message: "The engine does not support this operation.",
        details: { engineId: "transparent-character", operation: "render" },
      });
      return true;
    },
  );
});

test("sanitizes unexpected handler failures without exposing request content", async () => {
  const engine = animationEngine();
  engine.validate = () => {
    throw new Error("internal path /private/service and secret provider payload");
  };
  const registry = new EngineRegistry([engine]);
  const request = { prompt: "private user prompt" };

  await assert.rejects(registry.invoke("transparent-character", "validate", request), (error) => {
    assert.ok(error instanceof EngineExecutionError);
    const publicJson = JSON.stringify(error);
    assert.doesNotMatch(publicJson, /private user prompt|private\/service|provider payload/);
    assert.equal(error.code, "engine_execution_failed");
    return true;
  });
});

test("returns immutable normalized descriptors", () => {
  const source = animationEngine();
  const registry = new EngineRegistry([source]);
  source.descriptor.title = "Changed elsewhere";
  source.descriptor.inputTypes.push("application/octet-stream");

  const descriptor = registry.getDescriptor("transparent-character");
  assert.equal(descriptor.title, "Transparent character");
  assert.deepEqual(descriptor.inputTypes, ["application/json", "text/plain"]);
  assert.throws(() => descriptor.inputTypes.push("image/png"), TypeError);
});
