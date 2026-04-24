const EVENT_SCHEDULE = [
  {
    key: "na",
    name: "NA Fanfest",
    region: "North America",
    dates: "April 24–25, 2026",
    location: "Anaheim Convention Center · Anaheim, California",
    start: "2026-04-24T00:00:00-07:00",
    end: "2026-04-25T23:59:59-07:00",
    streamLabel: "April 24, 2026"
  },
  {
    key: "eu",
    name: "EU Fanfest",
    region: "Europe",
    dates: "July 25–26, 2026",
    location: "Messe Berlin, hub27 · Berlin, Germany",
    start: "2026-07-25T00:00:00+02:00",
    end: "2026-07-26T23:59:59+02:00",
    streamLabel: "July 25, 2026"
  },
  {
    key: "jp",
    name: "JP Fanfest",
    region: "Japan",
    dates: "October 31 – November 1, 2026",
    location: "Makuhari Messe · Tokyo, Japan",
    start: "2026-10-31T00:00:00+09:00",
    end: "2026-11-01T23:59:59+09:00",
    streamLabel: "October 31, 2026"
  }
];

const EVENT_MAP = Object.fromEntries(EVENT_SCHEDULE.map((event) => [event.key, event]));
const BINGO_STORAGE_KEY = "ffxiv-fanfest-2026-bingo-state";
const STREAM_MODE = {
  LIVE_EMBED: "live-embed",
  LIVE_FALLBACK: "live-fallback",
  UPCOMING: "upcoming",
  ENDED: "ended"
};

const appState = {
  bingoData: { items: [] },
  liveblogData: { entries: [] },
  selectedStreamKey: chooseInitialStreamKey(),
  streamSelectionPinned: false,
  streamPanelElement: null,
  streamButtons: [],
  streamViews: new Map(),
  activeStreamKey: null
};

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch((error) => {
    console.error("Failed to initialize Fanfest site", error);
  });
});

async function initialize() {
  const [loadedBingoData, liveblogData] = await Promise.all([
    loadJson("./bingo.json", "bingo-data-fallback"),
    loadJson("./liveblog.json", "liveblog-data-fallback")
  ]);

  appState.bingoData = loadedBingoData ?? { items: [] };
  appState.liveblogData = liveblogData ?? { entries: [] };
  appState.streamPanelElement = document.getElementById("stream-panel");
  appState.streamButtons = Array.from(document.querySelectorAll("[data-stream-selector]"));

  bindStreamSelector();
  bindBingoReset();
  initializeStreamPanel();
  renderCountdowns();
  refreshStreamPanel({ force: true });
  renderBingoGrid();
  renderLiveblog(appState.liveblogData);

  document.body.classList.add("is-ready");

  window.setInterval(() => {
    renderCountdowns();
    refreshStreamPanel();
  }, 1000);
}

async function loadJson(path, fallbackId) {
  if (window.location.protocol === "file:") {
    return readFallbackJson(fallbackId);
  }

  try {
    const response = await fetch(path, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Request for ${path} failed with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const fallbackData = readFallbackJson(fallbackId);

    if (fallbackData) {
      return fallbackData;
    }

    throw error;
  }
}

function readFallbackJson(fallbackId) {
  const fallbackElement = document.getElementById(fallbackId);

  if (!fallbackElement?.textContent) {
    return null;
  }

  return JSON.parse(fallbackElement.textContent);
}

function renderCountdowns() {
  const now = new Date();
  const cards = document.querySelectorAll("[data-event-key]");

  cards.forEach((card) => {
    const event = EVENT_MAP[card.dataset.eventKey];

    if (!event) {
      return;
    }

    const countdownElement = card.querySelector("[data-event-countdown]");
    const statusElement = card.querySelector("[data-event-status]");
    const metaElement = card.querySelector("[data-event-meta]");
    const start = new Date(event.start);
    const end = new Date(event.end);

    card.classList.remove("is-live");
    statusElement.classList.remove("is-live", "is-upcoming", "is-ended");

    if (now >= start && now <= end) {
      card.classList.add("is-live");
      countdownElement.textContent = "LIVE NOW";
      statusElement.textContent = "Live now";
      statusElement.classList.add("is-live");
      metaElement.textContent = `${event.location} · Broadcast window is open.`;
      return;
    }

    if (now < start) {
      countdownElement.textContent = formatCountdown(start.getTime() - now.getTime());
      statusElement.textContent = "Upcoming";
      statusElement.classList.add("is-upcoming");
      metaElement.textContent = `Starts ${formatLongDate(event.start)} · ${event.location}`;
      return;
    }

    countdownElement.textContent = "Event ended";
    statusElement.textContent = "Ended";
    statusElement.classList.add("is-ended");
    metaElement.textContent = `${event.location} · Archive/VOD watch only.`;
  });
}

function bindStreamSelector() {
  appState.streamButtons.forEach((button, index) => {
    button.id = `stream-tab-${button.dataset.streamSelector}`;
    button.tabIndex = index === 0 ? 0 : -1;

    button.addEventListener("click", () => {
      const nextKey = button.dataset.streamSelector;

      if (!nextKey) {
        return;
      }

      appState.selectedStreamKey = nextKey;
      appState.streamSelectionPinned = true;
      refreshStreamPanel({ force: false });
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      event.preventDefault();

      const currentIndex = appState.streamButtons.indexOf(button);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + direction + appState.streamButtons.length) % appState.streamButtons.length;
      const nextButton = appState.streamButtons[nextIndex];

      nextButton.focus();
      nextButton.click();
    });
  });
}

