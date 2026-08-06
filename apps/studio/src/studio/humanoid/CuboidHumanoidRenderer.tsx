"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import * as THREE from "three";
import {
  CUBOID_HUMANOID_RENDERER_ID,
  skinProfile,
  uvToAtlasPixel,
  type SkinLayer,
  type SkinPart,
  type SkinProfileId,
  type SkinRegion,
} from "./core";
import styles from "../StudioShell.module.css";

interface RendererProps {
  pixels: Uint8ClampedArray;
  profile: SkinProfileId;
  layers: Record<SkinLayer, boolean>;
  parts: Record<SkinPart, boolean>;
  onInspect: (region: SkinRegion, x: number, y: number) => void;
  onPaint: (x: number, y: number) => void;
  interactionMode: "edit" | "orbit";
}

interface PartShape {
  width: number;
  height: number;
  depth: number;
  position: readonly [number, number, number];
}

interface FacePlacement {
  width: number;
  height: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
}

interface RendererRuntime {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  character: THREE.Group;
  raycaster: THREE.Raycaster;
  meshes: THREE.Mesh[];
  resize: ResizeObserver;
}

function facePlacement(shape: PartShape, face: SkinRegion["face"], padding: number): FacePlacement {
  const halfWidth = shape.width / 2 + padding;
  const halfHeight = shape.height / 2 + padding;
  const halfDepth = shape.depth / 2 + padding;
  switch (face) {
    case "front": return { width: shape.width + padding * 2, height: shape.height + padding * 2, position: [0, 0, halfDepth], rotation: [0, 0, 0] };
    case "back": return { width: shape.width + padding * 2, height: shape.height + padding * 2, position: [0, 0, -halfDepth], rotation: [0, Math.PI, 0] };
    case "right": return { width: shape.depth + padding * 2, height: shape.height + padding * 2, position: [-halfWidth, 0, 0], rotation: [0, -Math.PI / 2, 0] };
    case "left": return { width: shape.depth + padding * 2, height: shape.height + padding * 2, position: [halfWidth, 0, 0], rotation: [0, Math.PI / 2, 0] };
    case "top": return { width: shape.width + padding * 2, height: shape.depth + padding * 2, position: [0, halfHeight, 0], rotation: [-Math.PI / 2, 0, 0] };
    case "bottom": return { width: shape.width + padding * 2, height: shape.depth + padding * 2, position: [0, -halfHeight, 0], rotation: [Math.PI / 2, 0, 0] };
  }
}

function atlasCanvas(pixels: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
  return canvas;
}

