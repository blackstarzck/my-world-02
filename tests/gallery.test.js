import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { eyeHeight, rooms, walls, portals, exhibits, screenSize, stops, routeLength, sampleRoute, routeYaw, wallClearance } from '../src/space.js';
import { createMotion, travelDim } from '../src/motion.js';
import { createLook } from '../src/look.js';
import { createInspection, frontPose } from '../src/inspection.js';

function finish(motion, inspect = () => {}, fps = 120) {
  let elapsed = 0;
  while (motion.moving && elapsed < 30) {
    const before = motion.position;
    motion.step(1/fps); elapsed += 1/fps;
    inspect(motion, before);
  }
  assert.equal(motion.moving, false, 'camera must eventually arrive');
  return elapsed;
}

test('the full rail stays on one floor and clears solid walls by at least 0.6 m', () => {
  for (let distance = 0; distance <= routeLength; distance += .015) {
    const p = sampleRoute(distance);
    assert.ok(Math.abs(p.y-eyeHeight) < 1e-8);
    assert.ok(wallClearance(p) >= .6, 'wall clearance at ' + distance);
    assert.ok(rooms.some(room => p.x >= room.x[0] && p.x <= room.x[1] && p.z >= room.z[0] && p.z <= room.z[1]), 'inside the building');
  }
  assert.ok(portals.every(portal => portal.x[1]-portal.x[0] >= 3));
});

test('equal travel distances produce equal physical speed, with gentle continuous yaw', () => {
  for (let d = .01; d < routeLength; d += .01) {
    const actual = sampleRoute(d).distanceTo(sampleRoute(d-.01));
    assert.ok(Math.abs(actual-.01) < .00012, 'arc-length parameterization');
    assert.ok(Math.abs(routeYaw(d)-routeYaw(d-.01)) < .001);
  }
  for (let i = 1; i < stops.length; i++) assert.ok(Math.abs(routeYaw(stops[i])-routeYaw(stops[i-1])) <= Math.PI/6);
});

test('all rotated artwork centres face their station and are unobstructed', () => {
  const material = new MeshBasicMaterial();
  const solids = walls.map(w => {
    const mesh = new Mesh(new BoxGeometry(...w.size), material);
    mesh.position.set(...w.center); mesh.updateMatrixWorld(); return mesh;
  });
  exhibits.forEach((art,index) => {
    const camera = sampleRoute(stops[index]), centre = new Vector3(art.x,art.y,art.z);
    const direction = centre.clone().sub(camera), distance = direction.length();
    const ray = new Raycaster(camera,direction.normalize());
    const wall = ray.intersectObjects(solids)[0];
    assert.ok(!wall || wall.distance > distance, 'visible screen ' + index);
    const normal = new Vector3(Math.sin(art.yaw*Math.PI/180),0,Math.cos(art.yaw*Math.PI/180));
    assert.ok(camera.clone().sub(centre).dot(normal) > 0);
  });
  // The third screen is behind the concrete wall from the first station.
  const camera = sampleRoute(stops[0]), centre = new Vector3(exhibits[2].x,exhibits[2].y,exhibits[2].z);
  const delta = centre.clone().sub(camera);
  const obstruction = new Raycaster(camera,delta.clone().normalize()).intersectObjects(solids)[0];
  assert.ok(obstruction && obstruction.distance < delta.length());
  solids.forEach(mesh => mesh.geometry.dispose()); material.dispose();
});

test('each adjacent move in either direction takes 1.7–2.2 seconds at 30, 60 and 144 Hz', () => {
  for (const fps of [30,60,144]) for (let i = 0; i < stops.length-1; i++) for (const direction of [1,-1]) {
    const start = direction > 0 ? stops[i] : stops[i+1], end = direction > 0 ? stops[i+1] : stops[i];
    const motion = createMotion(start,{max:routeLength}); motion.target(end);
    const duration = finish(motion, (state, before) => {
      assert.ok(Math.abs(state.position-before) <= 17/fps+.00001, 'no teleport');
      assert.ok(state.position >= Math.min(start,end)-1e-8 && state.position <= Math.max(start,end)+1e-8, 'no overshoot');
    }, fps);
    assert.ok(duration >= 1.7 && duration <= 2.2, String(duration));
    assert.equal(motion.position,end);
  }
});

