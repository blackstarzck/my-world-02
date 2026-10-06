import './style.css';
import { projects, portfolio, previewMarkup } from './projects.js';
import { createGallery } from './gallery.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="world" class="world"></div><div class="atmosphere" aria-hidden="true"></div>
  <header class="site-header"><a class="brand" href="#" aria-label="My World 입구로"><span>${portfolio.name}</span><small>${portfolio.subtitle}</small></a><nav aria-label="주 메뉴"><button id="about-button">About</button><button id="index-button">Index <span class="menu-icon" aria-hidden="true"><i></i><i></i></span></button></nav></header>
  <main>
    <section id="entrance" class="entrance" aria-labelledby="entrance-title"><div class="entrance-eyebrow">AN INDEPENDENT PORTFOLIO · VOL. 01</div><button id="enter-button" class="enter-button"><span>Enter gallery</span><span class="enter-symbol" aria-hidden="true">↗</span></button><div class="entrance-bottom"><h1 id="entrance-title">My <i>World.</i></h1><div class="entrance-note"><span>생각이 공간이 되는 곳.</span><span>작업을 걷고, 발견하고, 경험하세요.</span></div></div></section>
    <section id="gallery-ui" class="gallery-ui" hidden aria-label="프로젝트 갤러리"><div class="gallery-guide"><span id="gallery-guide-text">SCROLL TO EXPLORE</span><i></i><button id="space-button">공간 둘러보기 ↗</button></div><div class="gallery-footer"><div class="project-heading"><span id="project-category" class="eyebrow">SELECTED WORKS / 01—04</span><h1 id="project-title">A walk through<br><i>my work.</i></h1><button id="details-button" class="text-button" hidden>프로젝트 열기 <span>↗</span></button></div><div class="gallery-controls"><div class="pagination"><button id="previous-button" class="circle-button" aria-label="이전 프로젝트">←</button><div id="project-dots" class="project-dots">${projects.map((p,i) => `<button data-project="${i}" aria-label="${p.title.replace('\n',' ')} 보기"><span></span></button>`).join('')}</div><button id="next-button" class="circle-button" aria-label="다음 프로젝트">→</button></div><span class="counter" id="counter">01 — 04</span></div><button id="overview-button" class="pill-button">All projects <span>↗</span></button></div></section>
    <section id="detail" class="detail" hidden aria-label="프로젝트 상세"><div class="live-side"><div class="live-toolbar"><span><i></i> LIVE WEBSITE</span><a id="external-link" target="_blank" rel="noopener noreferrer">새 탭에서 열기 ↗</a></div><div class="iframe-holder"><iframe id="project-iframe" title="선택한 프로젝트의 실제 웹사이트" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" referrerpolicy="strict-origin-when-cross-origin"></iframe><div id="frame-loading" class="frame-loading">프로젝트를 불러오는 중<span></span></div></div><p class="embed-help">화면이 보이지 않으면 <a id="fallback-link" target="_blank" rel="noopener noreferrer">새 탭에서 열어 보세요 ↗</a></p></div><article class="project-story" tabindex="-1"><button id="close-detail" class="close-button" aria-label="갤러리로 돌아가기">×</button><div class="story-content"><span id="detail-category" class="eyebrow"></span><h1 id="detail-title"></h1><p id="detail-summary" class="summary"></p><dl class="project-meta"><div><dt>ROLE</dt><dd id="detail-role"></dd></div><div><dt>YEAR</dt><dd id="detail-year"></dd></div></dl><div class="story-rule"></div><p id="detail-description" class="description"></p><div class="try-it"><span>EXPERIENCE IT</span><p id="detail-interaction"></p></div><div id="detail-tags" class="tags"></div><button id="next-detail" class="next-project"><span>NEXT PROJECT</span><strong></strong><i>↗</i></button></div></article></section>
  </main>
  <footer class="site-footer"><span class="edition">PERSONAL EXHIBITION / 2026</span><button id="sound-button" class="sound-button" aria-label="배경음 켜기" aria-pressed="false"><span>Sound OFF</span><i></i><i></i><i></i><i></i></button></footer>
  <dialog id="index-dialog" class="overlay-dialog"><div class="overlay-top"><span class="eyebrow">EXPLORE THE COLLECTION</span><button class="close-button" data-close aria-label="프로젝트 목록 닫기">×</button></div><h2>Selected <i>works.</i></h2><div class="index-list">${projects.map((p,i) => `<button class="index-row" data-open="${i}"><span class="index-number">${p.number}</span><span class="index-thumb">${previewMarkup(p)}</span><span class="index-title">${p.title.replace('\n',' ')}</span><span class="index-category">${p.category}</span><span class="index-arrow">↗</span></button>`).join('')}</div><p class="index-note">각 프로젝트는 직접 조작할 수 있습니다.</p></dialog>
  <dialog id="about-dialog" class="overlay-dialog about-dialog"><div class="overlay-top"><span class="eyebrow">ABOUT THIS WORLD</span><button class="close-button" data-close aria-label="소개 닫기">×</button></div><h2>Ideas into<br><i>experiences.</i></h2><p class="about-intro">${portfolio.introduction}</p><div class="about-bottom"><span>DESIGN · DEVELOPMENT · EXPERIMENT</span><p>${portfolio.note}</p><p>공간 구성과 관람 흐름은 <a href="https://ambientweaving2.lab.zozo.jp/en" target="_blank" rel="noopener noreferrer">Ambient Weaving Ⅱ</a>에서 영감을 받았습니다.</p></div></dialog>
  <p class="sr-only" id="announcement" aria-live="polite"></p>
