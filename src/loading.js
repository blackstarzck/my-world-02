export const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// Optional fonts and preview images must never trap a visitor on the loader.
export function withTimeout(task, milliseconds = 8000) {
  let timer;
  return Promise.race([
    Promise.resolve(task).then(() => true, () => false),
    new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

async function prepareFonts() {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500&display=swap';
  const loaded = new Promise((resolve,reject) => { stylesheet.onload = resolve; stylesheet.onerror = reject; });
  document.head.append(stylesheet);
  await loaded;
  if (document.fonts) await Promise.all([
    document.fonts.load('400 58px "Cormorant Garamond"'),
    document.fonts.load('500 159px "Cormorant Garamond"'),
    document.fonts.load('italic 400 58px "Cormorant Garamond"'),
    document.fonts.load('400 18px "DM Sans"'),
    document.fonts.load('700 18px "DM Sans"'),
    document.fonts.load('400 13px "Noto Sans KR"','전시 공간 프로젝트 불러오는 중'),
    document.fonts.ready,
  ]);
}

export async function preparePreviews(elements, onProgress = () => {}) {
  const images = elements.flatMap(element => [...element.querySelectorAll('img')]);
  const tasks = [
    () => withTimeout(prepareFonts(), 4000),
    ...images.map(image => async () => {
      const ready = await withTimeout(image.decode());
      if (!ready) {
        const fallback = document.createElement('div');
        fallback.className = 'project-preview preview-unavailable';
        fallback.textContent = image.alt || '프로젝트 미리보기';
        image.replaceWith(fallback);
      }
      return ready;
    }),
  ];
  let done = 0;
  await Promise.all(tasks.map(async task => { await task(); onProgress(++done / tasks.length); }));
}
