function enableNext() {
  const button = $('#nextButton');
  if (button) button.disabled = false;
}

function completeStep() {
  const stepKey = key(state.course, state.lesson);
  if (state.completed[stepKey]) return;
  state.completed[stepKey] = true;
  state.xp += 15;
  save();
  toast('+15 XP · ステップ完了');
}

function simulate(code) {
  const output = [];
  const variables = {};
  const lines = code.replace(/\r/g, '').split('\n');
  const blocks = [];
  try {
    for (const raw of lines) {
      if (!raw.trim() || raw.trim().startsWith('#')) continue;
      const indent = raw.match(/^\s*/)[0].length;
      const line = raw.trim();
      if (line === 'else:') {
        while (blocks.length && blocks[blocks.length - 1].indent > indent) blocks.pop();
        const previous = blocks.pop();
        if (!previous || previous.indent !== indent) throw new Error('SyntaxError: else に対応する if がありません');
        blocks.push({ indent, active: previous.parent && !previous.matched, parent: previous.parent, matched: true });
        continue;
      }
      while (blocks.length && indent <= blocks[blocks.length - 1].indent) blocks.pop();
      const active = blocks.every(block => block.active);
      let match;
      if ((match = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)) && !line.startsWith('if ')) {
        if (active) variables[match[1]] = evalValue(match[2], variables);
        continue;
      }
      if ((match = line.match(/^if\s+(.+):$/))) {
        const condition = active && evalCondition(match[1], variables);
        blocks.push({ indent, active: condition, parent: active, matched: condition });
        continue;
      }
      if ((match = line.match(/^print\((.*)\)$/))) {
        if (active) output.push(String(evalValue(match[1], variables)));
        continue;
      }
      if (line.startsWith('print(')) throw new Error('SyntaxError: 括弧または引用符が閉じていません');
      if (line.startsWith('if ')) throw new Error('SyntaxError: if文の末尾に : が必要です');
      throw new Error('SyntaxError: このMVPで解釈できない構文です');
    }
    return { output: output.join('\n'), error: null };
  } catch (error) {
    return { output: output.join('\n'), error: error.message };
  }
}

function evalValue(expression, variables) {
  const value = expression.trim();
  if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return value.slice(1, -1);
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value in variables) return variables[value];
  throw new Error(`NameError: ${value} は定義されていません`);
}

function evalCondition(expression, variables) {
  return expression.split(/\s+and\s+/).every(part => {
    const match = part.trim().match(/^(.+?)\s*(==|>=|<=|>|<)\s*(.+)$/);
    if (!match) throw new Error('SyntaxError: 条件式を確認してください');
    const left = evalValue(match[1], variables);
    const right = evalValue(match[3], variables);
    return match[2] === '==' ? left === right
      : match[2] === '>=' ? left >= right
      : match[2] === '<=' ? left <= right
      : match[2] === '>' ? left > right
      : left < right;
  });
}

function renderReview(review) {
  const list = values => values.length ? values.map(value => `<li>${esc(value)}</li>`).join('') : '<li>現時点で大きな指摘はありません。</li>';
  const functionalPct = Math.round(review.functional / 60 * 100);
  const requirementsPct = Math.round(review.requirements / 20 * 100);
  const technicalPct = Math.round(review.technical / 20 * 100);
  $('#reviewPanel').innerHTML = `
    <section class="review-panel">
      <div class="review-hero">
        <div class="total-score" style="--score:${review.total}"><div class="total-score-content"><strong>${review.total}</strong><span>TOTAL / 100</span></div></div>
        <div class="review-summary">
          <span class="status-badge ${review.passed ? 'good' : 'bad'}">${esc(review.label)}</span>
          <h3>${review.passed ? '要件を満たしました' : 'あと少しで合格です'}</h3>
          <p>${review.passed ? '次へ進めます。技術点を高めるために、同じ課題へ再提出することもできます。' : '出力だけでなく、別の入力でも正しく動くかと、指定された概念を使えているかを確認してください。'}</p>
          <div class="score-bars">
            <div class="score-row"><span>機能</span><div class="score-track"><i style="width:${functionalPct}%"></i></div><strong>${review.functional}/60</strong></div>
            <div class="score-row"><span>要件</span><div class="score-track"><i style="width:${requirementsPct}%"></i></div><strong>${review.requirements}/20</strong></div>
            <div class="score-row"><span>技術</span><div class="score-track"><i style="width:${technicalPct}%"></i></div><strong>${review.technical}/20</strong></div>
          </div>
        </div>
      </div>
      <div class="review-columns">
        <div class="review-note"><h4>良かった点</h4><ul>${list(review.positives)}</ul></div>
        <div class="review-note"><h4>改善するとよい点</h4><ul>${list(review.improvements)}</ul></div>
      </div>
      <div class="review-next"><strong>さらに良くするには</strong>${esc(review.next)}</div>
    </section>`;
}

function grade(lesson, code) {
  const result = simulate(code);
  $('#outputConsole').textContent = result.error
    ? `${result.output ? `${result.output}\n` : ''}⚠ ${result.error}`
    : result.output || '(出力なし)';

  const review = CodeQuestReviewer.review({
    courseIndex: state.course,
    lessonIndex: state.lesson,
    code,
    run: simulate,
    lesson
  });
  const checks = review.checks.slice(0, lesson.tests.length);
  $('#checkList').innerHTML = lesson.tests.map((test, index) => {
    const passed = Boolean(checks[index]);
    return `<div class="check-item ${passed ? 'pass' : 'fail'}"><span class="check-icon">${passed ? '✓' : '×'}</span><span>${esc(test)}</span><span class="check-state">${passed ? 'PASS' : 'RETRY'}</span></div>`;
  }).join('');
  $('#statusBadge').textContent = `${review.label} · ${review.total}点`;
  $('#statusBadge').className = `status-badge ${review.passed ? 'good' : 'bad'}`;
  renderReview(review);

  if (review.passed) {
    completeStep();
    state.answers[`score-${key(state.course, state.lesson)}`] = Math.max(state.answers[`score-${key(state.course, state.lesson)}`] || 0, review.total);
    save();
    renderMap();
    renderSide();
    enableNext();
    const scene = $('#worldScene');
    if (scene) {
      scene.classList.add('active');
      $('#worldCaption').textContent = '航路が開きました。次へ進むか、技術点を高めて再提出できます。';
    }
  }
}

function wireCompletion() {
  const course = courses[state.course];
  if (!state.answers[`reward-${state.course}`]) {
    state.xp += course.xp;
    state.answers[`reward-${state.course}`] = true;
    save();
  }
  const next = $('#nextCourseButton');
  if (next) next.addEventListener('click', () => {
    state.course += 1;
    state.lesson = 0;
    save();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#reviewCourseButton').addEventListener('click', () => {
    state.lesson = 0;
    save();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

let toastTimer;
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 1900);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('cq-theme', theme); } catch (_) { /* optional */ }
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#111318' : '#F8FAFD';
}

function wireShell() {
  $('#menuButton').addEventListener('click', () => setDrawer(!document.body.classList.contains('drawer-open')));
  $('#drawerScrim').addEventListener('click', () => setDrawer(false));
  $('#themeButton').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setDrawer(false); });
  const preferred = (() => {
    try { return localStorage.getItem('cq-theme'); } catch (_) { return null; }
  })() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(preferred);
}

function render() {
  const maxLesson = courses[state.course].lessons.length;
  state.lesson = Math.max(0, Math.min(state.lesson, maxLesson));
  renderMap();
  renderSide();
  renderMain();
  renderHud();
  renderTopContext();
}

wireShell();
render();