test('a distant destination passes intermediate stations without stopping', () => {
  const motion = createMotion(stops[0],{max:routeLength}); motion.target(stops[3]);
  const passed = new Set();
  const duration = finish(motion, (state,before) => {
    stops.slice(1,3).forEach(stop => {
      if (before < stop && state.position >= stop) { passed.add(stop); assert.ok(state.velocity >= 5.79); }
    });
    assert.ok(wallClearance(sampleRoute(state.position)) >= .6);
  });
  assert.equal(passed.size,2); assert.ok(duration > 4 && duration < 5);
});

test('left-wall corner artwork is fully visible and remains left of the camera centre', () => {
  for (const aspect of [16/9,390/844,320/568]) {
    const camera = new PerspectiveCamera(60,aspect,.08,100);
    camera.zoom = Math.min(1,aspect/.76); camera.updateProjectionMatrix();
    exhibits.forEach((art,index) => {
      camera.position.copy(sampleRoute(stops[index]));
      camera.rotation.set(0,routeYaw(stops[index],aspect),0,'YXZ'); camera.updateMatrixWorld();
      const centre = new Vector3(art.x,art.y,art.z).project(camera);
      assert.ok(centre.x < -.05 && centre.x > -.6, 'left-hand framing');
      const facing = camera.position.clone().sub(new Vector3(art.x,eyeHeight,art.z)).normalize();
      assert.ok(facing.x > .5 && facing.x < .85, 'oblique view of left wall');
      for (const x of [-screenSize.width/2,screenSize.width/2]) for (const y of [-screenSize.height/2,screenSize.height/2]) {
        const corner = new Vector3(art.x,art.y+y,art.z-x).project(camera);
        assert.ok(Math.abs(corner.x) < .98 && Math.abs(corner.y) < .98, 'entire screen within viewport');
      }
      assert.ok(art.z-screenSize.width/2 >= rooms[index].z[0]+.3, 'no rear-wall penetration');
    });
  }
});

test('rapid destinations replace one another; reversing brakes before changing direction', () => {
  const motion = createMotion(stops[0]); motion.target(stops[3]);
  for (let i = 0; i < 140; i++) motion.step(1/120);
  const before = motion.position, speed = motion.velocity, acceleration = motion.acceleration;
  motion.target(stops[2]); motion.target(stops[1]); motion.target(stops[0]);
  assert.equal(motion.position,before); assert.equal(motion.velocity,speed);
  assert.equal(motion.acceleration,acceleration);
  motion.step(1/120);
  assert.ok(motion.position > before, 'must first decelerate');
  assert.ok(motion.velocity > 0, 'no instant direction flip');
  for (let i = 0; i < 12; i++) motion.step(1/120);
  assert.ok(motion.velocity < speed, 'braking starts smoothly');
  finish(motion, (state,last) => {
    assert.ok(Math.abs(state.position-last) < .1);
    assert.ok(wallClearance(sampleRoute(state.position)) >= .6);
  });
  assert.equal(motion.position,stops[0]); assert.equal(motion.velocity,0);
});

test('reduced-motion rail positioning settles immediately, including mid-flight', () => {
  const motion = createMotion(stops[0]); motion.target(stops[3]); motion.step(.1);
  motion.target(stops[2],true);
  assert.equal(motion.position,stops[2]); assert.equal(motion.velocity,0); assert.equal(motion.moving,false);
  motion.step(.05); assert.equal(motion.position,stops[2]);
});

