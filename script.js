const API_KEY = "2dca580c2a14b55200e784d157207b4d";
const IMG_BASE = "https://image.tmdb.org/t/p/w342";
const ITEMS_PER_PAGE = 30;

const GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

let currentType = null,
  searchQuery = "",
  currentPage = 1,
  totalPages = 1,
  currentTvId = null,
  searchTimeout,
  isLoading = false,
  filters = {
    sortBy: "popularity",
    genres: [],
    yearFrom: "",
    yearTo: "",
  },
  filtersActive = false;

const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

const toggleBtn = document.getElementById("theme-toggle");

function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    toggleBtn.innerHTML = sunSVG;
  } else {
    document.documentElement.removeAttribute("data-theme");
    toggleBtn.innerHTML = moonSVG;
  }
  localStorage.setItem("theme", theme);
}

GENRES.forEach(g => {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<input type="checkbox" id="g-${g.id}" value="${g.id}"><label for="g-${g.id}">${g.name}</label>`;
  document.getElementById("filter-genres").appendChild(wrap);
});

setTheme(localStorage.getItem("theme") === "dark" ? "dark" : "light");

toggleBtn.onclick = () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  setTheme(isDark ? "light" : "dark");
};

fetchPage(true);
updateActiveButton();

window.addEventListener("scroll", () => {
  if (isLoading || currentPage >= totalPages) return;
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    loadMore();
  }
});

document.getElementById("search").oninput = e => {
  searchQuery = e.target.value.trim();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    fetchPage(true);
  }, 400);
};

function switchType(type) {
  currentType = currentType === type ? null : type;
  currentPage = 1;
  updateActiveButton();
  fetchPage(true);
}

function updateActiveButton() {
  document.getElementById("btn-movie").classList.toggle("active", currentType === "movie");
  document.getElementById("btn-tv").classList.toggle("active", currentType === "tv");
  document.getElementById("btn-anime").classList.toggle("active", currentType === "anime");
}

function toggleFilters() {
  const el = document.getElementById("filter-modal");
  el.classList.toggle("open");
  if (el.classList.contains("open")) {
    document.getElementById("filter-sort").value = filters.sortBy;
    document.querySelectorAll("#filter-genres input").forEach(cb => {
      cb.checked = filters.genres.includes(Number(cb.value));
    });
    document.getElementById("filter-year-from").value = filters.yearFrom;
    document.getElementById("filter-year-to").value = filters.yearTo;
  }
}

function applyFilters() {
  filters.sortBy = document.getElementById("filter-sort").value;
  filters.genres = [];
  document.querySelectorAll("#filter-genres input:checked").forEach(cb => {
    filters.genres.push(Number(cb.value));
  });
  filters.yearFrom = document.getElementById("filter-year-from").value;
  filters.yearTo = document.getElementById("filter-year-to").value;
  filtersActive = filters.sortBy !== "popularity" || filters.genres.length > 0 || filters.yearFrom || filters.yearTo;
  document.getElementById("btn-filter").classList.toggle("active", filtersActive);
  document.getElementById("filter-modal").classList.remove("open");
  currentPage = 1;
  fetchPage(true);
}

function resetFilters() {
  document.getElementById("filter-sort").value = "popularity";
  document.querySelectorAll("#filter-genres input").forEach(cb => cb.checked = false);
  document.getElementById("filter-year-from").value = "";
  document.getElementById("filter-year-to").value = "";
  filters.sortBy = "popularity";
  filters.genres = [];
  filters.yearFrom = "";
  filters.yearTo = "";
  filtersActive = false;
  document.getElementById("btn-filter").classList.remove("active");
  document.getElementById("filter-modal").classList.remove("open");
  currentPage = 1;
  fetchPage(true);
}

async function fetchJson(url) {
  return (await fetch(url)).json();
}

function sortParam(type) {
  const t = type || currentType || "tv";
  const isTv = t === "tv" || t === "anime";
  switch (filters.sortBy) {
    case "popularity": return "popularity.desc";
    case "rating": return "vote_average.desc";
    case "date-desc": return isTv ? "first_air_date.desc" : "primary_release_date.desc";
    case "date-asc": return isTv ? "first_air_date.asc" : "primary_release_date.asc";
    case "alpha-asc": return isTv ? "name.asc" : "original_title.asc";
    case "alpha-desc": return isTv ? "name.desc" : "original_title.desc";
    default: return "popularity.desc";
  }
}

function filterParams(discoverType) {
  if (!filtersActive) return "";
  const type = discoverType || currentType || "tv";
  const isTv = type === "tv" || type === "anime";
  const p = [`sort_by=${sortParam(type)}`];
  if (filters.genres.length) p.push(`with_genres=${filters.genres.join(",")}`);
  if (filters.yearFrom) p.push(`${isTv ? "first_air_date" : "primary_release_date"}.gte=${filters.yearFrom}-01-01`);
  if (filters.yearTo) p.push(`${isTv ? "first_air_date" : "primary_release_date"}.lte=${filters.yearTo}-12-31`);
  return p.join("&");
}

function matchesFilters(item) {
  if (!filtersActive) return true;
  if (filters.genres.length) {
    const itemGenres = item.genre_ids || [];
    if (!filters.genres.some(g => itemGenres.includes(g))) return false;
  }
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  if (filters.yearFrom && year && year < filters.yearFrom) return false;
  if (filters.yearTo && year && year > filters.yearTo) return false;
  return true;
}

async function fetchPage(reset) {
  let url;
  const base = `https://api.themoviedb.org/3`;
  const key = `api_key=${API_KEY}&language=en-US&include_adult=false`;
  const fp = filterParams();

  if (searchQuery) {
    if (currentType === "anime") {
      url = `${base}/search/tv?${key}&query=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
    } else {
      url = `${base}/search/multi?${key}&query=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
    }
  } else if (filtersActive) {
    const discoverType = currentType || "tv";
    const apiType = discoverType === "movie" ? "movie" : "tv";
    const extra = discoverType === "anime" ? "&with_keywords=210024" : "";
    url = `${base}/discover/${apiType}?${key}&${filterParams(discoverType)}${extra}&page=${currentPage}`;
  } else if (currentType === "anime") {
    url = `${base}/discover/tv?${key}&with_keywords=210024&sort_by=popularity.desc&page=${currentPage}`;
  } else if (currentType === "movie") {
    url = `${base}/movie/popular?${key}&page=${currentPage}`;
  } else if (currentType === "tv") {
    url = `${base}/tv/popular?${key}&page=${currentPage}`;
  } else {
    url = `${base}/trending/all/week?${key}&page=${currentPage}`;
  }

  let data = await fetchJson(url);
  totalPages = data.total_pages ?? 1;
  let items = (data.results || []).filter(i => i.poster_path).slice(0, ITEMS_PER_PAGE);

  if (searchQuery && currentType === "movie") {
    items = items.filter(i => i.media_type === "movie");
  } else if (searchQuery && currentType === "tv") {
    items = items.filter(i => i.media_type === "tv");
  }

  if (searchQuery && filtersActive) {
    items = items.filter(matchesFilters);
  }

  if (reset) {
    document.getElementById("grid").innerHTML = "";
    document.getElementById("grid").offsetHeight;
  }

  items.forEach((item, i) => {
    let card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--i", i);
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    card.innerHTML = `
            <img src="${IMG_BASE}${item.poster_path}" alt="${item.title || item.name}" loading="lazy">
            <div class="card-meta">
                <div class="card-title">${item.title || item.name}</div>
                ${year ? `<div class="card-sub">${year}</div>` : ""}
            </div>`;
    card.onclick = () => openItem(item);
    document.getElementById("grid").appendChild(card);
  });

  document.getElementById("load-more").style.display = currentPage < totalPages ? "" : "none";
}

function loadMore() {
  currentPage++;
  fetchPage(false);
}

function openItem(item) {
  const type = currentType || item.media_type;
  currentTvId = item.id;
  document.getElementById("player-title").textContent = item.title || item.name;
  document.getElementById("player-overlay").classList.add("open");
  document.getElementById("theme-toggle").style.display = "none";

  if (type === "movie") {
    document.getElementById("tv-controls").style.display = "none";
    document.getElementById("player-frame").src = `https://peachify.top/embed/movie/${item.id}`;
  } else {
    document.getElementById("tv-controls").style.display = "flex";
    document.getElementById("player-frame").src = "";
    loadSeasons(item.id);
  }
}

async function loadSeasons(tvId) {
  let data = await fetchJson(`https://api.themoviedb.org/3/tv/${tvId}?api_key=${API_KEY}`);
  let seasons = (data.seasons || []).filter(s => s.season_number > 0);
  document.getElementById("sel-season").innerHTML = seasons.map(s =>
    `<option value="${s.season_number}">S${s.season_number} — ${s.name}</option>`
  ).join("");
  loadEpisodes();
}

async function loadEpisodes() {
  let season = document.getElementById("sel-season").value;
  let data = await fetchJson(`https://api.themoviedb.org/3/tv/${currentTvId}/season/${season}?api_key=${API_KEY}`);
  document.getElementById("sel-episode").innerHTML = (data.episodes || []).map(e =>
    `<option value="${e.episode_number}">E${e.episode_number} — ${e.name}</option>`
  ).join("");
}

function playEpisode() {
  let season = document.getElementById("sel-season").value;
  let episode = document.getElementById("sel-episode").value;
  document.getElementById("player-frame").src = `https://peachify.top/embed/tv/${currentTvId}/${season}/${episode}`;
}

function closePlayer() {
  document.getElementById("player-overlay").classList.remove("open");
  document.getElementById("player-frame").src = "";
  document.getElementById("theme-toggle").style.display = "";
}

document.onkeydown = e => {
  if (e.key === "Escape") {
    if (document.getElementById("filter-modal").classList.contains("open")) {
      toggleFilters();
    } else {
      closePlayer();
    }
  }
};
