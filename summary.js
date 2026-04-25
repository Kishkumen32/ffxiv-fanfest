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
      attribution: null,
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

  const renderCommentaryBlock = (commentary, fallbackLabel = 'Creator commentary') => {
    if (!commentary) {
      return '';
    }

    if (typeof commentary === 'string') {
      return `
        <div class="summary-attribution-block summary-attribution-block--commentary">
          <p class="summary-attribution-label">${escapeHtml(fallbackLabel)}</p>
          <p>${escapeHtml(commentary)}</p>
        </div>
      `;
    }

    const commentaryLabel = commentary.label || fallbackLabel;
    const commentarySource = commentary.source
      ? `<p class="summary-attribution-source">${escapeHtml(commentary.source)}</p>`
      : '';
    const commentaryQuote = commentary.quote
      ? `<blockquote class="summary-commentary-quote">${escapeHtml(commentary.quote)}</blockquote>`
      : '';
    const commentaryTakeaway = commentary.takeaway
      ? `<p>${escapeHtml(commentary.takeaway)}</p>`
      : '';

    return `
      <div class="summary-attribution-block summary-attribution-block--commentary">
        <p class="summary-attribution-label">${escapeHtml(commentaryLabel)}</p>
        ${commentarySource}
        ${commentaryQuote}
        ${commentaryTakeaway}
      </div>
    `;
  };

  const renderHeroCommentaries = (commentary, label = 'Commentary') => {
    const commentaryItems = Array.isArray(commentary)
      ? commentary
      : commentary
        ? [{ label, takeaway: commentary }]
        : [];

    if (!commentaryItems.length) {
      return '';
    }

    const items = commentaryItems
      .map((item) => {
        const itemLabel = typeof item === 'string' ? label : (item.label || label);
        const itemText = typeof item === 'string' ? item : item.takeaway;

        return `
          <aside class="summary-commentary" aria-label="${escapeHtml(itemLabel)}">
            <p class="summary-commentary__label">${escapeHtml(itemLabel)}</p>
            <p>${escapeHtml(itemText)}</p>
          </aside>
        `;
      })
      .join('');

    return `<div class="summary-commentary-stack">${items}</div>`;
  };

  const renderPoints = (points) => {
    if (!Array.isArray(points) || !points.length) {
      return '';
    }

    const items = points
      .map((point) => {
        const hasAttributedContent = Boolean(
          point.official || point.panelNote || point.commentary || point.commentaries || point.rionCommentary || point.commentaryLabel
        );

        if (!hasAttributedContent) {
          return `
            <article class="summary-point-card">
              <h3>${escapeHtml(point.title)}</h3>
              <p>${escapeHtml(point.text)}</p>
            </article>
          `;
        }

        const officialText = point.official || point.panelNote || point.text || '';
        const commentaryItems = Array.isArray(point.commentaries)
          ? point.commentaries
          : point.commentary || point.rionCommentary
            ? [point.commentary || point.rionCommentary]
            : [];
        const commentaryBlock = commentaryItems
          .map((item) => renderCommentaryBlock(item, point.commentaryLabel || 'Creator commentary'))
          .join('');

        return `
          <article class="summary-point-card">
            <h3>${escapeHtml(point.title)}</h3>
            <div class="summary-attribution-block">
              <p class="summary-attribution-label">Official dev panel info</p>
              <p>${escapeHtml(officialText)}</p>
            </div>
            ${commentaryBlock}
          </article>
        `;
      })
      .join('');

    return `<div class="summary-point-grid">${items}</div>`;
  };

  const renderAttribution = (attribution) => {
    if (!attribution || typeof attribution !== 'object') {
      return '';
    }

    const officialLabel = attribution.officialLabel || 'Official dev panel info';
    const officialSource = attribution.officialSource ? `<p>${escapeHtml(attribution.officialSource)}</p>` : '';
    const commentaryLabel = attribution.commentaryLabel || 'Creator commentary';
    const commentaryItems = Array.isArray(attribution.commentarySources)
      ? attribution.commentarySources
      : attribution.commentarySource
        ? [attribution.commentarySource]
        : [];
    const commentarySource = commentaryItems.length
      ? `<ul class="summary-source-list">${commentaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';
    const note = attribution.note ? `<p>${escapeHtml(attribution.note)}</p>` : '';

    return `
      <section class="panel summary-attribution" aria-labelledby="summary-attribution-title">
        <div class="summary-section__header">
          <div>
            <p class="eyebrow">Attribution</p>
            <h2 id="summary-attribution-title">How to read this page</h2>
          </div>
          <p class="summary-section__summary">Official panel notes and creator commentary are rendered in separate, labeled blocks throughout the summary.</p>
        </div>
        <div class="summary-point-grid">
          <article class="summary-point-card">
            <h3>${escapeHtml(officialLabel)}</h3>
            ${officialSource}
          </article>
          <article class="summary-point-card">
            <h3>${escapeHtml(commentaryLabel)}</h3>
            ${commentarySource}
            ${note}
          </article>
        </div>
      </section>
    `;
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
            ${renderHeroCommentaries(summary.overviewCommentaries || summary.overviewCommentary, summary.overviewCommentaryLabel || 'Creator takeaway')}
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
        ${renderAttribution(summary.attribution)}
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
