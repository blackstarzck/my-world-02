import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Scene, Vector3 } from 'three';
import { batchArchitecture, createFrameLoop, renderPixelRatio } from '../src/rendering.js';
import { createLook } from '../src/look.js';
import { withTimeout } from '../src/loading.js';

test('batching preserves transformed architecture, shadow flags and wall raycasts', () => {
  const scene = new Scene(), parent = new Group(), material = new MeshStandardMaterial();
  parent.position.set(3,2,-6); parent.rotation.y = .4; scene.add(parent);
  const meshes = Array.from({length:12}, (_,i) => {
    const mesh = new Mesh(new BoxGeometry(1,3,2),material);
    mesh.position.x = i*2; mesh.castShadow = i < 6; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  });
  scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(scene), target = meshes[0].getWorldPosition(new Vector3());
  const ray = new Raycaster(target.clone().add(new Vector3(0,0,10)),new Vector3(0,0,-1));
  const distance = ray.intersectObject(meshes[0])[0].distance;
  assert.equal(batchArchitecture(scene,meshes,[meshes[0]]),2);
  const after = new Box3().setFromObject(scene);
  assert.ok(bounds.min.distanceTo(after.min) < 1e-5);
  assert.ok(bounds.max.distanceTo(after.max) < 1e-5);
  assert.equal(ray.intersectObject(meshes[0])[0].distance,distance);
  const batches = scene.children.filter(child => child.isMesh);
  assert.equal(batches.length,2);
  assert.equal(batches.filter(mesh => mesh.castShadow).length,1);
  assert.ok(batches.every(mesh => mesh.receiveShadow));
  batches.forEach(mesh => mesh.geometry.dispose()); meshes[0].geometry.dispose(); material.dispose();
});

function clock() {
  let time = 0, id = 0;
  const queue = new Map();
  return {
    options:{request:callback => { queue.set(++id,callback); return id; },cancel:id => queue.delete(id),now:() => time},
    get pending() { return queue.size; },
    advance(milliseconds = 16) { time += milliseconds; const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(callback => callback(time)); },
  };
}

test('idle rendering stops, pointer bursts coalesce, and wake resumes immediately', () => {
  const time = clock(); let frames = 0, moving = true;
  const loop = createFrameLoop(() => { frames++; return moving; },time.options);
  loop.wake(); assert.equal(time.pending,0,'preparation does not render early');
  loop.setPaused(false); time.advance(); assert.equal(frames,1); assert.equal(time.pending,1);
  moving = false; time.advance(); assert.equal(time.pending,0);
  for (let i = 0; i < 100; i++) time.advance();
  assert.equal(frames,2,'settled scene does no background rendering');
  for (let i = 0; i < 100; i++) loop.wake();
  assert.equal(time.pending,1); time.advance(); assert.equal(frames,3); assert.equal(time.pending,0);
  loop.dispose(); loop.wake(); assert.equal(time.pending,0);
});

test('hidden-tab and detail pauses do not produce a camera jump on return', () => {
  const time = clock(), deltas = [];
  const loop = createFrameLoop(dt => { deltas.push(dt); return true; },time.options);
  loop.setPaused(false); time.advance(16); loop.setPaused(true);
  time.advance(60000); assert.equal(deltas.length,1); assert.equal(time.pending,0);
  loop.setPaused(false); time.advance(16);
  assert.deepEqual(deltas,[.016,.016]);
  time.advance(85); assert.equal(deltas.at(-1),.085,'do not discard normal slow frames at 50 ms');
  loop.dispose(); assert.equal(time.pending,0);
});

test('mouse damping actually settles so it can stop rendering, then resets smoothly', () => {
  const look = createLook(); look.target(1,-1);
  for (let i = 0; i < 180; i++) look.step(1/60);
  assert.equal(look.moving,false);
  const pose = look.step(1/60); look.reset();
  const first = look.step(1/60);
  assert.ok(Math.abs(first.yaw-pose.yaw) < .01);
  assert.equal(look.moving,true);
  for (let i = 0; i < 180; i++) look.step(1/60);
  assert.equal(look.moving,false); assert.equal(Math.abs(look.step(1/60).yaw),0);
});

test('render budget caps high-density desktop and mobile canvases at two million pixels', () => {
  for (const [width,height,ratio] of [[1440,900,1],[1920,1080,2],[3840,2160,2],[390,844,3]]) {
    const result = renderPixelRatio(width,height,ratio);
    assert.ok(result <= ratio && result <= 1.5);
    assert.ok(width*height*result*result <= 2_000_001);
  }
  assert.equal(renderPixelRatio(1440,900,1),1,'ordinary desktop retains native resolution');
});

test('optional assets settle on success, rejection and timeout without blocking entry', async () => {
  assert.equal(await withTimeout(Promise.resolve(),50),true);
  assert.equal(await withTimeout(Promise.reject(new Error('offline')),50),false);
  assert.equal(await withTimeout(new Promise(() => {}),10),false);
});
