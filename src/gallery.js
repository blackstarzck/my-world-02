import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { projects, previewMarkup } from './projects.js';
import { rooms, walls, portals, exhibits, screenSize, stops, routeLength, sampleRoute, routeYaw, nearestStop } from './space.js';
import { createMotion } from './motion.js';

export function createGallery(container, onSelect, onUnavailable, onTravel = () => {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene(), htmlScene = new THREE.Scene();
  scene.fog = new THREE.Fog('#181c1b', 22, 60);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch {
    onUnavailable();
    return { setView(mode, index) { onTravel({ moving: false, mode, index }); }, getProgress: () => 0, isMoving: () => false, dispose() {} };
  }
  renderer.setClearColor('#181c1b', 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label', '두꺼운 콘크리트 벽과 넓은 출입구로 연결된 네 전시 공간');
  renderer.domElement.setAttribute('role', 'img'); container.append(renderer.domElement);
  const htmlRenderer = new CSS3DRenderer();
  htmlRenderer.domElement.className = 'html-world'; container.append(htmlRenderer.domElement);
  const nativeHTML = typeof renderer.getContext().texElementImage2D === 'function' && typeof renderer.domElement.requestPaint === 'function';
  if (nativeHTML) renderer.domElement.setAttribute('role', 'group');
  container.dataset.renderMode = nativeHTML ? 'html-in-canvas' : 'html-3d';
  const interactions = new InteractionManager();
  const camera = new THREE.PerspectiveCamera(60, 1, .08, 100);
  interactions.connect(renderer, camera);

  const grainData = new Uint8Array(256*256*4);
  let seed = 1249;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (seed*16807)%2147483647;
    const cloud = Math.sin(x*.043)*Math.cos(y*.037)*7 + Math.sin((x+y)*.019)*4;
    const value = Math.round(218 + seed%24 + cloud);
    grainData.set([value, value, value, 255], (y*256+x)*4);
  }
  const grain = new THREE.DataTexture(grainData, 256, 256, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(3, 2);
  grain.magFilter = THREE.LinearFilter; grain.minFilter = THREE.LinearMipmapLinearFilter; grain.generateMipmaps = true; grain.needsUpdate = true;
  const concrete = new THREE.MeshStandardMaterial({ color: '#626864', map: grain, bumpMap: grain, bumpScale: .014, roughness: .96 });
  const ceiling = new THREE.MeshStandardMaterial({ color: '#404640', map: grain, roughness: 1 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#444b46', map: grain, roughness: .88 });
  const dark = new THREE.MeshStandardMaterial({ color: '#151a18', roughness: .8 });
  const seam = new THREE.MeshBasicMaterial({ color: '#303932' });
  const glow = new THREE.MeshBasicMaterial({ color: '#e0dbc4' });
  const occluders = [];
  function box(w, h, d, x, y, z, material, blocksArtwork = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = h > .15; mesh.receiveShadow = true;
    scene.add(mesh); if (blocksArtwork) occluders.push(mesh); return mesh;
  }
  walls.forEach(wall => box(...wall.size, ...wall.center, concrete));
  rooms.forEach((room, index) => {
    const width = room.x[1]-room.x[0], depth = room.z[1]-room.z[0];
    const x = (room.x[0]+room.x[1])/2, z = (room.z[0]+room.z[1])/2;
    box(width, .24, depth, x, -.12, z, floorMaterial);
    box(width, .3, depth, x, room.height+.15, z, ceiling);
    // Fine slab joints give scale without changing the flat walking surface.
    for (let sx = room.x[0]+3; sx < room.x[1]; sx += 3) box(.012, .003, depth, sx, .003, z, seam, false);
    for (let sz = room.z[0]+3; sz < room.z[1]; sz += 3) box(width, .003, .012, x, .003, sz, seam, false);
    // Ceiling coves and a soft pool of light make the full-height corners legible.
    box(width-.9, .025, .07, x, room.height-.04, room.z[1]-.48, glow, false);
    const fill = new THREE.PointLight('#d5ddcd', index === 1 ? 100 : 55, index === 1 ? 22 : 16, 2);
    fill.position.set(x, room.height-.6, z); scene.add(fill);
    // Low perimeter strips belong to the architecture, not a separate partition.
    for (const side of room.x) box(.025, .045, depth-.8, side+(side===room.x[0] ? .32 : -.32), .07, z, glow, false);
  });
  // Deeper beams articulate the six-metre central volume.
  for (const z of [-10.5, -15.5]) box(21.4, .35, .35, 3, 5.82, z, concrete);
  portals.forEach(portal => {
    const x = (portal.x[0]+portal.x[1])/2;
    box(portal.x[1]-portal.x[0]-.25, .025, .12, x, portal.height-.03, portal.z, glow, false);
    const light = new THREE.PointLight('#ddd7c4', 24, 7, 2);
    light.position.set(x, portal.height-.3, portal.z-.2); scene.add(light);
  });
  scene.add(new THREE.HemisphereLight('#cbd4ce', '#414b3c', 1.8));
  exhibits.forEach((p,index) => {
    const spot = new THREE.SpotLight('#f2e6cf', 85, 12, .85, .8, 2);
    spot.position.set(p.x-.5, rooms[index].height-.25, p.z+2.5);
    spot.target.position.set(p.x, 1.8, p.z-.2);
    spot.castShadow = true; spot.shadow.mapSize.set(512,512);
    spot.shadow.bias = -.0004; spot.shadow.normalBias = .03;
    scene.add(spot,spot.target);
    box(.24,.12,.32,spot.position.x,spot.position.y+.09,spot.position.z,dark);
  });

  let mode = 'intro', viewIndex = 0, started = false, lastReport = '';
  const motion = createMotion();
  const artworks = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  projects.forEach((project,index) => {
    const p = exhibits[index], group = new THREE.Group(), yaw = p.yaw*Math.PI/180;
    group.position.set(p.x,p.y,p.z); group.rotation.y = yaw;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(screenSize.width+.12,screenSize.height+.12,.13),dark);
    frame.position.z = -.075; frame.castShadow = true; group.add(frame); scene.add(group);
    const element = document.createElement('button');
    element.className = 'world-project'; element.type = 'button';
    element.setAttribute('aria-label', project.title.replace('\n',' ') + ' 프로젝트 열기');
    element.innerHTML = previewMarkup(project);
    element.addEventListener('click', event => {
      if (motion.moving || mode === 'intro' || mode === 'detail' || element.disabled) return;
      if (event.detail > 0) {
        const bounds = container.getBoundingClientRect();
        pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
        raycaster.setFromCamera(pointer,camera);
        const hit = raycaster.intersectObject(group,true)[0], wall = raycaster.intersectObjects(occluders,false)[0];
        if (!hit || (wall && wall.distance < hit.distance-.03)) return;
      }
      onSelect(index);
    });
    let mesh, object;
    if (nativeHTML) {
      const texture = new THREE.HTMLTexture(element); texture.colorSpace = THREE.SRGBColorSpace;
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(screenSize.width,screenSize.height),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
      group.add(mesh); interactions.add(mesh);
    } else {
      object = new CSS3DObject(element); object.position.copy(group.position); object.rotation.copy(group.rotation);
      object.scale.setScalar(screenSize.width/960); htmlScene.add(object);
      // A depth-writing alpha cutout exposes HTML behind the WebGL canvas.
      // Walls still cover the exact same plane, including rotated exhibits.
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(screenSize.width,screenSize.height),new THREE.ShaderMaterial({
        vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'void main(){gl_FragColor=vec4(0.0);}',blending:THREE.NoBlending,
      }));
      group.add(mesh);
    }
    artworks.push({element, position:group.position.clone(), normal:new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)), mesh, object});
  });
  function report() {
    const moving = motion.moving && mode !== 'detail';
    const index = mode === 'overview' ? nearestStop(motion.position) : viewIndex;
    const signature = [moving, mode, index].join(':');
    container.setAttribute('aria-busy', String(moving));
    container.dataset.station = String(moving ? -1 : index);
    if (signature === lastReport) return;
    lastReport = signature; onTravel({ moving, mode, index });
  }
  function placeCamera() {
    sampleRoute(motion.position,camera.position);
    camera.rotation.set(0,routeYaw(motion.position),0);
    camera.updateMatrixWorld();
  }
  function setView(nextMode, index = 0, travel, immediate = false) {
    const previousMode = mode;
    mode = nextMode; viewIndex = index;
    const distance = mode === 'intro' ? 0 : mode === 'overview'
      ? (travel === undefined ? motion.destination : Math.max(0,Math.min(1,travel))*routeLength)
      : stops[index];
    motion.target(distance, immediate || !started || reduced.matches || mode === 'detail' || previousMode === 'detail');
    started = true; placeCamera(); report();
  }
  function reduceMotion() {
    if (reduced.matches) { motion.target(motion.destination,true); placeCamera(); report(); }
  }
  reduced.addEventListener('change',reduceMotion);
  const resize = () => {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width,height); htmlRenderer.setSize(width,height);
    camera.aspect = width/height; camera.fov = 60;
    camera.zoom = Math.min(1,camera.aspect/.76);
    // Keep the exhibition above the controls on short portrait screens. This
    // framing is fixed per viewport; movement never changes zoom or eye height.
    if (width <= 600 && height < 700) camera.setViewOffset(width,height,0,(700-height)*.27,width,height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const direction = new THREE.Vector3(), projected = new THREE.Vector3();
  let frameId, lastTime = performance.now();
  function animate(time) {
    frameId = requestAnimationFrame(animate);
    const dt = Math.min((time-lastTime)/1000,.05); lastTime = time;
    if (document.hidden || mode === 'detail') return;
    motion.step(dt); placeCamera(); report(); scene.updateMatrixWorld();
    for (const artwork of artworks) {
      direction.subVectors(camera.position,artwork.position);
      const distance = direction.length();
      const visible = direction.dot(artwork.normal) > .08 && distance < 55;
      direction.negate().normalize(); raycaster.set(camera.position,direction);
      const wall = raycaster.intersectObjects(occluders,false)[0];
      projected.copy(artwork.position).project(camera);
      const inView = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
      const accessible = visible && inView && (!wall || wall.distance > distance-.04) && mode !== 'intro' && mode !== 'detail' && !motion.moving;
      artwork.element.style.visibility = visible ? 'visible' : 'hidden';
      artwork.element.style.pointerEvents = accessible ? 'auto' : 'none';
      artwork.element.disabled = !accessible; artwork.element.tabIndex = accessible ? 0 : -1;
      artwork.element.setAttribute('aria-hidden',String(!accessible)); artwork.mesh.visible = visible;
    }
    renderer.render(scene,camera);
    if (nativeHTML) interactions.update(); else htmlRenderer.render(htmlScene,camera);
  }
  placeCamera(); frameId = requestAnimationFrame(animate);
  return {
    setView,
    getProgress: () => motion.destination/routeLength,
    isMoving: () => motion.moving,
    dispose() {
      cancelAnimationFrame(frameId); observer.disconnect(); interactions.disconnect();
      reduced.removeEventListener('change',reduceMotion);
      const materials = new Set();
      scene.traverse(object => { object.geometry?.dispose(); if (object.material) materials.add(object.material); });
      materials.forEach(material => { if (material.map && material.map !== grain) material.map.dispose(); material.dispose(); });
      grain.dispose(); renderer.dispose(); container.replaceChildren();
    },
  };
}
