// 실제 포트폴리오 내용은 이 파일에서 바꿀 수 있습니다.
export const portfolio = {
  name: 'My World',
  subtitle: 'A Digital Gallery',
  introduction: '화면 너머의 경험을 만듭니다. 생각을 형태로, 아이디어를 직접 만질 수 있는 경험으로 옮기는 작업들을 이 공간에 모았습니다.',
  note: '현재 전시된 네 작품은 갤러리 체험을 위한 예시 프로젝트입니다.',
};

export const projects = [
  {
    id: 'chromatic-field', number: '01', title: 'Chromatic\nField', category: 'Creative development', year: '2026',
    theme: 'chromatic', url: '/demos/chromatic-field.html', role: '기획 · 디자인 · 개발',
    summary: '색이 만나고, 빛이 흐르고, 작은 움직임이 새로운 풍경을 만드는 곳.',
    description: '색과 움직임을 탐구하는 인터랙티브 실험입니다. 정해진 하나의 결과물 대신, 방문자가 색의 조합과 흐름의 속도를 조절하며 자신만의 장면을 만듭니다.',
    interaction: '왼쪽 화면에서 색 조합을 바꾸거나 움직임을 멈춰 보세요. 포인터를 움직이면 빛이 함께 흐릅니다.',
    tags: ['Interaction', 'Generative', 'Web experience'],
  },
  {
    id: 'type-playground', number: '02', title: 'Type\nPlayground', category: 'Design tool', year: '2026',
    theme: 'type', url: '/demos/type-playground.html', role: '디자인 · 프런트엔드 개발',
    summary: '글자는 읽는 것이기도, 가지고 노는 것이기도 하니까.',
    description: '문자를 시각적인 재료로 다루는 작은 도구입니다. 한 단어를 입력하고 크기, 간격, 서체를 바꾸는 것만으로도 전혀 다른 인상을 발견할 수 있습니다.',
    interaction: '직접 문장을 입력하고 크기와 자간을 바꿔 보세요. 완성한 결과는 이미지로 저장할 수 있습니다.',
    tags: ['Typography', 'Interactive tool', 'Design'],
  },
  {
    id: 'orbit-notes', number: '03', title: 'Orbit\nNotes', category: 'Digital product', year: '2025',
    theme: 'notes', url: '/demos/orbit-notes.html', role: '제품 기획 · 디자인 · 개발',
    summary: '흩어지는 생각을 위한, 조용하고 작은 궤도.',
    description: '떠오른 생각을 부담 없이 적고 다시 발견하는 메모 공간입니다. 복잡한 분류보다 빠른 기록에 집중하고, 색과 여백을 이용해 생각의 구분을 돕습니다.',
    interaction: '새 메모를 작성하거나 기존 메모를 눌러 수정해 보세요. 이 브라우저에 메모가 저장됩니다.',
    tags: ['Product design', 'Local-first', 'Writing'],
  },
  {
    id: 'daily-rhythm', number: '04', title: 'Daily\nRhythm', category: 'Web application', year: '2025',
    theme: 'rhythm', url: '/demos/daily-rhythm.html', role: '사용자 경험 설계 · 개발',
    summary: '몰입하는 시간과 쉬어 가는 시간, 나만의 리듬으로.',
    description: '시계의 숫자보다 지금의 한 가지 일에 집중하기 위한 타이머입니다. 필요한 조작만 남기고, 시간이 흐르는 감각을 부드러운 색과 원으로 표현했습니다.',
    interaction: '집중 또는 휴식 모드를 선택한 뒤 타이머를 시작해 보세요. 잠시 멈추거나 처음으로 되돌릴 수 있습니다.',
    tags: ['Focus', 'Motion', 'Everyday tool'],
  },
];

export function previewMarkup(project) {
  if (project.previewImage) {
    const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    return `<img class="project-preview project-screenshot" src="${escape(project.previewImage)}" alt="${escape(project.title.replace('\n', ' '))} 웹사이트 화면" />`;
  }
  const content = {
    chromatic: '<div class="preview-top"><b>CHROMATIC FIELD</b><span>AN EXPERIMENT IN COLOR</span></div><div class="color-field"></div><div class="preview-bottom"><span>Let your<br><i>curiosity flow.</i></span><small>COLOR · MOTION · PLAY</small></div>',
    type: '<div class="preview-top"><b>TYPE / PLAY</b><span>WORDS BECOME WORLDS</span></div><div class="type-art">Make<br><i>some</i><br>noise.</div><div class="preview-bottom"><small>A PLAYGROUND FOR YOUR WORDS</small><span>↗</span></div>',
    notes: '<div class="preview-top"><b>orbit<span class="orbit-mark">✳</span></b><span>A LITTLE SPACE FOR BIG IDEAS</span></div><div class="notes-heading">Room for<br><i>your thoughts.</i></div><div class="note-cards"><div>01 / OBSERVATION<br><strong>Notice the<br>little things.</strong></div><div>02 / IDEA<br><strong>What if<br>we tried?</strong></div><div>03 / EVERYDAY<br><strong>Begin<br>anywhere.</strong></div></div>',
    rhythm: '<div class="preview-top"><b>DAILY RHYTHM</b><span>ONE THING AT A TIME</span></div><div class="rhythm-circle"><span>TIME TO FOCUS</span><strong>25:00</strong><small>Find your flow.</small></div><div class="preview-bottom"><small>A MOMENT, JUST FOR YOU.</small><span>◌</span></div>',
  };
  return `<div class="project-preview preview-${project.theme}">${content[project.theme]}</div>`;
}
