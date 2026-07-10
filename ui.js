function lessonHeader(lesson) {
  const course = courses[state.course];
  const step = state.lesson + 1;
  const percent = Math.round(step / course.lessons.length * 100);
  return `
    <header class="lesson-header">
      <div class="breadcrumbs"><strong>${esc(course.number)}</strong><span>›</span><span>${esc(course.title)}</span><span>›</span><span>Step ${step}</span></div>
      <div class="lesson-heading-row">
        <div class="lesson-title-block">
          <span class="lesson-kicker">${esc(lesson.subtitle)}</span>
          <h1>${esc(lesson.headline)}</h1>
          <p>${esc(lesson.body)}</p>
        </div>
        <div class="step-progress-card" aria-label="コース内の進捗">
          <span>Current progress</span><strong>${step} / ${course.lessons.length}</strong>
          <div class="step-track"><i style="width:${percent}%"></i></div>
        </div>
      </div>
    </header>`;
}

function lessonActions() {
  const done = isDone(state.course, state.lesson);
  const hasPrevious = state.lesson > 0;
  return `
    <footer class="lesson-actions">
      <div class="action-copy"><strong>${done ? 'このステップは完了しています' : '合格すると次へ進めます'}</strong><span>${done ? '復習や高得点への再挑戦もできます。' : '要件を満たすまでヒントとReviewerを活用してください。'}</span></div>
      <div class="action-buttons">
        <button class="outlined-button" id="prevButton" ${hasPrevious ? '' : 'disabled'}>${svgIcon('back')}前へ</button>
        <button class="primary-button" id="nextButton" ${done ? '' : 'disabled'}>次へ${svgIcon('arrow')}</button>
      </div>
    </footer>`;
}

function coachRail(lesson) {
  const course = courses[state.course];
  const score = state.answers[`score-${key(state.course, state.lesson)}`];
  const goals = lesson.tests || [
    '概念が必要な理由を説明できる',
    '実行結果を自分で予測できる',
    '別の場面へ知識を移せる'
  ];
  return `
    <aside class="coach-rail" aria-label="学習サポート">
      <section class="coach-card">
        <h3>このステップの達成条件</h3>
        <div class="goal-list">${goals.map((goal, index) => `<div class="goal-item"><span>${index + 1}</span><span>${esc(goal)}</span></div>`).join('')}</div>
      </section>
      <section class="coach-card">
        <h3>学習状況</h3>
        <p>${score ? `自己ベストは ${score} 点です。機能点だけでなく、読みやすさも改善できます。` : `このコースは ${course.skill} を、予測・実装・デバッグ・応用の順で定着させます。`}</p>
        ${lesson.hint ? `<button class="text-button" id="hintButton">${svgIcon('bulb')}ヒントを見る</button><div class="hint-box" id="hintBox">${esc(lesson.hint)}</div>` : ''}
      </section>
      ${lesson.world ? `
        <section class="coach-card world-card">
          <div class="world-scene" id="worldScene"><div class="world-stars"></div><div class="world-planet"></div><div class="world-ship">🚀</div></div>
          <div class="world-caption" id="worldCaption">要件を満たすコードで航路を開いてください。</div>
        </section>` : ''}
    </aside>`;
}

function renderStory(lesson) {
  return `
    <article class="lesson-page">
      ${lessonHeader(lesson)}
      <div class="learning-grid">
        <div class="lesson-main">
          <section class="surface-card concept-card card-padding">
            <div class="section-label">Concept</div>
            <h2>新しい考え方</h2>
            <p>${esc(lesson.concept)}</p>
            <div class="concept-flow">
              <div class="flow-box">${esc(lesson.diagram[0])}</div><div class="flow-arrow">→</div>
              <div class="flow-box">${esc(lesson.diagram[1])}</div><div class="flow-arrow">→</div>
              <div class="flow-box">${esc(lesson.diagram[2])}</div>
            </div>
          </section>
          ${questionCard(lesson)}
        </div>
        ${coachRail(lesson)}
      </div>
      ${lessonActions()}
    </article>`;
}