function initializeStreamPanel() {
  if (!appState.streamPanelElement) {
    return;
  }

  appState.streamPanelElement.innerHTML = "";
  appState.streamViews.clear();

  EVENT_SCHEDULE.forEach((event) => {
    const viewElement = document.createElement("section");
    viewElement.className = "stream-view";
    viewElement.dataset.streamView = event.key;
    viewElement.id = `stream-view-${event.key}`;
    viewElement.setAttribute("role", "tabpanel");
    viewElement.setAttribute("aria-labelledby", `stream-tab-${event.key}`);
    viewElement.hidden = true;

    const stageElement = document.createElement("div");
    stageElement.className = "stream-stage";

    const metaElement = document.createElement("article");
    metaElement.className = "stream-meta-card";

    viewElement.append(stageElement, metaElement);
    appState.streamPanelElement.append(viewElement);

    appState.streamViews.set(event.key, {
      event,
      viewElement,
      stageElement,
      metaElement,
      mode: null,
      iframeElement: null
    });
  });
}

function refreshStreamPanel({ force = false } = {}) {
  if (!appState.streamPanelElement) {
    return;
  }

  if (!appState.streamSelectionPinned) {
    appState.selectedStreamKey = chooseInitialStreamKey();
  }

  applyActiveStreamSelection(force);
  syncAllStreamViews(force);
}

function syncAllStreamViews(force) {
  appState.streamViews.forEach((viewRecord) => {
    syncStreamView(viewRecord, force);
  });
}

function syncStreamView(viewRecord, force) {
  const nextMode = getStreamMode(viewRecord.event);

  if (!force && viewRecord.mode === nextMode) {
    return;
  }

  viewRecord.mode = nextMode;
  renderStreamStage(viewRecord, nextMode);
  renderStreamMeta(viewRecord, nextMode);
}

function renderStreamStage(viewRecord, mode) {
  if (mode === STREAM_MODE.LIVE_EMBED) {
    if (!viewRecord.iframeElement) {
      const parentHost = getTwitchParentHost();
      const frame = document.createElement("div");
      frame.className = "stream-frame";

      const iframe = document.createElement("iframe");
      iframe.src = `https://player.twitch.tv/?channel=finalfantasyxiv&parent=${encodeURIComponent(parentHost)}&muted=true`;
      iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("scrolling", "no");
      iframe.title = `${viewRecord.event.name} live Twitch stream`;

      frame.append(iframe);
      viewRecord.stageElement.replaceChildren(frame);
      viewRecord.iframeElement = iframe;
      return;
    }

    const existingFrame = viewRecord.stageElement.querySelector(".stream-frame");

    if (!existingFrame) {
      const frame = document.createElement("div");
      frame.className = "stream-frame";
      frame.append(viewRecord.iframeElement);
      viewRecord.stageElement.replaceChildren(frame);
    }

    return;
  }

  const icon = mode === STREAM_MODE.LIVE_FALLBACK ? "▶" : mode === STREAM_MODE.UPCOMING ? "⏳" : "❄";
  const title =
    mode === STREAM_MODE.LIVE_FALLBACK
      ? `${viewRecord.event.name} is live`
      : mode === STREAM_MODE.UPCOMING
        ? `${viewRecord.event.name} stream not live yet`
        : `${viewRecord.event.name} has wrapped`;
  const body =
    mode === STREAM_MODE.LIVE_FALLBACK
      ? "Twitch embeds need a valid parent hostname. This preview stays clean locally, while the official channel remains one tap away."
      : mode === STREAM_MODE.UPCOMING
        ? `Stream starts ${viewRecord.event.streamLabel}. Until then, this standby panel stays intentionally quiet.`
        : "The live broadcast window has closed. Keep this hub open for countdowns, bingo progress, and liveblog coverage.";
  const ctaLabel = mode === STREAM_MODE.ENDED ? "Open finalfantasyxiv on Twitch" : "Follow the official channel";

  viewRecord.stageElement.innerHTML = `
    <div class="stream-placeholder">
      <div class="stream-placeholder__content">
        <div class="stream-placeholder__icon" aria-hidden="true">${icon}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <p>
          <a href="https://www.twitch.tv/finalfantasyxiv" target="_blank" rel="noreferrer">${escapeHtml(ctaLabel)}</a>
        </p>
      </div>
    </div>
  `;
}

