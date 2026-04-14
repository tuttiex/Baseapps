import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { VoteButtons } from './components/VoteButtons'
import { Header } from './components/Header'
import { SearchIcon, GlobeIcon, UsersIcon, GridIcon, ChevronLeftIcon, ChevronRightIcon } from './components/Icons'
import { NewsCarousel } from './components/NewsCarousel'
import './Home.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://baseapps-backend.onrender.com/api'

// ============================================
// FAVORITE DAPPS - Curated Featured DApps
// ============================================
const FAVORITE_DAPPS = [
  {
    name: "Curve",
    description: "Exchange",
    url: "https://curve.fi",
    logo: "https://icons.llama.fi/curve.png",
    category: "Dexs"
  },
  {
    name: "OpenSea",
    description: "NFT Marketplace",
    url: "https://opensea.io",
    logo: "https://icons.llama.fi/opensea.png",
    category: "NFTs"
  },
  {
    name: "Uniswap",
    description: "DEX",
    url: "https://uniswap.org",
    logo: "https://icons.llama.fi/uniswap.png",
    category: "Dexs"
  },
  {
    name: "Aave",
    description: "Lending",
    url: "https://aave.com",
    logo: "https://icons.llama.fi/aave-v3.png",
    category: "Lending"
  }
]

// ============================================
// TRENDING DAPPS - With metrics
// ============================================
const TRENDING_DAPPS = [
  {
    rank: 1,
    name: "Curve",
    description: "Decentralized exchange",
    url: "https://curve.fi",
    logo: "https://icons.llama.fi/curve.png",
    volume: "$5.2M",
    change: "+4.5%",
    positive: true
  },
  {
    rank: 2,
    name: "OpenSea",
    description: "NFT Marketplace",
    url: "https://opensea.io",
    logo: "https://icons.llama.fi/opensea.png",
    volume: "$5.2M",
    change: "+4.5%",
    positive: true
  },
  {
    rank: 3,
    name: "Aave",
    description: "Lending Protocol",
    url: "https://aave.com",
    logo: "https://icons.llama.fi/aave-v3.png",
    volume: "$5.2M",
    change: "+4.5%",
    positive: true
  },
  {
    rank: 4,
    name: "Uniswap",
    description: "DEX Protocol",
    url: "https://uniswap.org",
    logo: "https://icons.llama.fi/uniswap.png",
    volume: "$5.2M",
    change: "+4.5%",
    positive: true
  }
]