test('retargeting near either end stays within the building route', () => {
  for (const from of [0,3]) for (const time of [.02,.4,1.7,3,5,7]) {
    const motion = createMotion(stops[from],{max:routeLength}); motion.target(stops[3-from]);
    for (let t = 0; t < time; t += 1/120) motion.step(1/120);
    motion.target(stops[from]);
    finish(motion, state => assert.ok(state.position >= 0 && state.position <= routeLength));
  }
});

test('doorway curves have no sudden tangent or curvature changes', () => {
  let previous;
  const step = .04;
  for (let d = step; d < routeLength-step; d += step) {
    const a = sampleRoute(d-step), b = sampleRoute(d), c = sampleRoute(d+step);
    const curvature = c.clone().sub(b.clone().multiplyScalar(2)).add(a).divideScalar(step*step);
    assert.ok(curvature.length() < .25, 'broad turns');
    if (previous) assert.ok(curvature.distanceTo(previous) < .025, 'continuous curvature');
    previous = curvature;
  }
});

test('travel accelerates and settles smoothly while dimming stays subtle', () => {
  const motion = createMotion(stops[0],{max:routeLength}); motion.target(stops[1]);
  const speeds = [], dims = [];
  finish(motion,state => { speeds.push(state.velocity); dims.push(travelDim(state.velocity)); });
  const peak = Math.max(...speeds), peakIndex = speeds.indexOf(peak);
  assert.ok(peakIndex > speeds.length*.4 && peakIndex < speeds.length*.6);
  assert.ok(speeds[0] < .01 && speeds.at(-2) < .01);
  assert.equal(motion.acceleration,0);
  assert.ok(dims.every(value => value >= 0 && value <= .18));
  assert.ok(Math.max(...dims) >= .17);
  assert.equal(travelDim(0),0);
  assert.equal(dims.at(-1),0);
});

test('frequent retargets preserve motion state and remain within the route', () => {
  const motion = createMotion(stops[0],{max:routeLength});
  let seed = 42;
  for (let frame = 0; frame < 5000; frame++) {
    if (frame % 23 === 0) {
      seed = (seed*16807)%2147483647;
      const state = [motion.position,motion.velocity,motion.acceleration];
      motion.target(stops[seed%4]);
      assert.deepEqual([motion.position,motion.velocity,motion.acceleration],state);
    }
    motion.step(1/120);
    assert.ok(motion.position >= -1e-7 && motion.position <= routeLength+1e-7);
  }
  const destination = motion.destination;
  finish(motion); assert.equal(motion.position,destination);
});

test('mouse look is bounded, damped and consistent across frame rates', () => {
  const poses = [];
  for (const fps of [30,60,144]) {
    const look = createLook(); look.target(4,-3);
    const first = look.step(1/fps);
    assert.ok(Math.abs(first.yaw) < Math.PI/30*.2);
    for (let i = 1; i < fps; i++) poses[fps] = look.step(1/fps);
    assert.ok(Math.abs(poses[fps].yaw) <= Math.PI/30);
    assert.ok(Math.abs(poses[fps].pitch) <= Math.PI/51.43);
    for (let i = 0; i < fps*2; i++) poses[fps] = look.step(1/fps,{moving:true});
    assert.ok(Math.abs(poses[fps].yaw) < Math.PI/30*.401);
    assert.deepEqual(look.step(1/fps,{enabled:false}),{yaw:0,pitch:0});
  }
  assert.ok(Math.abs(poses[30].yaw-poses[144].yaw) < 1e-10);
});