function renderStreamMeta(viewRecord, mode) {
  const event = viewRecord.event;
  const statusLabel =
    mode === STREAM_MODE.LIVE_EMBED || mode === STREAM_MODE.LIVE_FALLBACK
      ? "Live now"
      : mode === STREAM_MODE.UPCOMING
        ? "Standby"
        : "VOD / recap";
  const heading =
    mode === STREAM_MODE.LIVE_EMBED
      ? `${event.name} is on the air`
      : mode === STREAM_MODE.LIVE_FALLBACK
        ? "Local preview mode"
        : mode === STREAM_MODE.UPCOMING
          ? `${event.name} countdown`
          : `${event.name} recap window`;
  const description =
    mode === STREAM_MODE.LIVE_EMBED
      ? `${event.location} · Stable embed loaded once and held in place while the timer updates.`
      : mode === STREAM_MODE.LIVE_FALLBACK
        ? `${event.location} · Deploy to GitHub Pages or any real hostname to activate the embedded Twitch player.`
        : mode === STREAM_MODE.UPCOMING
          ? `${event.location} · ${event.dates}`
          : `${event.location} · Broadcast window complete.`;

  viewRecord.metaElement.innerHTML = `
    <div class="stream-meta-card__header">
      <p class="stream-meta__eyebrow">${escapeHtml(event.region)} view</p>
      <span class="stream-meta__status">${escapeHtml(statusLabel)}</span>
    </div>
    <h3>${escapeHtml(heading)}</h3>
    <p>${escapeHtml(description)}</p>
    <dl class="stream-meta-grid">
      <div>
        <dt>Dates</dt>
        <dd>${escapeHtml(event.dates)}</dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>${escapeHtml(event.location)}</dd>
      </div>
      <div>
        <dt>Channel</dt>
        <dd>
          <a href="https://www.twitch.tv/finalfantasyxiv" target="_blank" rel="noreferrer">finalfantasyxiv</a>
        </dd>
      </div>
    </dl>
  `;
}

function applyActiveStreamSelection(force) {
  if (!appState.streamPanelElement) {
    return;
  }

  if (!force && appState.activeStreamKey === appState.selectedStreamKey) {
    return;
  }

  appState.activeStreamKey = appState.selectedStreamKey;
  appState.streamPanelElement.dataset.streamSelected = appState.selectedStreamKey;

  appState.streamButtons.forEach((button) => {
    const isActive = button.dataset.streamSelector === appState.selectedStreamKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  appState.streamViews.forEach((viewRecord, key) => {
    const isActive = key === appState.selectedStreamKey;
    viewRecord.viewElement.hidden = !isActive;
    viewRecord.viewElement.classList.toggle("is-active", isActive);
  });
}

function getStreamMode(event) {
  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);
  const parentHost = getTwitchParentHost();

  if (now >= start && now <= end) {
    return parentHost ? STREAM_MODE.LIVE_EMBED : STREAM_MODE.LIVE_FALLBACK;
  }

  if (now < start) {
    return STREAM_MODE.UPCOMING;
  }

  return STREAM_MODE.ENDED;
}

function bindBingoReset() {
  const resetButton = document.getElementById("bingo-reset");

  if (!resetButton) {
    return;
  }

  resetButton.addEventListener("click", () => {
    localStorage.removeItem(BINGO_STORAGE_KEY);
    renderBingoGrid();
  });
}

function renderBingoGrid() {
  const grid = document.getElementById("bingo-grid");

  if (!grid) {
    return;
  }

  const items = Array.isArray(appState.bingoData.items) ? appState.bingoData.items : [];

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><p>No bingo squares found.</p></div>';
    updateBingoProgress(items, {});
    return;
  }

  const savedState = readBingoState();

  grid.innerHTML = items
    .map((item) => {
      const isChecked = savedState[item.id] ?? Boolean(item.free);
      const squareClasses = ["bingo-square"];

      if (isChecked) {
        squareClasses.push("is-checked");
      }

      if (item.free) {
        squareClasses.push("is-free");
      }

      return `
        <button
          class="${squareClasses.join(" ")}"
          type="button"
          data-bingo-id="${escapeAttribute(item.id)}"
          aria-pressed="${String(isChecked)}"
        >
          <span class="bingo-square__text">${escapeHtml(item.text)}</span>
        </button>
      `;
    })
    .join("");

  updateBingoProgress(items, savedState);

  grid.querySelectorAll("[data-bingo-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const squareId = button.dataset.bingoId;
      const latestState = readBingoState();
      const item = items.find((entry) => entry.id === squareId);
      const currentValue = latestState[squareId] ?? Boolean(item?.free);

      latestState[squareId] = !currentValue;
      localStorage.setItem(BINGO_STORAGE_KEY, JSON.stringify(latestState));
      renderBingoGrid();
    });
  });
}