function renderPredict(lesson) {
  return `
    <article class="lesson-page">
      ${lessonHeader(lesson)}
      <div class="learning-grid">
        <div class="lesson-main">
          <section class="surface-card card-padding">
            <div class="section-label">Read before run</div>
            <h2>実行前に、頭の中で動かす</h2>
            <p>コードを一行ずつ読み、値と処理の流れを追跡してください。</p>
            <pre class="code-preview"><code>${esc(lesson.code)}</code></pre>
          </section>
          ${questionCard(lesson)}
        </div>
        ${coachRail(lesson)}
      </div>
      ${lessonActions()}
    </article>`;
}

function questionCard(lesson) {
  return `
    <section class="surface-card question-card card-padding">
      <div class="section-label">Knowledge check</div>
      <h2>${esc(lesson.question)}</h2>
      <p>一つ選択してください。回答後に理由を確認できます。</p>
      <div class="choice-list">${lesson.choices.map((choice, index) => `
        <button class="choice-button" data-choice="${index}"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${esc(choice)}</span></button>`).join('')}</div>
      <div class="feedback-banner" id="feedbackBanner" role="status" aria-live="polite"></div>
    </section>`;
}

function renderCode(lesson) {
  const savedCode = state.codes[key(state.course, state.lesson)];
  const code = savedCode === undefined ? lesson.starter : savedCode;
  return `
    <article class="lesson-page">
      ${lessonHeader(lesson)}
      <div class="learning-grid">
        <div class="lesson-main">
          <section class="surface-card task-card">
            <div class="task-summary">
              <div><div class="section-label">Mission</div><h2>${esc(lesson.title)}</h2><p>${esc(lesson.body)}</p></div>
              <div class="goal-chip">Expected behavior<strong>${esc(lesson.goal)}</strong></div>
            </div>
            <div class="editor-shell">
              <div class="editor-toolbar">
                <div class="editor-file"><span class="editor-dot"></span><span>mission.py</span></div>
                <div class="editor-actions">
                  <button class="text-button" id="resetCode">${svgIcon('refresh')}初期コード</button>
                  <button class="primary-button" id="runButton">${svgIcon('play')}実行して評価</button>
                </div>
              </div>
              <textarea class="code-editor" id="editor" spellcheck="false" aria-label="Pythonコードエディター">${esc(code)}</textarea>
              <div class="run-shortcut">Keyboard shortcut: Ctrl / ⌘ + Enter</div>
            </div>
          </section>

          <section class="surface-card result-card" aria-live="polite">
            <div class="result-header"><strong>実行結果とReviewer評価</strong><span class="status-badge" id="statusBadge">未実行</span></div>
            <div class="result-grid">
              <div class="console-pane"><div class="pane-label">Output / Error</div><pre class="output-console" id="outputConsole">コードを実行すると、出力とエラーがここに表示されます。</pre></div>
              <div class="checks-pane"><div class="pane-label">Requirement checks</div><div class="check-list" id="checkList">${lesson.tests.map(test => `<div class="check-item"><span class="check-icon">○</span><span>${esc(test)}</span><span class="check-state">未判定</span></div>`).join('')}</div></div>
            </div>
            <div id="reviewPanel"><div class="review-empty">Reviewerは、複数の実行ケース・必須要件・コード品質を分けて評価します。模範解答と同じ書き方である必要はありません。</div></div>
          </section>
        </div>
        ${coachRail(lesson)}
      </div>
      ${lessonActions()}
    </article>`;
}

