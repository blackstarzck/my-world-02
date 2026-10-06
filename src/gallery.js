import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { projects, previewMarkup } from './projects.js';

export function createGallery(container, onSelect, onUnavailable) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#141617');
  scene.fog = new THREE.Fog('#141617', 20, 65);
  const htmlScene = new THREE.Scene();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    onUnavailable();
    return { setView() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-label', '프로젝트가 전시된 3D 갤러리 복도');
  renderer.domElement.setAttribute('role', 'img');
  container.append(renderer.domElement);
  const htmlRenderer = new CSS3DRenderer();
  htmlRenderer.domElement.className = 'html-world';
  container.append(htmlRenderer.domElement);
  const nativeHTML = typeof renderer.getContext().texElementImage2D === 'function' && typeof renderer.domElement.requestPaint === 'function';
  if (nativeHTML) renderer.domElement.setAttribute('role', 'group');
  container.dataset.renderMode = nativeHTML ? 'html-in-canvas' : 'html-3d';
  const interactions = new InteractionManager();
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 120);
  interactions.connect(renderer, camera);
  const desiredPosition = new THREE.Vector3(0, 3.1, 10);
  const desiredLook = new THREE.Vector3(0, 2.7, -20);
  const currentLook = desiredLook.clone();
  camera.position.copy(desiredPosition);
  camera.lookAt(currentLook);

  const concrete = new THREE.MeshStandardMaterial({ color: '#414446', roughness: .97, metalness: .03 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#25282a', roughness: .32, metalness: .38 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111212', roughness: .68 });
  const glow = new THREE.MeshBasicMaterial({ color: '#dcd8c5' });
  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z); scene.add(mesh); return mesh;
  }
  box(14, .2, 72, 0, -.12, -24, floorMaterial);
  box(.25, 7, 72, -7.05, 3.5, -24, concrete);
  box(.25, 7, 72, 7.05, 3.5, -24, concrete);
  box(14, .2, 72, 0, 7, -24, dark);
  box(14, 7, .2, 0, 3.5, -57, concrete);
  // Repeated wall seams, ceiling light strips and floor joints establish depth.
  for (let z = 8; z > -56; z -= 8) {
    box(.035, 6.8, .04, -6.9, 3.4, z, dark);
    box(.035, 6.8, .04, 6.9, 3.4, z, dark);
    box(13.8, .02, .035, 0, .01, z, dark);
    box(5.4, .025, .06, 0, 6.85, z, glow);
    const light = new THREE.PointLight('#e6e7e1', 45, 16, 2);
    light.position.set(0, 5.6, z); scene.add(light);
  }
  box(.025, .04, 65, -6.78, .12, -23, glow);
  box(.025, .04, 65, 6.78, .12, -23, glow);
  const ambient = new THREE.HemisphereLight('#bcc7d3', '#25221e', 1.05);
  scene.add(ambient);
  const artworks = [];
  const positions = projects.map((p, i) => ({ x: i % 2 === 0 ? -6.85 : 6.85, y: 3.15, z: -i * 10 - 3, rotation: i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2 }));
  projects.forEach((project, index) => {
    const position = positions[index];
    const group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = position.rotation;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.48, 4.08, .12), dark);
    frame.position.z = -.07; group.add(frame); scene.add(group);
    const element = document.createElement('button');
    element.className = 'world-project';
    element.type = 'button';
    element.setAttribute('aria-label', `${project.title.replace('\n', ' ')} 프로젝트 열기`);
    element.innerHTML = previewMarkup(project) + `<span class="world-caption">${project.number} &nbsp; ${project.title.replace('\n', ' ')}<span>VIEW PROJECT</span></span>`;
    element.addEventListener('click', () => onSelect(index));
    if (nativeHTML) {
      const texture = new THREE.HTMLTexture(element);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
      group.add(mesh); interactions.add(mesh);
      artworks.push({ element, position, mesh });
    } else {
      const object = new CSS3DObject(element);
      object.position.set(position.x, position.y, position.z);
      object.rotation.y = position.rotation;
      object.scale.setScalar(.00666667);
      htmlScene.add(object);
      artworks.push({ element, position, object });
    }
  });

  let mode = 'intro';
  let viewIndex = 0;
  let pointerX = 0, pointerY = 0;
  let frameId, lastTime = performance.now();
  const pointer = (event) => {
    pointerX = (event.clientX / innerWidth - .5) * 2;
    pointerY = (event.clientY / innerHeight - .5) * 2;
  };
  window.addEventListener('pointermove', pointer);
  function setView(nextMode, index = 0, travel = 0) {
    mode = nextMode; viewIndex = index;
    if (mode === 'intro' || mode === 'overview') {
      desiredPosition.set(0, 3.1, 10 - travel * 38);
      desiredLook.set(0, 2.9, -28 - travel * 30);
    } else {
      const p = positions[index];
      desiredPosition.set(mode === 'detail' ? Math.sign(p.x) * 2.9 : -Math.sign(p.x) * 2, 3.15, p.z + (mode === 'detail' ? 0 : .8));
      desiredLook.set(p.x, mode === 'detail' ? 3.15 : 2.55, p.z);
    }
    resize();
  }
  const resize = () => {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height);
    htmlRenderer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 68 : 54;
    camera.zoom = mode === 'focus' ? Math.min(1, camera.aspect / .62) : 1;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  function animate(time) {
    frameId = requestAnimationFrame(animate);
    const dt = Math.min((time - lastTime) / 1000, .08); lastTime = time;
    if (document.hidden || document.body.dataset.mode === 'detail') return;
    const factor = reduced ? 1 : 1 - Math.exp(-dt * 3.4);
    const drift = mode === 'detail' || reduced ? 0 : .16;
    const position = desiredPosition.clone();
    position.x += pointerX * drift;
    position.y -= pointerY * drift * .45;
    camera.position.lerp(position, factor);
    currentLook.lerp(desiredLook, factor);
    camera.lookAt(currentLook);
    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i];
      const distance = camera.position.distanceTo(new THREE.Vector3(artwork.position.x, artwork.position.y, artwork.position.z));
      const visible = (mode === 'intro' || mode === 'overview' || i === viewIndex) && distance < 48;
      artwork.element.style.opacity = visible ? Math.max(.25, Math.min(1, 1.65 - distance / 34)) : 0;
      artwork.element.style.pointerEvents = visible && mode !== 'intro' && mode !== 'detail' ? 'auto' : 'none';
      artwork.element.tabIndex = visible && mode !== 'intro' && mode !== 'detail' ? 0 : -1;
      artwork.element.setAttribute('aria-hidden', String(!visible));
      if (artwork.mesh) artwork.mesh.visible = visible;
    }
    renderer.render(scene, camera);
    if (nativeHTML) interactions.update(); else htmlRenderer.render(htmlScene, camera);
  }
  frameId = requestAnimationFrame(animate);
  return {
    setView,
    dispose() {
      cancelAnimationFrame(frameId); observer.disconnect(); window.removeEventListener('pointermove', pointer);
      interactions.disconnect();
      scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) { object.material.map?.dispose(); object.material.dispose(); } });
      renderer.dispose(); container.replaceChildren();
    },
  };
}
