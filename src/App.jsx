import { useState, useEffect, useRef, useCallback } from 'react'

const API_KEY = "2dca580c2a14b55200e784d157207b4d"
const IMG_BASE = "https://image.tmdb.org/t/p/w342"
const ITEMS_PER_PAGE = 30

const GENRES = [
  { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" }, { id: 10751, name: "Family" }, { id: 14, name: "Fantasy" },
  { id: 36, name: "History" }, { id: 27, name: "Horror" }, { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
  { id: 10770, name: "TV Movie" }, { id: 53, name: "Thriller" }, { id: 10752, name: "War" },
  { id: 37, name: "Western" },
]

const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
const filterSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`
const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
const playSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`

async function fetchJson(url) {
  return (await fetch(url)).json()
}

function sortParam(sortBy, type) {
  const isTv = type === "tv" || type === "anime"
  switch (sortBy) {
    case "popularity": return "popularity.desc"
    case "rating": return "vote_average.desc"
    case "date-desc": return isTv ? "first_air_date.desc" : "primary_release_date.desc"
    case "date-asc": return isTv ? "first_air_date.asc" : "primary_release_date.asc"
    case "alpha-asc": return isTv ? "name.asc" : "original_title.asc"
    case "alpha-desc": return isTv ? "name.desc" : "original_title.desc"
    default: return "popularity.desc"
  }
}

function buildUrl(currentType, searchQuery, currentPage, filters, filtersActive) {
  const base = `https://api.themoviedb.org/3`
  const key = `api_key=${API_KEY}&language=en-US&include_adult=false`

  if (searchQuery) {
    if (currentType === "anime") return `${base}/search/tv?${key}&query=${encodeURIComponent(searchQuery)}&page=${currentPage}`
    return `${base}/search/multi?${key}&query=${encodeURIComponent(searchQuery)}&page=${currentPage}`
  }

  if (filtersActive) {
    const dt = currentType || "tv"
    const apiType = dt === "movie" ? "movie" : "tv"
    let extra = ""
    if (dt === "anime") extra = "&with_keywords=210024"
    const isTv = dt === "tv" || dt === "anime"
    const fp = [`sort_by=${sortParam(filters.sortBy, dt)}`]
    if (filters.genres.length) fp.push(`with_genres=${filters.genres.join(",")}`)
    if (filters.yearFrom) fp.push(`${isTv ? "first_air_date" : "primary_release_date"}.gte=${filters.yearFrom}-01-01`)
    if (filters.yearTo) fp.push(`${isTv ? "first_air_date" : "primary_release_date"}.lte=${filters.yearTo}-12-31`)
    return `${base}/discover/${apiType}?${key}&${fp.join("&")}${extra}&page=${currentPage}`
  }

  if (currentType === "anime") return `${base}/discover/tv?${key}&with_keywords=210024&sort_by=popularity.desc&page=${currentPage}`
  if (currentType === "movie") return `${base}/movie/popular?${key}&page=${currentPage}`
  if (currentType === "tv") return `${base}/tv/popular?${key}&page=${currentPage}`
  return `${base}/trending/all/week?${key}&page=${currentPage}`
}

function processResults(data, searchQuery, currentType, filters, filtersActive) {
  let items = (data.results || []).filter(i => i.poster_path)
  if (searchQuery && currentType === "movie") items = items.filter(i => i.media_type === "movie")
  else if (searchQuery && currentType === "tv") items = items.filter(i => i.media_type === "tv")
  if (searchQuery && filtersActive && filters.genres.length) {
    items = items.filter(i => {
      const itemGenres = i.genre_ids || []
      return filters.genres.some(g => itemGenres.includes(g))
    })
  }
  return items.slice(0, ITEMS_PER_PAGE)
}

export default function App() {
  const [currentType, setCurrentType] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState("")
  const [currentEpisode, setCurrentEpisode] = useState("")
  const [episodes, setEpisodes] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") === "dark" ? "dark" : "light")
  const [filters, setFilters] = useState({ sortBy: "popularity", genres: [], yearFrom: "", yearTo: "" })
  const [filtersActive, setFiltersActive] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [playerSrc, setPlayerSrc] = useState("")
  const debounceRef = useRef(null)
  const pageRef = useRef(1)
  const loadMoreRef = useRef(false)

  useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark")
    else document.documentElement.removeAttribute("data-theme")
    localStorage.setItem("theme", theme)
  }, [theme])

  const fetchPage = useCallback(async (page, reset) => {
    setIsLoading(true)
    pageRef.current = page
    const url = buildUrl(currentType, searchQuery, page, filters, filtersActive)
    const data = await fetchJson(url)
    setTotalPages(data.total_pages ?? 1)
    const resultItems = processResults(data, searchQuery, currentType, filters, filtersActive)
    setItems(prev => reset ? resultItems : [...prev, ...resultItems])
    setIsLoading(false)
  }, [currentType, searchQuery, filters, filtersActive])

  useEffect(() => {
    fetchPage(1, true)
  }, [currentType, filters, filtersActive])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      loadMoreRef.current = false
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  useEffect(() => {
    if (loadMoreRef.current) {
      loadMoreRef.current = false
      fetchPage(currentPage, false)
    }
  }, [currentPage, fetchPage])

  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || pageRef.current >= totalPages) return
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadMoreRef.current = true
        setCurrentPage(prev => prev + 1)
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isLoading, totalPages])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (filterOpen) setFilterOpen(false)
        else closePlayer()
      }
    }
    document.onkeydown = handleKey
    return () => { document.onkeydown = null }
  }, [filterOpen])

  function switchType(type) {
    setCurrentType(prev => prev === type ? null : type)
    setCurrentPage(1)
  }

  async function openItem(item) {
    setCurrentItem(item)
    const type = currentType || item.media_type
    if (type === "movie") {
      setPlayerSrc(`https://peachify.top/embed/movie/${item.id}?accent=ffffff&cast=hide`)
      setIsPlayerOpen(true)
    } else {
      setPlayerSrc("")
      setIsPlayerOpen(true)
      const data = await fetchJson(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${API_KEY}`)
      const s = (data.seasons || []).filter(s => s.season_number > 0)
      setSeasons(s)
      if (s.length > 0) {
        setCurrentSeason(String(s[0].season_number))
        const epData = await fetchJson(`https://api.themoviedb.org/3/tv/${item.id}/season/${s[0].season_number}?api_key=${API_KEY}`)
        setEpisodes(epData.episodes || [])
        if ((epData.episodes || []).length > 0) setCurrentEpisode(String(epData.episodes[0].episode_number))
      }
    }
  }

  async function loadSeasonEpisodes(seasonNum) {
    if (!currentItem) return
    setCurrentSeason(seasonNum)
    const data = await fetchJson(`https://api.themoviedb.org/3/tv/${currentItem.id}/season/${seasonNum}?api_key=${API_KEY}`)
    setEpisodes(data.episodes || [])
    if ((data.episodes || []).length > 0) setCurrentEpisode(String(data.episodes[0].episode_number))
  }

  function playEpisode() {
    if (!currentSeason || !currentEpisode || !currentItem) return
    setPlayerSrc(`https://peachify.top/embed/tv/${currentItem.id}/${currentSeason}/${currentEpisode}?accent=ffffff&cast=hide`)
  }

  function closePlayer() {
    setIsPlayerOpen(false)
    setPlayerSrc("")
    setCurrentItem(null)
    setSeasons([])
    setEpisodes([])
    setCurrentSeason("")
    setCurrentEpisode("")
  }

  function applyFilters() {
    const sortBy = document.getElementById("filter-sort").value
    const genres = []
    document.querySelectorAll("#filter-genres input:checked").forEach(cb => genres.push(Number(cb.value)))
    const yearFrom = document.getElementById("filter-year-from").value
    const yearTo = document.getElementById("filter-year-to").value
    const active = sortBy !== "popularity" || genres.length > 0 || yearFrom || yearTo
    setFilters({ sortBy, genres, yearFrom, yearTo })
    setFiltersActive(active)
    setFilterOpen(false)
    setCurrentPage(1)
  }

  function resetFilters() {
    setFilters({ sortBy: "popularity", genres: [], yearFrom: "", yearTo: "" })
    setFiltersActive(false)
    setFilterOpen(false)
    setCurrentPage(1)
  }

  const playerType = currentItem ? (currentType || currentItem.media_type) : null
  const isTvPlayer = playerType && playerType !== "movie"

  return (
    <>
      <button id="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
        dangerouslySetInnerHTML={{ __html: theme === "dark" ? sunSVG : moonSVG }}
        style={{ display: isPlayerOpen ? "none" : "" }}
      />
      <div id="header">
        <input id="search" placeholder="Search..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div id="type-btns">
          {[
            { id: "btn-movie", type: "movie", label: "Movies" },
            { id: "btn-tv", type: "tv", label: "Series" },
            { id: "btn-anime", type: "anime", label: "Anime" },
          ].map(btn => (
            <button key={btn.id} id={btn.id}
              className={currentType === btn.type ? "active" : ""}
              onClick={() => switchType(btn.type)}
            >{btn.label}</button>
          ))}
          <button id="btn-filter" className={filtersActive ? "active" : ""}
            onClick={() => setFilterOpen(prev => !prev)} aria-label="Filters"
            dangerouslySetInnerHTML={{ __html: filterSVG }}
          />
        </div>
      </div>

      <div id="filter-modal" className={filterOpen ? "open" : ""}>
        <div id="filter-backdrop" onClick={() => setFilterOpen(false)} />
        <div id="filter-panel">
          <div id="filter-head">
            <span>Filters</span>
            <button onClick={() => setFilterOpen(false)} aria-label="Close" dangerouslySetInnerHTML={{ __html: closeSVG }} />
          </div>
          <div className="filter-group">
            <label>Sort by</label>
            <select id="filter-sort" defaultValue={filters.sortBy}>
              <option value="popularity">Popularity</option>
              <option value="rating">Rating</option>
              <option value="date-desc">Release Date (newest)</option>
              <option value="date-asc">Release Date (oldest)</option>
              <option value="alpha-asc">Alphabetical A-Z</option>
              <option value="alpha-desc">Alphabetical Z-A</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Genres</label>
            <div id="filter-genres">
              {GENRES.map(g => (
                <div key={g.id}>
                  <input type="checkbox" id={`g-${g.id}`} value={g.id} defaultChecked={filters.genres.includes(g.id)} />
                  <label htmlFor={`g-${g.id}`}>{g.name}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <label>Year</label>
            <div id="filter-years">
              <input type="number" id="filter-year-from" placeholder="From" defaultValue={filters.yearFrom} />
              <span>—</span>
              <input type="number" id="filter-year-to" placeholder="To" defaultValue={filters.yearTo} />
            </div>
          </div>
          <div id="filter-actions">
            <button id="filter-reset" onClick={resetFilters}>Reset</button>
            <button id="filter-apply" onClick={applyFilters}>Apply</button>
          </div>
        </div>
      </div>

      <div id="grid">
        {items.map((item, i) => (
          <div key={`${item.id}-${i}`} className="card" style={{ "--i": i }} onClick={() => openItem(item)}>
            <img src={`${IMG_BASE}${item.poster_path}`} alt={item.title || item.name} loading="lazy" />
            <div className="card-meta">
              <div className="card-title">{item.title || item.name}</div>
              {(item.release_date || item.first_air_date || "").slice(0, 4) && (
                <div className="card-sub">{(item.release_date || item.first_air_date || "").slice(0, 4)}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentPage < totalPages && items.length > 0 && (
        <button id="load-more" onClick={() => { loadMoreRef.current = true; setCurrentPage(prev => prev + 1) }}>Load more</button>
      )}

      <div id="player-overlay" className={isPlayerOpen ? "open" : ""}>
        <div id="player-bar">
          <span id="player-title">{currentItem?.title || currentItem?.name || ""}</span>
          {isTvPlayer && (
            <div id="tv-controls">
              <label>Season
                <select value={currentSeason} onChange={e => loadSeasonEpisodes(e.target.value)}>
                  {seasons.map(s => (
                    <option key={s.season_number} value={s.season_number}>S{s.season_number} — {s.name}</option>
                  ))}
                </select>
              </label>
              <label>Episode
                <select value={currentEpisode} onChange={e => setCurrentEpisode(e.target.value)}>
                  {episodes.map(e => (
                    <option key={e.episode_number} value={e.episode_number}>E{e.episode_number} — {e.name}</option>
                  ))}
                </select>
              </label>
              <button onClick={playEpisode} aria-label="Play" dangerouslySetInnerHTML={{ __html: playSVG }} />
            </div>
          )}
          <button onClick={closePlayer} aria-label="Close" dangerouslySetInnerHTML={{ __html: closeSVG }} />
        </div>
        <iframe id="player-frame" src={playerSrc} allowFullScreen />
      </div>
    </>
  )
}
