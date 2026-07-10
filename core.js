const STORAGE_KEY = 'cq-academy-designmd-v1';
const LEGACY_STORAGE_KEY = 'cq-academy-v1';
const storage = {
  get() {
    try { return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY); }
    catch (_) { return null; }
  },
  set(value) {
    try { localStorage.setItem(STORAGE_KEY, value); }
    catch (_) { /* Storage is optional in restricted previews. */ }
  }
};

let state = JSON.parse(storage.get() || 'null') || {
  course: 0,
  lesson: 0,
  xp: 0,
  completed: {},
  answers: {},
  codes: {}
};
state.completed ||= {};
state.answers ||= {};
state.codes ||= {};
state.course = Math.max(0, Math.min(Number(state.course) || 0, courses.length - 1));
state.lesson = Math.max(0, Number(state.lesson) || 0);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const key = (course, lesson) => `${course}-${lesson}`;

function save() {
  storage.set(JSON.stringify(state));
  renderHud();
  renderTopContext();
}
function isDone(course, lesson) { return Boolean(state.completed[key(course, lesson)]); }
function courseDone(course) { return courses[course].lessons.every((_, index) => isDone(course, index)); }
function courseUnlocked(course) { return course === 0 || courseDone(course - 1); }
function lessonUnlocked(course, lesson) {
  if (!courseUnlocked(course)) return false;
  return lesson === 0 || isDone(course, lesson) || isDone(course, lesson - 1);
}
function completedCount(course) { return courses[course].lessons.filter((_, index) => isDone(course, index)).length; }
function firstIncomplete(course) {
  const index = courses[course].lessons.findIndex((_, lesson) => !isDone(course, lesson));
  return index < 0 ? courses[course].lessons.length : index;
}
function coursePercent(course) { return Math.round(completedCount(course) / courses[course].lessons.length * 100); }
function currentLesson() { return courses[state.course].lessons[state.lesson]; }

function svgIcon(name) {
  const paths = {
    play: '<path d="M8 5v14l11-7L8 5Z"/>',
    refresh: '<path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"/>',
    arrow: '<path d="m13.17 12-4.58-4.59L10 6l6 6-6 6-1.41-1.41L13.17 12Z"/>',
    back: '<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2Z"/>',
    bulb: '<path d="M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Zm2.85 11.1-.85.6V15h-4v-1.3l-.85-.6A5 5 0 1 1 14.85 13.1Z"/>',
    check: '<path d="m9 16.17-4.17-4.18L3.41 13.4 9 19 21 7l-1.41-1.41L9 16.17Z"/>',
    lock: '<path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v10h14V10a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm7 12H7v-8h10v8Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
}

function setDrawer(open) {
  document.body.classList.toggle('drawer-open', open);
  const button = $('#menuButton');
  if (button) button.setAttribute('aria-expanded', String(open));
}

function renderHud() {
  const total = courses.reduce((sum, course) => sum + course.lessons.length, 0);
  const done = Object.keys(state.completed).filter(entry => state.completed[entry]).length;
  const mastery = Math.round(done / total * 100);
  const level = Math.floor(state.xp / 180) + 1;
  $('#level').textContent = level;
  $('#xp').textContent = state.xp;
  $('#mastery').textContent = `${mastery}%`;
  $('#drawerMastery').textContent = `${mastery}%`;
  $('#drawerMasteryFill').style.width = `${mastery}%`;
}

function renderTopContext() {
  const course = courses[state.course];
  const lesson = course.lessons[state.lesson];
  $('#topCourseLabel').textContent = `${course.number} · ${completedCount(state.course)}/${course.lessons.length}完了`;
  $('#topLessonLabel').textContent = lesson ? lesson.title : `${course.title} 完了`;
  $('#topProgressFill').style.width = `${coursePercent(state.course)}%`;
}

function renderMap() {
  $('#courseMap').innerHTML = courses.map((course, index) => {
    const unlocked = courseUnlocked(index);
    const done = courseDone(index);
    const current = index === state.course;
    const stateLabel = !unlocked ? 'ロック' : done ? '完了' : `${coursePercent(index)}%`;
    const leading = done ? '✓' : String(index + 1).padStart(2, '0');
    return `
      <button class="course-node ${current ? 'active' : ''} ${done ? 'done' : ''} ${!unlocked ? 'locked' : ''}"
        data-course="${index}" ${unlocked ? '' : 'disabled'} aria-current="${current ? 'page' : 'false'}">
        <span class="course-index">${!unlocked ? '🔒' : leading}</span>
        <span class="course-copy"><strong>${esc(course.title)}</strong><span>${esc(course.skill)}</span></span>
        <span class="course-state">${stateLabel}</span>
      </button>`;
  }).join('');
  $$('[data-course]', $('#courseMap')).forEach(button => {
    button.addEventListener('click', () => {
      state.course = Number(button.dataset.course);
      state.lesson = firstIncomplete(state.course);
      save();
      render();
      setDrawer(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderSide() {
  const course = courses[state.course];
  $('#courseTag').textContent = course.number.toUpperCase();
  $('#courseTitle').textContent = course.title;
  $('#courseSummary').textContent = course.summary;
  $('#lessonList').innerHTML = course.lessons.map((lesson, index) => {
    const done = isDone(state.course, index);
    const active = state.lesson === index;
    const unlocked = lessonUnlocked(state.course, index);
    const score = state.answers[`score-${key(state.course, index)}`];
    return `
      <button class="lesson-btn ${active ? 'active' : ''} ${done ? 'done' : ''}"
        data-lesson="${index}" ${unlocked ? '' : 'disabled'} aria-current="${active ? 'step' : 'false'}">
        <span class="lesson-step">${done ? '✓' : index + 1}</span>
        <span class="lesson-copy"><strong>${esc(lesson.title)}</strong><span>${esc(lesson.subtitle)}</span></span>
        <span class="lesson-score">${score ? `${score}点` : !unlocked ? 'ロック' : ''}</span>
      </button>`;
  }).join('');
  $$('[data-lesson]', $('#lessonList')).forEach(button => {
    button.addEventListener('click', () => {
      state.lesson = Number(button.dataset.lesson);
      save();
      render();
      setDrawer(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