function updateBingoProgress(items, savedState) {
  const progressElement = document.getElementById("bingo-progress");

  if (!progressElement) {
    return;
  }

  const total = items.length;
  const checked = items.filter((item) => savedState[item.id] ?? Boolean(item.free)).length;
  progressElement.textContent = `${checked} / ${total} marked`;
}

function readBingoState() {
  try {
    const raw = localStorage.getItem(BINGO_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function renderLiveblog(liveblogData) {
  const feed = document.getElementById("liveblog-feed");
  const updatedElement = document.getElementById("liveblog-updated");

  if (!feed) {
    return;
  }

  const entries = Array.isArray(liveblogData.entries) ? [...liveblogData.entries] : [];

  entries.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  if (updatedElement) {
    updatedElement.textContent = liveblogData.updatedAt
      ? `Updated ${formatTimestamp(liveblogData.updatedAt)}`
      : "Waiting for the next update";
  }

  if (!entries.length) {
    feed.innerHTML = `
      <div class="empty-state">
        <h3>No liveblog updates yet</h3>
        <p>Add entries to <code>liveblog.json</code> once keynotes start rolling.</p>
      </div>
    `;
    return;
  }

  feed.innerHTML = entries
    .map((entry) => {
      const title = entry.headline || entry.title || "Update";
      const content = entry.body || entry.content || "";
      const timestamp = entry.timestamp ? formatTimestamp(entry.timestamp) : "Timestamp pending";
      const sentiment = entry.sentiment ? renderSentimentChip(entry.sentiment) : "";
      const sources = Array.isArray(entry.sources) && entry.sources.length ? renderSourceList(entry.sources) : "";

      return `
        <article class="liveblog-entry">
          <div class="liveblog-entry__header">
            <time datetime="${escapeAttribute(entry.timestamp || "")}">${escapeHtml(timestamp)}</time>
            ${sentiment}
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(content)}</p>
          ${sources}
        </article>
      `;
    })
    .join("");
}

function renderSentimentChip(sentiment) {
  const normalized = String(sentiment).toLowerCase();
  const modifier = ["positive", "mixed", "neutral", "negative"].includes(normalized) ? normalized : "neutral";

  return `<span class="liveblog-chip liveblog-chip--${modifier}">${escapeHtml(sentiment)}</span>`;
}

function renderSourceList(sources) {
  const items = sources
    .map((source) => {
      const label = formatSourceLabel(source);
      return `
        <li>
          <a href="${escapeAttribute(source)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>
        </li>
      `;
    })
    .join("");

  return `<ul class="liveblog-sources">${items}</ul>`;
}

function formatSourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

function chooseInitialStreamKey() {
  const now = new Date();
  const liveEvent = EVENT_SCHEDULE.find((event) => isEventLive(event, now));

  if (liveEvent) {
    return liveEvent.key;
  }

  const upcomingEvent = EVENT_SCHEDULE.find((event) => now < new Date(event.start));
  return (upcomingEvent ?? EVENT_SCHEDULE[0]).key;
}

function isEventLive(event, now = new Date()) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return now >= start && now <= end;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [days, hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatLongDate(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getTwitchParentHost() {
  const { hostname } = window.location;
  return hostname || null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
