import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { projects, previewMarkup } from './projects.js';

// Four areas of one broad hall. All screens face the same steady viewing direction.
const exhibits = [
  { x: -10, y: 3.35, z: 2.18 }, { x: 3, y: 3.35, z: -4.82 },
  { x: 12, y: 3.65, z: -19 }, { x: -8, y: 3.35, z: -23.82 },
];
const walk = [[0,4.1,22],[7,4.1,15],[11,4.1,6],[12,4.1,-10],[2,4.1,-11],[-8,4.1,-11]].map(p => new THREE.Vector3(...p));
const walkDistances = [0];
for (let i = 1; i < walk.length; i++) walkDistances.push(walkDistances[i-1] + walk[i].distanceTo(walk[i-1]));
const walkLength = walkDistances.at(-1);
function walkPosition(distance, target) {
  const segment = Math.min(walk.length-2,Math.max(0,walkDistances.findIndex(d => d >= distance)-1));
  return target.lerpVectors(walk[segment],walk[segment+1],(distance-walkDistances[segment])/(walkDistances[segment+1]-walkDistances[segment]));
}

export function createGallery(container, onSelect, onUnavailable) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#151918', 32, 80);
  const htmlScene = new THREE.Scene();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { onUnavailable(); return { setView() {}, dispose() {} }; }
  renderer.setClearColor('#151918', 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label', '가벽과 넓은 홀, 독립 전시실로 구성된 3D 갤러리');
  renderer.domElement.setAttribute('role', 'img'); container.append(renderer.domElement);
  const htmlRenderer = new CSS3DRenderer();
  htmlRenderer.domElement.className = 'html-world'; container.append(htmlRenderer.domElement);
  const nativeHTML = typeof renderer.getContext().texElementImage2D === 'function' && typeof renderer.domElement.requestPaint === 'function';
  if (nativeHTML) renderer.domElement.setAttribute('role', 'group');
  container.dataset.renderMode = nativeHTML ? 'html-in-canvas' : 'html-3d';
  const interactions = new InteractionManager();
  const camera = new THREE.PerspectiveCamera(54, 1, .1, 120);
  interactions.connect(renderer, camera);
  const desiredPosition = walk[0].clone();
  camera.position.copy(desiredPosition);
  // No mouse sway, yaw, zoom or roll when moving between exhibits.
  camera.rotation.set(-.045, 0, 0);

  const grainData = new Uint8Array(128 * 128 * 4);
  let seed = 1249;
  for (let i = 0; i < grainData.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const value = 215 + seed % 24;
    grainData.set([value, value, value, 255], i);
  }
  const grain = new THREE.DataTexture(grainData, 128, 128, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(8, 8); grain.needsUpdate = true;
  const concrete = new THREE.MeshStandardMaterial({ color: '#454947', map: grain, roughness: .92 });
  const partition = new THREE.MeshStandardMaterial({ color: '#353a37', map: grain, roughness: .96 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#303633', map: grain, roughness: .68, metalness: .12 });
  const dark = new THREE.MeshStandardMaterial({ color: '#171c1a', roughness: .7, metalness: .25 });
  const warm = new THREE.MeshStandardMaterial({ color: '#918b73', roughness: .92 });
  const glow = new THREE.MeshBasicMaterial({ color: '#bebca4' });
  const occluders = [];
  function box(w, h, d, x, y, z, material, blocksArtwork = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = h > .4; mesh.receiveShadow = true;
    scene.add(mesh); if (blocksArtwork) occluders.push(mesh); return mesh;
  }
  // Wide warehouse shell with high beams; the partitions end well below the ceiling.
  box(46,.22,58,0,-.13,-7,floorMaterial);
  box(.35,11,58,-23,5.5,-7,concrete); box(.35,11,58,23,5.5,-7,concrete);
  box(46,11,.35,0,5.5,-36,concrete); box(46,.18,58,0,11.1,-7,dark);
  for (const z of [15,-3,-21,-35]) {
    box(46,.5,.24,0,10.3,z,dark);
    for (const x of [-21,21]) { box(.42,10.5,.42,x,5.25,z,dark); box(.95,.22,.95,x,.1,z,concrete); }
  }
  for (let x = -20; x <= 20; x += 5) box(.013,.007,57,x,.004,-7,dark,false);
  for (let z = 20; z >= -35; z -= 5) box(45,.007,.013,0,.004,z,dark,false);
  // 01: short L-shaped entrance wall, with open space to its right.
  box(9.5,5.9,.28,-10,2.95,2,partition); box(.28,5.9,4.7,-14.6,2.95,-.2,partition);
  box(9.8,.08,5.1,-10,.04,-.2,dark);
  // 02: freestanding wall and a small bench, separated by an open court.
  box(8.4,5.8,.28,3,2.9,-5,concrete); box(.28,4.6,3.3,7.06,2.3,-6.5,concrete);
  box(8.8,.1,3.8,3,.05,-6.3,dark);
  box(3.8,.42,1.15,-.7,.24,1.4,dark); box(3.8,.07,1.15,-.7,.49,1.4,warm);
  // 03: suspended screen in an open warehouse bay.
  box(11,.27,5.7,12,.14,-20,dark); box(11,.035,5.7,12,.29,-20,concrete);
  for (const x of [9.1,14.9]) box(.025,5.65,.025,x,8.43,-19.08,dark);
  box(12.5,.2,.24,12,7.8,-19.08,dark); box(10,.025,2.4,11,10.96,-17,glow);
  box(.14,4,4.8,19,2,-21.5,partition);
  // 04: a smaller room within the hall, open on the viewer's side.
  box(10.5,6.3,.28,-8,3.15,-24,partition);
  box(.28,6.3,7,-13.1,3.15,-20.6,partition); box(.28,6.3,7,-2.9,3.15,-20.6,partition);
  box(10.5,.15,7,-8,6.35,-20.6,dark); box(10.5,.13,7,-8,.065,-20.6,warm);
  for (const x of [-12.92,-3.08]) box(.025,5.7,.04,x,3,-17.2,glow);
  scene.add(new THREE.HemisphereLight('#cbd4d0','#252820',1.3));
  const daylight = new THREE.DirectionalLight('#d2dccf',1.35);
  daylight.position.set(12,16,14); daylight.target.position.set(0,0,-10);
  daylight.castShadow = true; daylight.shadow.mapSize.set(2048,2048);
  Object.assign(daylight.shadow.camera,{left:-34,right:34,top:30,bottom:-30,near:1,far:80});
  daylight.shadow.bias = -.0006; daylight.shadow.normalBias = .045; scene.add(daylight,daylight.target);
  for (const p of exhibits) {
    const spot = new THREE.SpotLight('#e9e6d9',180,24,.65,.85,2);
    spot.position.set(p.x,7.8,p.z+2.7); spot.target.position.set(p.x,1.6,p.z); scene.add(spot,spot.target);
    box(.3,.14,.4,p.x,7.9,p.z+2.7,dark); box(.18,.02,.22,p.x,7.82,p.z+2.7,glow);
  }

  const artworks = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  projects.forEach((project,index) => {
    const p = exhibits[index], group = new THREE.Group();
    group.position.set(p.x,p.y,p.z);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.53,4.13,.14),dark);
    frame.position.z = -.085; frame.castShadow = true; group.add(frame); scene.add(group);
    const element = document.createElement('button');
    element.className = 'world-project'; element.type = 'button';
    element.setAttribute('aria-label', project.title.replace('\n',' ') + ' 프로젝트 열기');
    element.innerHTML = previewMarkup(project);
    element.addEventListener('click', event => {
      // Do not activate CSS content through a physical wall.
      if (event.detail > 0) {
        const bounds = container.getBoundingClientRect();
        pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
        raycaster.setFromCamera(pointer,camera);
        const hit = raycaster.intersectObject(group,true)[0], wall = raycaster.intersectObjects(occluders,false)[0];
        if (!hit || (wall && wall.distance < hit.distance-.05)) return;
      }
      onSelect(index);
    });
    let mesh, object;
    if (nativeHTML) {
      const texture = new THREE.HTMLTexture(element); texture.colorSpace = THREE.SRGBColorSpace;
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4,4),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
      group.add(mesh); interactions.add(mesh);
    } else {
      object = new CSS3DObject(element); object.position.set(p.x,p.y,p.z); object.scale.setScalar(.00666667);
      htmlScene.add(object);
      // Transparent pixels at the screen's depth reveal HTML underneath WebGL.
      // Nearer geometry still covers it, preserving real partition occlusion.
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4,4),new THREE.ShaderMaterial({
        vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'void main(){gl_FragColor=vec4(0.0);}',blending:THREE.NoBlending,
      }));
      group.add(mesh);
    }
    artworks.push({element,position:new THREE.Vector3(p.x,p.y,p.z),mesh,object});
  });

  const veil = document.createElement('div');
  veil.className = 'scene-veil'; veil.setAttribute('aria-hidden','true'); container.append(veil);
  container.setAttribute('aria-busy','false');
  let mode = 'intro', viewIndex = 0, started = false, transition = null;
  let currentWalk = 0, desiredWalk = 0;
  let frameId, lastTime = performance.now();
  function setView(nextMode,index = 0,travel = 0) {
    const previousMode = mode, previousIndex = viewIndex;
    mode = nextMode; viewIndex = index;
    if (mode === 'intro' || mode === 'overview') {
      desiredWalk = Math.max(0,Math.min(1,travel))*walkLength;
      walkPosition(desiredWalk,desiredPosition);
    } else {
      const p = exhibits[index]; desiredPosition.set(p.x,p.y+.18,p.z+12.6);
    }
    const changedStation = previousIndex !== index || previousMode !== mode;
    // Relocate while covered; never fly or rotate through multiple rooms.
    if (mode === 'detail') {
      desiredPosition.copy(camera.position); transition = null; veil.style.opacity = '0';
      container.setAttribute('aria-busy','false');
    } else if (!started || reduced.matches || previousMode === 'detail') {
      camera.position.copy(desiredPosition); transition = null; veil.style.opacity = '0';
      currentWalk = desiredWalk;
      container.setAttribute('aria-busy','false');
    } else if (changedStation && camera.position.distanceTo(desiredPosition) > .1) {
      transition = {start:performance.now(),opacity:Number(veil.style.opacity)||0,moved:false};
      container.setAttribute('aria-busy','true');
    }
    started = true;
  }
  const resize = () => {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width,height); htmlRenderer.setSize(width,height);
    camera.aspect = width/height; camera.fov = 54; camera.zoom = Math.min(1,camera.aspect/.76); camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const direction = new THREE.Vector3(), projected = new THREE.Vector3();
  function animate(time) {
    frameId = requestAnimationFrame(animate);
    const dt = Math.min((time-lastTime)/1000,.05); lastTime = time;
    if (document.hidden || document.body.dataset.mode === 'detail') return;
    if (transition) {
      const elapsed = time-transition.start;
      if (elapsed < 220) veil.style.opacity = String(transition.opacity+(1-transition.opacity)*elapsed/220);
      else {
        if (!transition.moved) { camera.position.copy(desiredPosition); currentWalk = desiredWalk; transition.moved = true; }
        veil.style.opacity = String(Math.min(1,Math.max(0,1-(elapsed-260)/320)));
        if (elapsed >= 580) { transition = null; veil.style.opacity = '0'; container.setAttribute('aria-busy','false'); }
      }
    } else if (mode === 'overview' && !reduced.matches) {
      // Follow the complete route even when rapid scrolling skips ahead. A direct
      // interpolation to the last waypoint would cut through the short walls.
      const remaining = desiredWalk-currentWalk;
      currentWalk += Math.sign(remaining)*Math.min(Math.abs(remaining)*(1-Math.exp(-dt*3)),dt*4);
      walkPosition(currentWalk,camera.position);
    } else camera.position.copy(desiredPosition);
    camera.updateMatrixWorld(); scene.updateMatrixWorld();
    for (const artwork of artworks) {
      direction.subVectors(artwork.position,camera.position);
      const distance = direction.length(), visible = camera.position.z > artwork.position.z+.2 && distance < 65;
      raycaster.set(camera.position,direction.normalize());
      const wall = raycaster.intersectObjects(occluders,false)[0];
      projected.copy(artwork.position).project(camera);
      const inView = Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
      const accessible = visible && inView && (!wall || wall.distance > distance-.08) && mode !== 'intro' && mode !== 'detail' && !transition;
      artwork.element.style.visibility = visible ? 'visible' : 'hidden';
      artwork.element.style.pointerEvents = accessible ? 'auto' : 'none'; artwork.element.tabIndex = accessible ? 0 : -1;
      artwork.element.setAttribute('aria-hidden',String(!accessible)); artwork.mesh.visible = visible;
    }
    renderer.render(scene,camera);
    if (nativeHTML) interactions.update(); else htmlRenderer.render(htmlScene,camera);
  }
  frameId = requestAnimationFrame(animate);
  return {
    setView,
    dispose() {
      cancelAnimationFrame(frameId); observer.disconnect(); interactions.disconnect();
      scene.traverse(object => { object.geometry?.dispose(); if (object.material) { object.material.map?.dispose(); object.material.dispose(); } });
      grain.dispose(); renderer.dispose(); container.replaceChildren();
    },
  };
}