function Home() {
  const [allDapps, setAllDapps] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [trendingPage, setTrendingPage] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('dark-mode')
    fetchDappsCount()
  }, [])

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/dapps?search=${encodeURIComponent(searchTerm.trim())}`)
        if (response.data.success) {
          setSuggestions(response.data.dapps.slice(0, 8))
          setShowSuggestions(true)
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err)
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.hero-search-box')) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchDappsCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/dapps`)
      setAllDapps(response.data.dapps || [])
    } catch (err) {
      console.error('Error fetching dapps:', err)
      setAllDapps([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/all-dapps?search=${encodeURIComponent(searchTerm.trim())}`)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (dappName) => {
    setSearchTerm(dappName)
    navigate(`/all-dapps?search=${encodeURIComponent(dappName)}`)
    setShowSuggestions(false)
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[selectedIndex].name)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const nextTrending = () => {
    setTrendingPage(prev => (prev + 1) % Math.ceil(TRENDING_DAPPS.length / 4))
  }

  const prevTrending = () => {
    setTrendingPage(prev => (prev - 1 + Math.ceil(TRENDING_DAPPS.length / 4)) % Math.ceil(TRENDING_DAPPS.length / 4))
  }

  if (loading) {
    return (
      <div className="app dark-mode">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading BaseApps...</p>
        </div>
      </div>
    )
  }

  const hydrateDapps = (manualList) => {
    return manualList.map(manualDapp => {
      const liveDapp = allDapps.find(d =>
        d.name.toLowerCase() === manualDapp.name.toLowerCase() ||
        d.url === manualDapp.url
      )
      return liveDapp ? {
        ...manualDapp,
        dappId: liveDapp.dappId,
        isRegistered: liveDapp.isRegistered,
        score: liveDapp.score
      } : manualDapp
    })
  }

  const hydratedFavorites = hydrateDapps(FAVORITE_DAPPS)
  const hydratedTrending = hydrateDapps(TRENDING_DAPPS)

  return (
    <div className="app dark-mode">
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-headline">
              Discover the<br />
              Heart of <span className="gradient-text">Base</span>
            </h1>
            <p className="hero-subtext">
              Explore the fastest growing ecosystem on Ethereum.
            </p>

            {/* Stats Cards */}
            <div className="stats-container">
              <div className="stat-box">
                <div className="stat-icon"><GlobeIcon size={24} /></div>
                <div className="stat-value">1400+</div>
                <div className="stat-label">Total DApps</div>
              </div>
              <div className="stat-box">
                <div className="stat-icon"><UsersIcon size={24} /></div>
                <div className="stat-value">150k+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-box">
                <div className="stat-icon"><GridIcon size={24} /></div>
                <div className="stat-value">7</div>
                <div className="stat-label">Categories</div>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hero-search-form">
              <div className="hero-search-box">
                <SearchIcon size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search for dapps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="hero-search-input"
                  autoComplete="off"
                />
                <button type="submit" className="hero-search-btn">
                  Search
                </button>

                {showSuggestions && (
                  <div className="search-suggestions-dropdown">
                    {loadingSuggestions ? (
                      <div className="suggestion-loading">Searching...</div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((dapp, index) => (
                        <div
                          key={dapp.name}
                          className={`suggestion-item ${index === selectedIndex ? 'active' : ''}`}
                          onClick={() => handleSuggestionClick(dapp.name)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <img
                            src={dapp.logo || '/placeholder-logo.png'}
                            alt={dapp.name}
                            className="suggestion-logo"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                          <div className="suggestion-info">
                            <div className="suggestion-name">{dapp.name}</div>
                            <div className="suggestion-category">{dapp.category}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="suggestion-empty">No dapps found</div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Favorite DApps Section */}
      <section className="favorite-section">
        <div className="container">
          <h2 className="section-heading">Favorite DApps</h2>
          <div className="favorite-grid">
            {hydratedFavorites.map((dapp, index) => (
              <FavoriteCard key={index} dapp={dapp} index={index} />
            ))}
          </div>
          <div className="explore-wrapper">
            <Link to="/all-dapps" className="explore-btn">
              Explore
            </Link>
          </div>
        </div>
      </section>

      {/* Trending DApps Section */}
      <section className="trending-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-heading">Trending DApps</h2>
            <div className="carousel-controls">
              <button className="carousel-btn" onClick={prevTrending}>
                <ChevronLeftIcon size={20} />
              </button>
              <div className="carousel-dots">
                {Array.from({ length: Math.ceil(TRENDING_DAPPS.length / 4) }).map((_, i) => (
                  <span key={i} className={`dot ${i === trendingPage ? 'active' : ''}`} onClick={() => setTrendingPage(i)} />
                ))}
              </div>
              <button className="carousel-btn" onClick={nextTrending}>
                <ChevronRightIcon size={20} />
              </button>
            </div>
          </div>
          <div className="trending-carousel">
            {hydratedTrending.slice(trendingPage * 4, (trendingPage + 1) * 4).map((dapp, index) => (
              <TrendingCard key={index} dapp={dapp} />
            ))}
          </div>
        </div>
      </section>

      {/* Base News Section */}
      <section className="news-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-heading">Base News</h2>
            <div className="carousel-controls">
              <button className="carousel-btn">
                <ChevronLeftIcon size={20} />
              </button>
              <button className="carousel-btn">
                <ChevronRightIcon size={20} />
              </button>
            </div>
          </div>
          <NewsCarousel />
        </div>
      </section>

      {/* Footer */}
      <footer className="modern-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-column">
              <h4>Community</h4>
              <ul>
                <li><Link to="/all-dapps">Community</Link></li>
                <li><Link to="/add-dapps">Developers</Link></li>
                <li><Link to="/blog">News</Link></li>
                <li><a href="#">Team</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Developers</h4>
              <ul>
                <li><a href="#">Content</a></li>
                <li><Link to="/blog">Blog</Link></li>
                <li><a href="#">Resources</a></li>
                <li><a href="#">Developments</a></li>
                <li><a href="#">Form</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <ul>
                <li><Link to="/all-dapps">About</Link></li>
                <li><a href="#">Resources</a></li>
                <li><a href="#">Post Analytics</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Social Media</h4>
              <div className="social-links">
                <a href="https://x.com/baseapps_" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="#" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="footer-column built-on-base">
              <div className="base-badge">
                <div className="base-logo"></div>
                <span>Built on<br/>Base</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Favorite Card Component
function FavoriteCard({ dapp, index }) {
  return (
    <div
      className="favorite-card"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => window.open(dapp.url, '_blank')}
    >
      <div className="favorite-card-logo">
        <img
          src={dapp.logo || '/placeholder-logo.png'}
          alt={dapp.name}
          onError={(e) => { e.target.src = '/placeholder-logo.png' }}
        />
      </div>
      <div className="favorite-card-info">
        <h3 className="favorite-card-name">{dapp.name}</h3>
        <p className="favorite-card-desc">{dapp.description}</p>
      </div>
    </div>
  )
}

// Trending Card Component
function TrendingCard({ dapp }) {
  return (
    <div className="trending-card" onClick={() => window.open(dapp.url, '_blank')}>
      <div className="trending-rank">{dapp.rank}</div>
      <div className="trending-logo">
        <img src={dapp.logo || '/placeholder-logo.png'} alt={dapp.name} />
      </div>
      <div className="trending-info">
        <h4 className="trending-name">{dapp.name}</h4>
        <p className="trending-desc">{dapp.description}</p>
        <div className="trending-metrics">
          <span className="trending-volume">24h Volume: {dapp.volume}</span>
          <span className={`trending-change ${dapp.positive ? 'positive' : 'negative'}`}>
            {dapp.change}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Home
