document.addEventListener('DOMContentLoaded', () => {
  const summaryRoot = document.getElementById('summary-root');

  if (!summaryRoot) {
    return;
  }

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const normalizeSummaryData = (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Summary JSON must be an object.');
    }

    if (!Array.isArray(data.sections)) {
      throw new Error('Summary JSON must include a sections array.');
    }

    return {
      eyebrow: '',
      title: '',
      overview: '',
      tags: [],
      glanceTitle: 'At a glance',
      glanceItems: [],
      stats: [],
      sections: [],
      sourceNote: '',
      browserTitle: '',
      ...data,
    };
  };

  const renderTags = (tags) => {
    if (!tags.length) {
      return '';
    }

    const items = tags
      .map((tag) => `<li class="summary-tag">${escapeHtml(tag)}</li>`)
      .join('');

    return `<ul class="summary-tag-list" aria-label="Summary topics">${items}</ul>`;
  };

  const renderStats = (stats) => {
    if (!stats.length) {
      return '';
    }

    const items = stats
      .map((stat) => `
        <div class="summary-stat">
          <span class="summary-stat__value">${escapeHtml(stat.value)}</span>
          <span class="summary-stat__label">${escapeHtml(stat.label)}</span>
        </div>
      `)
      .join('');

    return `<div class="summary-stat-grid">${items}</div>`;
  };

  const renderGlanceItems = (title, items) => {
    if (!items.length) {
      return '';
    }

    const listItems = items
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    return `
      <aside class="summary-glance" aria-labelledby="summary-glance-title">
        <p class="summary-glance__eyebrow">Quick read</p>
        <h2 id="summary-glance-title">${escapeHtml(title)}</h2>
        <ul class="summary-glance__list">${listItems}</ul>
      </aside>
    `;
  };

  const renderCommentary = (commentary, label = 'Commentary') => {
    if (!commentary) {
      return '';
    }

    return `
      <aside class="summary-commentary" aria-label="${escapeHtml(label)}">
        <p class="summary-commentary__label">${escapeHtml(label)}</p>
        <p>${escapeHtml(commentary)}</p>
      </aside>
    `;
  };

  const renderPoints = (points) => {
    if (!Array.isArray(points) || !points.length) {
      return '';
    }

    const items = points
      .map((point) => `
        <article class="summary-point-card">
          <h3>${escapeHtml(point.title)}</h3>
          <p>${escapeHtml(point.text)}</p>
          ${renderCommentary(point.commentary, point.commentaryLabel || 'Rion observes')}
        </article>
      `)
      .join('');

    return `<div class="summary-point-grid">${items}</div>`;
  };

  const renderSections = (sections) => sections
    .map((section, index) => {
      const headingId = `summary-section-${index + 1}`;

      return `
        <section class="panel summary-section" aria-labelledby="${headingId}">
          <div class="summary-section__header">
            <div>
              <p class="eyebrow">Topic ${String(index + 1).padStart(2, '0')}</p>
              <h2 id="${headingId}">${escapeHtml(section.title)}</h2>
            </div>
            <p class="summary-section__summary">${escapeHtml(section.summary)}</p>
          </div>
          ${renderPoints(section.points)}
        </section>
      `;
    })
    .join('');

  const renderSummary = (summary) => {
    const hero = `
      <section class="panel summary-hero" aria-labelledby="summary-title">
        <div class="summary-hero__grid">
          <div class="summary-hero__copy">
            <p class="eyebrow">${escapeHtml(summary.eyebrow)}</p>
            <h1 id="summary-title">${escapeHtml(summary.title)}</h1>
            <p class="summary-hero__overview">${escapeHtml(summary.overview)}</p>
            ${renderCommentary(summary.overviewCommentary, summary.overviewCommentaryLabel || 'Rion takeaway')}
            ${renderTags(summary.tags)}
            ${renderStats(summary.stats)}
          </div>
          ${renderGlanceItems(summary.glanceTitle, summary.glanceItems)}
        </div>
      </section>
    `;

    const footer = summary.sourceNote
      ? `<p class="summary-source-note">${escapeHtml(summary.sourceNote)}</p>`
      : '';

    summaryRoot.innerHTML = `
      <div class="summary-stack">
        ${hero}
        ${renderSections(summary.sections)}
        ${footer}
      </div>
    `;
  };

  const loadSummary = async () => {
    const summaryFile = summaryRoot.dataset.summary;

    if (!summaryFile) {
      summaryRoot.innerHTML = '<p class="summary-error">No summary data source was provided.</p>';
      return;
    }

    try {
      const response = await fetch(summaryFile);

      if (!response.ok) {
        throw new Error(`Request for ${summaryFile} failed with ${response.status}`);
      }

      const summary = normalizeSummaryData(await response.json());

      if (summary.browserTitle) {
        document.title = summary.browserTitle;
      }

      renderSummary(summary);
    } catch (error) {
      console.error('Error loading summary:', error);
      summaryRoot.innerHTML = `
        <div class="panel summary-error-state" role="status">
          <p class="eyebrow">Archive unavailable</p>
          <h1>We couldn\'t load this session summary.</h1>
          <p class="summary-hero__overview">Please refresh the page or try again in a moment.</p>
        </div>
      `;
    }
  };

  loadSummary();
});
