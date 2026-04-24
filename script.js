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

let bingoData = { items: [] };
let selectedStreamKey = chooseInitialStreamKey();
let streamSelectionPinned = false;

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

  bingoData = loadedBingoData ?? { items: [] };

  bindStreamSelector();
  bindBingoReset();
  renderCountdowns();
  renderStreamPanel();
  renderBingoGrid();
  renderLiveblog(liveblogData ?? { entries: [] });

  window.setInterval(() => {
    renderCountdowns();

    if (!streamSelectionPinned) {
      selectedStreamKey = chooseInitialStreamKey();
      renderStreamPanel();
    }
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
  const buttons = document.querySelectorAll("[data-stream-selector]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedStreamKey = button.dataset.streamSelector;
      streamSelectionPinned = true;
      renderStreamPanel();
    });
  });
}

function renderStreamPanel() {
  const panel = document.getElementById("stream-panel");
  const buttons = document.querySelectorAll("[data-stream-selector]");
  const event = EVENT_MAP[selectedStreamKey] ?? EVENT_SCHEDULE[0];

  buttons.forEach((button) => {
    const isActive = button.dataset.streamSelector === event.key;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (!panel) {
    return;
  }

  if (isEventLive(event)) {
    const parentHost = getTwitchParentHost();

    if (parentHost) {
      panel.innerHTML = `
        <div class="stream-player">
          <iframe
            src="https://player.twitch.tv/?channel=finalfantasyxiv&parent=${encodeURIComponent(parentHost)}&muted=true"
            allowfullscreen
            scrolling="no"
            title="${escapeHtml(event.name)} live Twitch stream"
          ></iframe>
        </div>
        <div class="stream-meta">
          <p class="stream-meta__eyebrow">${escapeHtml(event.region)} live view</p>
          <h3>${escapeHtml(event.name)} is on the air</h3>
          <p>${escapeHtml(event.location)} · If the player fails, open the official channel directly on Twitch.</p>
          <p><a href="https://www.twitch.tv/finalfantasyxiv" target="_blank" rel="noreferrer">Open finalfantasyxiv on Twitch</a></p>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="stream-placeholder">
        <div class="stream-placeholder__content">
          <div class="stream-placeholder__icon" aria-hidden="true">▶</div>
          <h3>${escapeHtml(event.name)} is live</h3>
          <p>
            Twitch embeds need a valid parent domain. This local file preview falls back to a standby card,
            but the live embed will activate on GitHub Pages or localhost.
          </p>
          <p><a href="https://www.twitch.tv/finalfantasyxiv" target="_blank" rel="noreferrer">Open the official channel now</a></p>
        </div>
      </div>
      <div class="stream-meta">
        <p class="stream-meta__eyebrow">${escapeHtml(event.region)} live view</p>
        <h3>Embed ready for deployment</h3>
        <p>${escapeHtml(event.location)}</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="stream-placeholder">
      <div class="stream-placeholder__content">
        <div class="stream-placeholder__icon" aria-hidden="true">⏳</div>
        <h3>${escapeHtml(event.name)} stream not live yet</h3>
        <p>Stream starts ${escapeHtml(event.streamLabel)}. Until then, this panel stays greyed out on purpose.</p>
        <p><a href="https://www.twitch.tv/finalfantasyxiv" target="_blank" rel="noreferrer">Follow the official channel</a></p>
      </div>
    </div>
    <div class="stream-meta">
      <p class="stream-meta__eyebrow">${escapeHtml(event.region)} standby</p>
      <h3>${escapeHtml(event.dates)}</h3>
      <p>${escapeHtml(event.location)}</p>
    </div>
  `;
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

  const items = Array.isArray(bingoData.items) ? bingoData.items : [];

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><p>No bingo squares found.</p></div>';
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

  if (!feed) {
    return;
  }

  const entries = Array.isArray(liveblogData.entries) ? [...liveblogData.entries] : [];

  entries.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

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
      const title = entry.title || "Update";
      const content = entry.content || "";
      const timestamp = entry.timestamp ? formatTimestamp(entry.timestamp) : "Timestamp pending";

      return `
        <article class="liveblog-entry">
          <time datetime="${escapeAttribute(entry.timestamp || "")}">${escapeHtml(timestamp)}</time>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(content)}</p>
        </article>
      `;
    })
    .join("");
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

  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  return hostname;
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