`;

const $ = (id) => document.getElementById(id);
let mode = 'intro', selected = 0, requested = 0, travel = 0, wheelTime = 0;
let unavailable = false;
const dialogs = [$('index-dialog'), $('about-dialog')];
const modalOpen = () => dialogs.some(dialog => dialog.open);
const announce = (text) => { $('announcement').textContent = text; };
const gallery = createGallery($('world'), openProject, () => { unavailable = true; }, onTravel);

function setMode(next) {
  mode = next; document.body.dataset.mode = mode;
  $('entrance').hidden = mode !== 'intro';
  $('gallery-ui').hidden = !['overview', 'focus'].includes(mode);
  $('detail').hidden = mode !== 'detail';
  $('world').inert = mode === 'intro' || mode === 'detail';
  document.querySelector('.site-header').inert = mode === 'detail';
  document.querySelector('.site-footer').inert = mode === 'detail';
  $('details-button').hidden = mode !== 'focus';
}
function updateNavigation() {
  $('previous-button').disabled = mode === 'focus' && requested === 0;
  $('next-button').disabled = mode === 'focus' && requested === projects.length - 1;
}
function updateHeading() {
  const p = projects[selected];
  $('project-title').innerHTML = mode === 'overview' ? 'A walk through<br><i>my work.</i>' : p.title.replace('\n','<br>');
  $('project-category').textContent = mode === 'overview' ? 'SELECTED WORKS / 01—04' : p.number + ' / ' + p.category.toUpperCase();
  $('counter').textContent = mode === 'overview' ? '04 WORKS' : p.number + ' — 04';
  $('project-dots').querySelectorAll('button').forEach((button, i) => {
    button.setAttribute('aria-current', String(mode === 'focus' && i === selected));
  });
  $('space-button').textContent = mode === 'overview' ? '작품으로 돌아가기 ↗' : '공간 둘러보기 ↗';
  updateNavigation();
}
function onTravel(state) {
  document.body.dataset.moving = String(state.moving);
  $('details-button').disabled = state.moving;
  document.querySelectorAll('[data-open]').forEach(button => { button.disabled = state.moving; });
  $('gallery-guide-text').textContent = state.moving ? '다음 공간으로 이동 중' : mode === 'overview' ? 'SCROLL TO WALK' : 'SCROLL TO EXPLORE';
  if (state.mode === 'overview') selected = state.index;
  if (!state.moving && state.mode === 'focus') {
    selected = requested = state.index; updateHeading();
    history.replaceState(null, '', '#gallery/' + projects[selected].id);
    announce(projects[selected].title.replace('\n',' ') + '. 도착했습니다. 프로젝트 열기 버튼으로 체험하세요.');
  }
  updateNavigation();
}
function enter() {
  focusProject(0);
  if (unavailable) $('index-dialog').showModal();
}
function focusProject(index, immediate = false) {
  requested = Math.max(0, Math.min(projects.length-1, index));
  const previousMode = mode;
  setMode('focus');
  if (previousMode !== 'focus') updateHeading();
  gallery.setView('focus', requested, undefined, immediate);
  updateNavigation();
}
function openProject(index, fromHistory = false) {
  if (!fromHistory && mode !== 'detail' && gallery.isMoving()) return;
  dialogs.forEach(dialog => dialog.close());
  selected = requested = index;
  const p = projects[index];
  setMode('detail'); gallery.setView('detail',index);
  $('detail-title').innerHTML = p.title.replace('\n','<br>');
  $('detail-category').textContent = p.number + ' / ' + p.category.toUpperCase();
  for (const field of ['summary','role','year','description','interaction']) $('detail-' + field).textContent = p[field];
  $('detail-tags').replaceChildren(...p.tags.map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; }));
  $('external-link').href = p.url; $('fallback-link').href = p.url;
  $('frame-loading').hidden = false;
  $('project-iframe').title = p.title.replace('\n',' ') + ' 실제 웹사이트';
  $('project-iframe').src = p.url;
  $('next-detail').querySelector('strong').textContent = projects[(index+1)%projects.length].title.replace('\n',' ');
  document.querySelector('.project-story').scrollTop = 0;
  $('detail').scrollTop = 0; $('close-detail').focus({ preventScroll: true });
  if (!fromHistory) history.pushState({ project: p.id }, '', '#project/' + p.id);
  announce(p.title.replace('\n',' ') + ' 상세 화면. 웹사이트를 직접 조작할 수 있습니다.');
}
function closeProject() {
  focusProject(selected);
  $('project-iframe').removeAttribute('src'); $('details-button').focus({ preventScroll: true });
}
$('project-iframe').addEventListener('load', () => { $('frame-loading').hidden = true; });
$('enter-button').addEventListener('click', enter);
$('about-button').addEventListener('click', () => $('about-dialog').showModal());
$('index-button').addEventListener('click', () => $('index-dialog').showModal());
$('details-button').addEventListener('click', () => openProject(selected));
$('close-detail').addEventListener('click', closeProject);
$('next-detail').addEventListener('click', () => openProject((selected+1)%projects.length));
$('overview-button').addEventListener('click', () => $('index-dialog').showModal());
$('space-button').addEventListener('click', () => {
  if (mode === 'overview') { focusProject(selected); return; }
  travel = gallery.getProgress(); setMode('overview'); updateHeading();
  gallery.setView('overview',selected);
  history.replaceState(null,'','#space');
});
$('previous-button').addEventListener('click', () => focusProject((mode === 'overview' ? selected : requested)-1));
$('next-button').addEventListener('click', () => focusProject((mode === 'overview' ? selected : requested)+1));
$('project-dots').addEventListener('click', (event) => {
  const button = event.target.closest('[data-project]');
  if (button) focusProject(Number(button.dataset.project));
});
document.querySelectorAll('[data-open]').forEach(button => {
  button.addEventListener('click', () => openProject(Number(button.dataset.open)));
  button.setAttribute('aria-label', projects[Number(button.dataset.open)].title.replace('\n',' ') + ' 열기');
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault(); setMode('intro'); gallery.setView('intro');
  $('project-iframe').removeAttribute('src'); history.pushState(null,'','#'); $('enter-button').focus();
});
function navigate(delta) {
  if (modalOpen() || !['overview','focus'].includes(mode)) return;
  if (mode === 'overview') {
    travel = Math.max(0, Math.min(1, travel + Math.max(-120, Math.min(120, delta))*.0008));
    gallery.setView(mode,selected,travel);
  } else if (performance.now()-wheelTime > 900 && Math.abs(delta) > 12) {
    wheelTime = performance.now(); focusProject(requested+Math.sign(delta));
  }
}
window.addEventListener('wheel', (event) => {
  if (['overview','focus'].includes(mode) && !modalOpen()) { event.preventDefault(); navigate(event.deltaY || event.deltaX); }
}, { passive: false });
let dragStart = null;
$('world').addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  dragStart = { x: event.clientX, y: event.clientY };
});
window.addEventListener('pointerup', (event) => {
  if (!dragStart) return;
  const dx = dragStart.x-event.clientX, dy = dragStart.y-event.clientY;
  const delta = Math.abs(dy) > Math.abs(dx) ? dy : dx;
  if (Math.abs(delta) > 30) navigate(delta*3);
  dragStart = null;
});
window.addEventListener('pointercancel', () => { dragStart = null; });
window.addEventListener('keydown', (event) => {
  if (modalOpen()) return;
  if (event.key === 'Escape' && mode === 'detail') { closeProject(); return; }
  if (['overview','focus'].includes(mode) && ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const delta = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1;
    if (mode === 'overview') navigate(delta*120); else focusProject(requested+delta);
  }
});
function readRoute() {
  const [section, id] = location.hash.slice(1).split('/');
  const index = projects.findIndex(p => p.id === id);
  if (section === 'project' && index >= 0) openProject(index,true);
  else if (section === 'space') {
    setMode('overview'); travel = 0; updateHeading(); gallery.setView('overview',selected,travel);
    $('project-iframe').removeAttribute('src');
  } else if (section === 'gallery') {
    $('project-iframe').removeAttribute('src'); focusProject(index >= 0 ? index : 0, mode === 'intro');
  } else { setMode('intro'); gallery.setView('intro'); $('project-iframe').removeAttribute('src'); }
}
window.addEventListener('popstate', readRoute);

let audioContext, audioGain, soundOn = false;
$('sound-button').addEventListener('click', async () => {
  if (!audioContext) {
    audioContext = new AudioContext(); audioGain = audioContext.createGain(); audioGain.gain.value = 0; audioGain.connect(audioContext.destination);
    [110, 164.81, 220.15].forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.value = .12 / (i+1);
      oscillator.connect(gain); gain.connect(audioGain); oscillator.start();
    });
  }
  await audioContext.resume(); soundOn = !soundOn;
  audioGain.gain.setTargetAtTime(soundOn ? .18 : 0, audioContext.currentTime, .5);
  $('sound-button').setAttribute('aria-pressed', String(soundOn));
  $('sound-button').setAttribute('aria-label', `배경음 ${soundOn ? '끄기' : '켜기'}`);
  $('sound-button').querySelector('span').textContent = `Sound ${soundOn ? 'ON' : 'OFF'}`;
});
document.addEventListener('visibilitychange', () => { if (audioGain) audioGain.gain.setTargetAtTime(!document.hidden && soundOn ? .18 : 0, audioContext.currentTime, .3); });
setMode('intro'); readRoute();
if (import.meta.hot) import.meta.hot.dispose(() => { gallery.dispose(); audioContext?.close(); });
