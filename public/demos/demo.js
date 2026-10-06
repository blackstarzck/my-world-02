const demo = document.body.dataset.demo;
const $ = (id) => document.getElementById(id);

if (demo === 'chromatic') {
  document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-palette]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('color-field').style.setProperty('--hue', `${[0, 290, 90][Number(button.dataset.palette)]}deg`);
  }));
  $('speed').addEventListener('input', event => $('color-field').style.setProperty('--speed', `${45 - Number(event.target.value)}s`));
  $('pause-color').addEventListener('click', () => {
    const paused = document.body.classList.toggle('paused');
    $('pause-color').textContent = paused ? '다시 재생' : '일시 정지';
    $('pause-color').setAttribute('aria-pressed', String(paused));
  });
  document.addEventListener('pointermove', event => {
    $('color-field').style.setProperty('--pointer-x', `${(event.clientX / innerWidth - .5) * 16}%`);
    $('color-field').style.setProperty('--pointer-y', `${(event.clientY / innerHeight - .5) * 16}%`);
  });
}

if (demo === 'type') {
  const fonts = {serif: "'Cormorant Garamond',Georgia,serif", sans: "'DM Sans',sans-serif", mono: "'Courier New',monospace"};
  const update = () => {
    $('type-result').textContent = $('type-text').value || 'Your words.';
    $('type-result').style.fontSize = `${$('type-size').value}px`;
    $('type-result').style.letterSpacing = `${$('type-spacing').value}px`;
    $('type-result').style.fontFamily = fonts[$('type-font').value];
  };
  ['type-text','type-size','type-spacing','type-font'].forEach(id => $(id).addEventListener('input', update));
  $('save-type').addEventListener('click', async () => {
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e8643a'; ctx.fillRect(0,0,1200,1200); ctx.fillStyle = '#25271d';
    const size = Number($('type-size').value) * 1.8;
    ctx.font = `400 ${size}px ${fonts[$('type-font').value]}`;
    ctx.letterSpacing = `${Number($('type-spacing').value) * 1.8}px`;
    const text = $('type-text').value || 'Your words.';
    const lines = []; let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > 1040 && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
    const lineHeight = Math.min(size * 1.15, 990 / lines.length);
    lines.forEach((value, i) => ctx.fillText(value, 80, 160 + i * lineHeight, 1040));
    ctx.font = '16px sans-serif'; ctx.letterSpacing = '2px'; ctx.fillText('TYPE / PLAY',80,1140);
    canvas.toBlob(blob => {
      if (!blob) { $('type-status').textContent = '이미지를 만들지 못했습니다. 다시 시도해 주세요.'; return; }
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'type-playground.png'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url),1000); $('type-status').textContent = '이미지를 만들었습니다.';
    });
  });
}

if (demo === 'notes') {
  const storageKey = 'my-world-orbit-notes-v1';
  const starter = [
    {id:'first',title:'Notice the little things.',body:'매일 지나치는 장면에도\n새로운 아이디어가 숨어 있어요.',color:'green'},
    {id:'second',title:'What if we tried?',body:'완벽한 계획보다\n작은 첫 번째 시도.',color:'orange'},
    {id:'third',title:'Begin anywhere.',body:'좋아하는 문장, 떠오른 생각,\n잊고 싶지 않은 순간.',color:'blue'},
  ];
  let notes = starter;
  try { const stored = JSON.parse(localStorage.getItem(storageKey)); if (Array.isArray(stored) && stored.every(n => n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string' && ['green','orange','blue'].includes(n.color))) notes = stored; } catch { /* Keep the starter when storage is unavailable. */ }
  let editingId = null;
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(notes)); $('notes-status').textContent = '이 브라우저에 저장했습니다.'; } catch { $('notes-status').textContent = '현재 브라우저에서 저장할 수 없어 이 화면에서만 유지됩니다.'; } }
  function render() {
    $('notes-grid').replaceChildren(...notes.map((note, i) => {
      const button = document.createElement('button'); button.className = 'note-card'; button.dataset.color = note.color;
      const number = document.createElement('span'); number.textContent = `${String(i + 1).padStart(2,'0')} / THOUGHT`;
      const title = document.createElement('strong'); title.textContent = note.title;
      const body = document.createElement('p'); body.textContent = note.body;
      button.append(number,title,body); button.addEventListener('click', () => edit(note)); return button;
    }));
    if (!notes.length) $('notes-status').textContent = '첫 번째 생각을 남겨 보세요. 새 메모를 누르면 시작할 수 있어요.';
  }
  function edit(note) {
    editingId = note?.id || null;
    $('note-title').value = note?.title || ''; $('note-body').value = note?.body || ''; $('note-color').value = note?.color || 'green';
    $('delete-note').hidden = !note; $('note-editor').showModal(); $('note-title').focus();
  }
  $('add-note').addEventListener('click', () => edit());
  $('cancel-note').addEventListener('click', () => $('note-editor').close());
  $('note-form').addEventListener('submit', event => {
    event.preventDefault(); const title = $('note-title').value.trim();
    if (!title) { $('note-title').focus(); return; }
    const note = {id:editingId || crypto.randomUUID(),title,body:$('note-body').value,color:$('note-color').value};
    if (editingId) notes = notes.map(n => n.id === editingId ? note : n); else notes = [...notes,note];
    save(); render(); $('note-editor').close();
  });
  $('delete-note').addEventListener('click', () => { notes = notes.filter(n => n.id !== editingId); save(); render(); $('note-editor').close(); });
  render();
}

if (demo === 'rhythm') {
  let duration = 25*60, remaining = duration, deadline = 0, running = false;
  const render = () => { $('timer').textContent = `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`; };
  function stop() { running = false; document.body.classList.remove('running'); $('start-timer').textContent = remaining === duration ? '시작' : '계속하기'; }
  $('start-timer').addEventListener('click', () => {
    if (running) { remaining = Math.max(0, Math.ceil((deadline-Date.now())/1000)); stop(); $('timer-message').textContent = '잠시 멈췄습니다. 준비되면 이어가세요.'; }
    else { if (!remaining) remaining = duration; deadline = Date.now()+remaining*1000; running = true; document.body.classList.add('running'); $('start-timer').textContent = '일시 정지'; $('timer-message').textContent = '당신의 리듬으로, 한 번에 하나씩.'; }
    render();
  });
  $('reset-timer').addEventListener('click', () => { remaining = duration; stop(); render(); $('timer-message').textContent = '처음으로 돌아왔습니다. 다시 시작해 보세요.'; });
  document.querySelectorAll('[data-minutes]').forEach(button => button.addEventListener('click', () => {
    duration = Number(button.dataset.minutes)*60; remaining = duration; stop(); render();
    document.querySelectorAll('[data-minutes]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('timer-label').textContent = duration === 1500 ? 'TIME TO FOCUS' : 'TAKE A BREATH';
    $('timer-message').textContent = duration === 1500 ? '지금은 한 가지 일에만 집중해 보세요.' : '잠깐의 쉼도 당신의 리듬입니다.';
  }));
  setInterval(() => {
    if (!running) return;
    remaining = Math.max(0, Math.ceil((deadline-Date.now())/1000)); render();
    if (!remaining) { stop(); $('start-timer').textContent = '다시 시작'; $('timer-message').textContent = '시간이 다 되었어요. 잠깐 숨을 돌려 보세요.'; }
  },250);
}
