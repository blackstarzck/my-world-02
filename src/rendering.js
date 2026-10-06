import { Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Static architecture shares a handful of draw calls. Detached wall meshes keep
// their world matrices for the existing occlusion / pointer raycasts.
export function batchArchitecture(scene, meshes, occluders = []) {
  scene.updateMatrixWorld(true);
  const keep = new Set(occluders), batches = new Map();
  for (const mesh of meshes) {
    const key = `${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, { source: mesh, geometries: [] });
    batches.get(key).geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    mesh.removeFromParent();
    mesh.matrixAutoUpdate = false; mesh.matrixWorldAutoUpdate = false;
    if (!keep.has(mesh)) mesh.geometry.dispose();
  }
  for (const { source, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(part => part.dispose());
    const mesh = new Mesh(geometry, source.material);
    mesh.castShadow = source.castShadow; mesh.receiveShadow = source.receiveShadow;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    mesh.matrixAutoUpdate = false; scene.add(mesh);
  }
  return batches.size;
}

// Stop requesting frames when the camera settles. Inputs coalesce into one frame;
// returning from a hidden tab never advances by the time spent away.
export function createFrameLoop(draw, { request = requestAnimationFrame, cancel = cancelAnimationFrame, now = () => performance.now() } = {}) {
  let id = null, last = null, paused = true, disposed = false, drawing = false, invalidated = false;
  function wake() {
    if (paused || disposed) return;
    if (drawing) { invalidated = true; return; }
    if (id !== null) return;
    if (last === null) last = now();
    id = request(tick);
  }
  function tick(time) {
    id = null; drawing = true; invalidated = false;
    const dt = Math.max(0, Math.min((time-last)/1000, .1)); last = time;
    const again = draw(dt, time);
    drawing = false;
    if ((again || invalidated) && !paused && !disposed) wake();
    else last = null;
  }
  return {
    wake,
    setPaused(value) {
      paused = value;
      if (paused) { if (id !== null) cancel(id); id = null; last = null; }
      else wake();
    },
    dispose() { disposed = true; if (id !== null) cancel(id); id = null; last = null; },
  };
}

export function renderPixelRatio(width, height, deviceRatio) {
  // Keep a 4K / Retina screen from multiplying fragment work without a limit.
  return Math.min(deviceRatio, 1.5, Math.sqrt(2_000_000 / Math.max(1, width*height)));
}
