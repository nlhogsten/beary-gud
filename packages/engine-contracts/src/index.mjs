const CAPABILITY_KEYS = Object.freeze([
  "create",
  "revise",
  "validate",
  "render",
  "export",
  "edit2d",
  "edit3d",
  "animate",
]);

const ENGINE_OPERATIONS = Object.freeze([
  "create",
  "revise",
  "validate",
  "render",
  "export",
]);

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export { CAPABILITY_KEYS, ENGINE_OPERATIONS };

export class EngineContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "EngineContractError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class EngineExecutionError extends EngineContractError {
  constructor(engineId, operation, cause) {
    super("engine_execution_failed", "The engine operation failed.", {
      engineId,
      operation,
    });
    this.name = "EngineExecutionError";
    Object.defineProperty(this, "cause", {
      configurable: false,
      enumerable: false,
      value: cause,
      writable: false,
    });
  }
}

function contractError(code, message, details) {
  throw new EngineContractError(code, message, details);
}

function requireRecord(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    contractError("invalid_engine_descriptor", `${field} must be an object.`, { field });
  }
}

function requireString(value, field, pattern) {
  if (typeof value !== "string" || value.length === 0 || (pattern && !pattern.test(value))) {
    contractError("invalid_engine_descriptor", `${field} is invalid.`, { field });
  }
}

function normalizeStringList(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    contractError("invalid_engine_descriptor", `${field} must contain only non-empty strings.`, { field });
  }

  if (new Set(value).size !== value.length) {
    contractError("invalid_engine_descriptor", `${field} must not contain duplicates.`, { field });
  }

  return Object.freeze([...value]);
}

function normalizeCapabilities(value) {
  requireRecord(value, "capabilities");
  const unknown = Object.keys(value).filter((key) => !CAPABILITY_KEYS.includes(key));
  if (unknown.length > 0) {
    contractError("invalid_engine_descriptor", "capabilities contains unsupported keys.", {
      field: "capabilities",
      unsupported: unknown.sort(),
    });
  }

  const capabilities = {};
  for (const key of CAPABILITY_KEYS) {
    if (typeof value[key] !== "boolean") {
      contractError("invalid_engine_descriptor", `capabilities.${key} must be a boolean.`, {
        field: `capabilities.${key}`,
      });
    }
    capabilities[key] = value[key];
  }

  return Object.freeze(capabilities);
}

export function validateEngineDescriptor(descriptor) {
  requireRecord(descriptor, "descriptor");
  requireString(descriptor.id, "id", ID_PATTERN);
  requireString(descriptor.version, "version", VERSION_PATTERN);
  requireString(descriptor.title, "title");

  return Object.freeze({
    id: descriptor.id,
    version: descriptor.version,
    title: descriptor.title,
    documentTypes: normalizeStringList(descriptor.documentTypes, "documentTypes"),
    inputTypes: normalizeStringList(descriptor.inputTypes, "inputTypes"),
    outputFormats: normalizeStringList(descriptor.outputFormats, "outputFormats"),
    capabilities: normalizeCapabilities(descriptor.capabilities),
  });
}

export function defineEngine(engine) {
  requireRecord(engine, "engine");
  const descriptor = validateEngineDescriptor(engine.descriptor);

  for (const operation of ENGINE_OPERATIONS) {
    const implemented = typeof engine[operation] === "function";
    const advertised = descriptor.capabilities[operation];
    if (advertised && !implemented) {
      contractError("missing_engine_handler", `Engine does not implement its advertised ${operation} capability.`, {
        engineId: descriptor.id,
        operation,
      });
    }
    if (!advertised && implemented) {
      contractError("unadvertised_engine_handler", `Engine implements ${operation} without advertising the capability.`, {
        engineId: descriptor.id,
        operation,
      });
    }
  }

  return Object.freeze({ ...engine, descriptor });
}

export class EngineRegistry {
  #engines = new Map();

  constructor(engines = []) {
    for (const engine of engines) this.register(engine);
  }

  register(engine) {
    const registered = defineEngine(engine);
    const { id } = registered.descriptor;
    if (this.#engines.has(id)) {
      contractError("duplicate_engine", "An engine with this ID is already registered.", { engineId: id });
    }
    this.#engines.set(id, registered);
    return registered.descriptor;
  }

  has(engineId) {
    return this.#engines.has(engineId);
  }

  list() {
    return [...this.#engines.values()]
      .map((engine) => engine.descriptor)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  getDescriptor(engineId) {
    return this.#requireEngine(engineId).descriptor;
  }

  async invoke(engineId, operation, request) {
    if (!ENGINE_OPERATIONS.includes(operation)) {
      contractError("unknown_engine_operation", "The requested engine operation is unknown.", {
        engineId,
        operation,
      });
    }

    const engine = this.#requireEngine(engineId);
    if (!engine.descriptor.capabilities[operation]) {
      contractError("unsupported_engine_capability", "The engine does not support this operation.", {
        engineId,
        operation,
      });
    }

    try {
      return await engine[operation](request, { descriptor: engine.descriptor });
    } catch (error) {
      throw new EngineExecutionError(engineId, operation, error);
    }
  }

  #requireEngine(engineId) {
    const engine = this.#engines.get(engineId);
    if (!engine) {
      contractError("engine_not_found", "The requested engine is not registered.", { engineId });
    }
    return engine;
  }
}
