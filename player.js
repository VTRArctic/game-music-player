const audio = document.getElementById("audio");
const playlistEl = document.getElementById("playlist");
const searchEl = document.getElementById("search");
const seekEl = document.getElementById("seek");
const volumeEl = document.getElementById("volume");
const playBtn = document.getElementById("playBtn");
const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const statusEl = document.getElementById("status");
const trackCountEl = document.getElementById("trackCount");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

let tracks = [];
let currentIndex = -1;
let filter = "all";
let shuffle = false;
let repeat = false;
let blocked = new Set(JSON.parse(localStorage.getItem("blockedTracks") || "[]"));
let chosen = new Set(JSON.parse(localStorage.getItem("chosenTracks") || "[]"));
let autoplayNext = true;

const fmt = seconds => {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

async function init() {
  try {
    const response = await fetch("tracks.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    tracks = await response.json();
    statusEl.textContent = `${tracks.length} tracks loaded`;
    render();
    const saved = localStorage.getItem("currentTrack");
    if (saved) {
      const idx = tracks.findIndex(t => t.id === saved);
      if (idx >= 0) selectTrack(idx, false);
    }
  } catch (err) {
    statusEl.textContent = "Could not load tracks.json";
    playlistEl.innerHTML = `<div style="padding:20px;color:#d86666">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function visibleTracks() {
  const q = searchEl.value.trim().toLowerCase();
  return tracks.map((t, i) => ({ t, i })).filter(({t}) => {
    if (filter === "chosen" && !chosen.has(t.id)) return false;
    if (filter === "blocked" && !blocked.has(t.id)) return false;
    if (q && !`${t.title} ${t.game} ${t.composer}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function render() {
  const list = visibleTracks();
  trackCountEl.textContent = `${list.length} track${list.length === 1 ? "" : "s"}`;
  playlistEl.innerHTML = list.map(({t, i}, n) => `
    <div class="track ${i === currentIndex ? "current" : ""} ${blocked.has(t.id) ? "blocked-row" : ""}">
      <div class="track-number">${n + 1}</div>
      <div class="track-main" data-index="${i}">
        <div class="track-title">${escapeHtml(t.title)}</div>
        <div class="track-meta">${escapeHtml(t.game || "")}${t.composer ? " · " + escapeHtml(t.composer) : ""}</div>
      </div>
      <button class="star ${chosen.has(t.id) ? "chosen" : ""}" data-star="${i}" title="Choose">★</button>
      <button class="block ${blocked.has(t.id) ? "blocked" : ""}" data-block="${i}" title="Block">🚫</button>
    </div>
  `).join("");
}

function selectTrack(index, autoplay = true) {
  if (!tracks[index]) return;
  currentIndex = index;
  const t = tracks[index];
  titleEl.textContent = t.title;
  metaEl.textContent = [t.game, t.composer].filter(Boolean).join(" · ");
  audio.src = t.url;
  audio.load();
  localStorage.setItem("currentTrack", t.id);
  render();
  if (autoplay) audio.play().catch(() => {});
}

function next() {
  if (!tracks.length) return;
  let idx;
  if (shuffle) {
    const candidates = tracks.map((_, i) => i).filter(i => i !== currentIndex && !blocked.has(tracks[i].id));
    idx = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : currentIndex;
  } else {
    idx = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length;
    for (let n = 0; n < tracks.length && blocked.has(tracks[idx].id); n++) {
      idx = (idx + 1) % tracks.length;
    }
  }
  selectTrack(idx);
}

function previous() {
  if (!tracks.length) return;
  let idx = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
  selectTrack(idx);
}

function togglePlay() {
  if (currentIndex < 0) selectTrack(0, false);
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

playBtn.onclick = togglePlay;
document.getElementById("nextBtn").onclick = next;
document.getElementById("prevBtn").onclick = previous;
document.getElementById("shuffleBtn").onclick = () => {
  shuffle = !shuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", shuffle);
};
document.getElementById("repeatBtn").onclick = () => {
  repeat = !repeat;
  document.getElementById("repeatBtn").classList.toggle("active", repeat);
};
document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsDialog").showModal();
document.getElementById("clearBlockedBtn").onclick = () => {
  blocked.clear();
  persist();
  render();
};

searchEl.oninput = render;
volumeEl.oninput = () => {
  audio.volume = Number(volumeEl.value);
  localStorage.setItem("volume", volumeEl.value);
};
audio.volume = Number(localStorage.getItem("volume") ?? "0.8");

seekEl.oninput = () => {
  if (audio.duration) audio.currentTime = (Number(seekEl.value) / 1000) * audio.duration;
};

audio.ontimeupdate = () => {
  currentTimeEl.textContent = fmt(audio.currentTime);
  durationEl.textContent = fmt(audio.duration);
  if (audio.duration) seekEl.value = Math.round(audio.currentTime / audio.duration * 1000);
};
audio.onplay = () => playBtn.textContent = "⏸";
audio.onpause = () => playBtn.textContent = "▶";
audio.onended = () => {
  if (repeat) audio.currentTime = 0, audio.play();
  else if (autoplayNext) next();
};

playlistEl.onclick = e => {
  const main = e.target.closest("[data-index]");
  const star = e.target.closest("[data-star]");
  const block = e.target.closest("[data-block]");
  if (star) {
    const id = tracks[Number(star.dataset.star)].id;
    chosen.has(id) ? chosen.delete(id) : chosen.add(id);
    persist(); render(); return;
  }
  if (block) {
    const id = tracks[Number(block.dataset.block)].id;
    blocked.has(id) ? blocked.delete(id) : blocked.add(id);
    persist(); render(); return;
  }
  if (main) selectTrack(Number(main.dataset.index));
};

document.querySelectorAll(".filter").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    render();
  };
});

document.getElementById("exportBtn").onclick = () => {
  const data = {
    chosen: [...chosen],
    blocked: [...blocked],
    volume: volumeEl.value,
    currentTrack: localStorage.getItem("currentTrack")
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "player-settings.json";
  a.click();
  URL.revokeObjectURL(a.href);
};

document.getElementById("importFile").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    chosen = new Set(data.chosen || []);
    blocked = new Set(data.blocked || []);
    if (data.volume != null) {
      volumeEl.value = data.volume;
      audio.volume = Number(data.volume);
    }
    persist(); render();
  } catch { alert("Invalid settings file."); }
};

document.getElementById("autoplayNext").onchange = e => autoplayNext = e.target.checked;

function persist() {
  localStorage.setItem("blockedTracks", JSON.stringify([...blocked]));
  localStorage.setItem("chosenTracks", JSON.stringify([...chosen]));
}

document.addEventListener("keydown", e => {
  if (e.target.matches("input")) return;
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
  if (e.code === "ArrowRight") audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  if (e.code === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
  if (e.code === "ArrowUp") { e.preventDefault(); audio.volume = Math.min(1, audio.volume + .05); volumeEl.value = audio.volume; }
  if (e.code === "ArrowDown") { e.preventDefault(); audio.volume = Math.max(0, audio.volume - .05); volumeEl.value = audio.volume; }
});

init();