function faceTexture(atlas: HTMLCanvasElement, region: SkinRegion) {
  const canvas = document.createElement("canvas");
  canvas.width = region.width;
  canvas.height = region.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.imageSmoothingEnabled = false;
  context.drawImage(atlas, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function clearCharacter(runtime: RendererRuntime) {
  for (const mesh of runtime.meshes) {
    mesh.geometry.dispose();
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
    mesh.removeFromParent();
  }
  runtime.meshes = [];
}

function renderCharacter(runtime: RendererRuntime, props: Pick<RendererProps, "pixels" | "profile" | "layers" | "parts">) {
  clearCharacter(runtime);
  const profile = skinProfile(props.profile);
  const atlas = atlasCanvas(props.pixels, profile.width, profile.height);
  for (const region of profile.regions) {
    if (!props.layers[region.layer] || !props.parts[region.part]) continue;
    const shape = profile.geometry.parts[region.part];
    const padding = region.layer === "outer" ? profile.geometry.outerLayerOffset : 0;
    const placement = facePlacement(shape, region.face, padding);
    const geometry = new THREE.PlaneGeometry(placement.width, placement.height);
    const material = new THREE.MeshBasicMaterial({
      alphaTest: 0.01,
      map: faceTexture(atlas, region),
      side: THREE.DoubleSide,
      transparent: region.layer === "outer",
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      shape.position[0] + placement.position[0],
      shape.position[1] + placement.position[1],
      shape.position[2] + placement.position[2],
    );
    mesh.rotation.set(...placement.rotation);
    mesh.userData.region = region;
    runtime.character.add(mesh);
    runtime.meshes.push(mesh);
  }
  runtime.renderer.render(runtime.scene, runtime.camera);
}

export function CuboidHumanoidRenderer(props: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<RendererRuntime | undefined>(undefined);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-18, 18, 20, -20, 0.1, 100);
    camera.position.set(0, 18, 48);
    camera.lookAt(0, 16, 0);
    const character = new THREE.Group();
    character.rotation.x = -0.08;
    character.rotation.y = 0.42;
    scene.add(character);
    const runtime: RendererRuntime = {
      renderer,
      scene,
      camera,
      character,
      raycaster: new THREE.Raycaster(),
      meshes: [],
      resize: new ResizeObserver(() => {
        const bounds = canvas.getBoundingClientRect();
        renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
        const aspect = Math.max(0.5, bounds.width / Math.max(1, bounds.height));
        camera.left = -20 * aspect;
        camera.right = 20 * aspect;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      }),
    };
    runtimeRef.current = runtime;
    runtime.resize.observe(canvas);
    renderCharacter(runtime, propsRef.current);
    return () => {
      runtime.resize.disconnect();
      clearCharacter(runtime);
      renderer.dispose();
      runtimeRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) renderCharacter(runtime, props);
  }, [props.layers, props.parts, props.pixels, props.profile]);

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragRef.current = { active: true, moved: false, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag.active) return;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.moved || propsRef.current.interactionMode !== "orbit") return;
    runtime.character.rotation.y += dx * 0.007;
    runtime.character.rotation.x = Math.max(-0.65, Math.min(0.65, runtime.character.rotation.x + dy * 0.005));
    runtime.renderer.render(runtime.scene, runtime.camera);
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    drag.active = false;
    if (drag.moved || propsRef.current.interactionMode !== "edit") return;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    runtime.raycaster.setFromCamera(new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    ), runtime.camera);
    const hits = runtime.raycaster.intersectObjects(runtime.meshes, false);
    const paintable = hits.find((hit) => {
      const region = hit.object.userData.region as SkinRegion | undefined;
      if (!hit.uv || !region) return false;
      if (region.layer !== "outer") return true;
      const pixel = uvToAtlasPixel(region, hit.uv.x, hit.uv.y);
      const profile = skinProfile(propsRef.current.profile);
      return propsRef.current.pixels[(pixel.y * profile.width + pixel.x) * 4 + 3] !== 0;
    });
    const region = paintable?.object.userData.region as SkinRegion | undefined;
    if (!paintable?.uv || !region) return;
    const pixel = uvToAtlasPixel(region, paintable.uv.x, paintable.uv.y);
    propsRef.current.onInspect(region, pixel.x, pixel.y);
    propsRef.current.onPaint(pixel.x, pixel.y);
  }

  function setView(rotationX: number, rotationY: number, label: string) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.character.rotation.set(rotationX, rotationY, 0);
    runtime.renderer.render(runtime.scene, runtime.camera);
    canvasRef.current?.setAttribute("data-view", label);
  }

  function zoomBy(multiplier: number) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.camera.zoom = Math.max(0.7, Math.min(1.8, runtime.camera.zoom * multiplier));
    runtime.camera.updateProjectionMatrix();
    runtime.renderer.render(runtime.scene, runtime.camera);
  }

  function wheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.08 : 1 / 1.08);
  }

  function resetView() {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.camera.zoom = 1;
    runtime.camera.updateProjectionMatrix();
    setView(-0.08, 0.42, "reset");
  }

  return (
    <div className={styles.cuboidViewport}>
      <canvas
        aria-label="Interactive 3D cuboid humanoid skin preview"
        className={styles.cuboidPreview}
        data-renderer={CUBOID_HUMANOID_RENDERER_ID}
        data-view="reset"
        onPointerCancel={() => { dragRef.current.active = false; }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onWheel={wheel}
        ref={canvasRef}
      />
      <div aria-label="3D view controls" className={styles.viewerControls} role="group">
        <button aria-label="Front 3D view" onClick={() => setView(0, 0, "front")} type="button">Front</button>
        <button aria-label="Back 3D view" onClick={() => setView(0, Math.PI, "back")} type="button">Back</button>
        <button aria-label="Left 3D view" onClick={() => setView(0, -Math.PI / 2, "left")} type="button">Left</button>
        <button aria-label="Right 3D view" onClick={() => setView(0, Math.PI / 2, "right")} type="button">Right</button>
        <button aria-label="Zoom out 3D view" onClick={() => zoomBy(1 / 1.15)} type="button">−</button>
        <button aria-label="Zoom in 3D view" onClick={() => zoomBy(1.15)} type="button">+</button>
        <button aria-label="Reset 3D view" onClick={resetView} type="button">Reset</button>
      </div>
    </div>
  );
}