test('frontal camera centres every artwork and fits all corners on desktop and mobile', () => {
  for (const aspect of [16/9,390/844,320/568]) exhibits.forEach(art => {
    const pose = frontPose(art,aspect), camera = new PerspectiveCamera(60,aspect,.08,100);
    camera.zoom = Math.min(1,aspect/.76); camera.updateProjectionMatrix();
    camera.position.copy(pose.position); camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ'); camera.updateMatrixWorld();
    const centre = new Vector3(art.x,art.y,art.z).project(camera);
    assert.ok(Math.abs(centre.x) < 1e-10 && Math.abs(centre.y) < 1e-10);
    const corners = [];
    for (const x of [-screenSize.width/2,screenSize.width/2]) for (const y of [-screenSize.height/2,screenSize.height/2]) {
      const corner = new Vector3(art.x,art.y+y,art.z-x).project(camera); corners.push(corner);
      assert.ok(Math.abs(corner.x) <= .79 && Math.abs(corner.y) < .8);
    }
    assert.ok(Math.abs(corners[0].x-corners[1].x) < 1e-10, 'no perspective skew');
    assert.ok(Math.abs(corners[0].y-corners[2].y) < 1e-10, 'horizontal screen edges');
  });
});

test('each approach and return remains inside its room with wall clearance', () => {
  for (const aspect of [16/9,390/844,320/568]) exhibits.forEach((art,index) => {
    const start = sampleRoute(stops[index]), end = frontPose(art,aspect).position, room = rooms[index];
    for (let i = 0; i <= 500; i++) {
      const p = start.clone().lerp(end,i/500);
      assert.ok(wallClearance(p) >= .6, 'no walls crossed');
      assert.ok(p.x > room.x[0]+.6 && p.x < room.x[1]-.6 && p.z > room.z[0]+.6 && p.z < room.z[1]-.6);
    }
  });
});

test('detail is ready once, only after 1.2 seconds of movement and a frontal hold', () => {
  for (const fps of [30,60,144]) {
    const sequence = createInspection(); sequence.open();
    let time = 0, arrival = 0, completions = 0, previous = 0;
    for (let frame = 0; frame < fps*3; frame++) {
      sequence.step(1/fps); time += 1/fps;
      assert.ok(sequence.blend >= previous && sequence.blend <= 1);
      assert.ok(sequence.blend-previous < 1.7/fps, 'smooth bounded steps'); previous = sequence.blend;
      if (!arrival && sequence.phase === 'front') arrival = time;
      if (sequence.takeReady()) { completions++; assert.ok(time-arrival >= .24-1e-8); }
    }
    assert.ok(arrival >= 1.2-1e-8 && arrival <= 1.2+1/fps);
    assert.equal(completions,1); assert.equal(sequence.blend,1);
    sequence.close();
    for (let frame = 0; frame < fps*2; frame++) { sequence.step(1/fps); assert.equal(sequence.takeReady(),false); }
    assert.equal(sequence.phase,'idle'); assert.equal(sequence.blend,0);
  }
});

test('cancelling approach or its hold never reveals detail and does not jump', () => {
  for (const elapsed of [.1,.5,1.1,1.3]) {
    const sequence = createInspection(); sequence.open();
    for (let t = 0; t < elapsed; t += 1/120) sequence.step(1/120);
    const before = sequence.blend; sequence.close(); assert.equal(sequence.blend,before);
    for (let i = 0; i < 360; i++) {
      const previous = sequence.blend; sequence.step(1/120);
      assert.ok(Math.abs(sequence.blend-previous) < .02);
      assert.equal(sequence.takeReady(),false);
    }
    assert.equal(sequence.phase,'idle'); assert.equal(sequence.blend,0);
  }
});

test('reduced motion settles opening and closing immediately without stale completion', () => {
  const sequence = createInspection(); sequence.open(true);
  assert.equal(sequence.blend,1); assert.equal(sequence.takeReady(),true); assert.equal(sequence.takeReady(),false);
  sequence.close(true); assert.equal(sequence.blend,0); assert.equal(sequence.takeReady(),false);
  sequence.open(); sequence.step(.1); sequence.settle();
  assert.equal(sequence.blend,1); assert.equal(sequence.takeReady(),true);
  sequence.close(); sequence.step(.1); sequence.settle(); assert.equal(sequence.phase,'idle');
  sequence.open(); sequence.reset(); sequence.step(.1); assert.equal(sequence.takeReady(),false);
});