function renderCompletion() {
  const course = courses[state.course];
  const next = courses[state.course + 1];
  return `
    <article class="completion-card">
      <div class="completion-icon">${svgIcon('check')}</div>
      <p class="section-label" style="justify-content:center">Course completed</p>
      <h1>${esc(course.title)}を完了</h1>
      <p>説明直後の再現だけでなく、予測・デバッグ・別文脈への応用まで完了しました。必要に応じて各ステップへ戻り、技術点をさらに高められます。</p>
      <div class="reward-grid">
        <div class="reward-card"><span>コース報酬</span><strong>+${course.xp} XP</strong></div>
        <div class="reward-card"><span>獲得スキル</span><strong>${esc(course.skill)}</strong></div>
        <div class="reward-card"><span>完了ステップ</span><strong>${course.lessons.length} / ${course.lessons.length}</strong></div>
      </div>
      ${next ? `<section class="next-course-card"><small>NEXT COURSE UNLOCKED</small><h2>${esc(next.number)} · ${esc(next.title)}</h2><p>${esc(next.summary)}</p></section>` : `<section class="next-course-card"><small>MVP COMPLETE</small><h2>高密度な基礎3コースを完了</h2><p>次段階では、ループ、関数、コレクション、テスト、API、DB、チーム開発へ能力を拡張します。</p></section>`}
      <div class="completion-actions">
        <button class="outlined-button" id="reviewCourseButton">${svgIcon('refresh')}このコースを復習</button>
        ${next ? `<button class="primary-button" id="nextCourseButton">次のコースへ${svgIcon('arrow')}</button>` : ''}
      </div>
    </article>`;
}

function renderMain() {
  const course = courses[state.course];
  if (state.lesson >= course.lessons.length) {
    $('#main').innerHTML = renderCompletion();
    wireCompletion();
    return;
  }
  const lesson = currentLesson();
  $('#main').innerHTML = lesson.type === 'story' ? renderStory(lesson) : lesson.type === 'predict' ? renderPredict(lesson) : renderCode(lesson);
  wireLesson(lesson);
}

function wireQuestion(lesson) {
  $$('.choice-button').forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.choice);
    $$('.choice-button').forEach(choice => { choice.disabled = true; });
    button.classList.add(selected === lesson.answer ? 'correct' : 'wrong');
    if (selected !== lesson.answer) $$('.choice-button')[lesson.answer].classList.add('correct');
    const banner = $('#feedbackBanner');
    banner.className = `feedback-banner show ${selected === lesson.answer ? 'good' : 'bad'}`;
    banner.textContent = `${selected === lesson.answer ? '正解です。' : '惜しいです。'}${lesson.explain}`;
    if (selected === lesson.answer) {
      completeStep();
      renderMap();
      renderSide();
      enableNext();
    }
  }));
}

function wireLesson(lesson) {
  const previous = $('#prevButton');
  if (previous) previous.addEventListener('click', () => {
    if (state.lesson <= 0) return;
    state.lesson -= 1;
    save();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const next = $('#nextButton');
  if (next) next.addEventListener('click', () => {
    if (!isDone(state.course, state.lesson)) return;
    state.lesson += 1;
    save();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (lesson.type === 'story' || lesson.type === 'predict') {
    wireQuestion(lesson);
  } else {
    const editor = $('#editor');
    editor.addEventListener('input', () => {
      state.codes[key(state.course, state.lesson)] = editor.value;
      save();
    });
    $('#resetCode').addEventListener('click', () => {
      editor.value = lesson.starter;
      state.codes[key(state.course, state.lesson)] = lesson.starter;
      save();
      $('#outputConsole').textContent = '初期コードへ戻しました。';
      $('#statusBadge').textContent = '未実行';
      $('#statusBadge').className = 'status-badge';
      $('#reviewPanel').innerHTML = '<div class="review-empty">コードを編集して再度実行してください。</div>';
    });
    $('#runButton').addEventListener('click', () => grade(lesson, editor.value));
    editor.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        grade(lesson, editor.value);
      }
    });
    const hintButton = $('#hintButton');
    if (hintButton) hintButton.addEventListener('click', () => {
      const box = $('#hintBox');
      box.classList.toggle('show');
      hintButton.textContent = box.classList.contains('show') ? 'ヒントを閉じる' : 'ヒントを見る';
    });
  }
}

