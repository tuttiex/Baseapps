import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ConnectWallet } from './components/ConnectWallet'
import './App.css'

const API_URL = 'https://baseapps-production.up.railway.app/api'

// ============================================
// FAVORITE DAPPS - Hard-coded data
// ============================================
const FAVORITE_DAPPS = [
  {
    name: "Aave V3",
    description: "Earn interest, borrow assets, and build applications",
    url: "https://aave.com",
    logo: "https://icons.llama.fi/aave-v3.png",
    category: "Lending & CDP"
  },
  {
    name: "Seamless V2",
    description: "A decentralized, non-custodial liquidity market that creates a more seamless experience for Suppliers and Borrowers.",
    url: "https://www.seamlessprotocol.com",
    logo: "https://icons.llama.fi/seamless-v2.jpg",
    category: "Lending & CDP"
  },
  {
    name: "Aerodrome Finance",
    description: "The central trading and liquidity marketplace on Base.",
    url: "https://aerodrome.finance",
    logo: "https://www.google.com/s2/favicons?domain=aerodrome.finance&sz=256",
    category: "Dexs"
  },
  {
    name: "Curve DEX",
    description: "Curve is a decentralized exchange liquidity pool designed for extremely efficient stablecoin trading",
    url: "https://curve.finance",
    logo: "https://icons.llama.fi/curve.png",
    category: "Dexs"
  },
  {
    name: "Stargate V2",
    description: "Stargate V2 offers reduced bridging costs, expands chain connectivity, and improves capital efficiency.",
    url: "https://stargate.finance/",
    logo: "https://icons.llama.fi/stargate-v2.png",
    category: "Bridges"
  }
]

// ============================================
// TRENDING DAPPS - Hard-coded data (Manually Curated)
// ============================================
const TRENDING_DAPPS = [
  {
    name: "Uniswap V3",
    description: "Swap, earn, and build on the leading decentralized crypto trading protocol.",
    url: "https://app.uniswap.org/",
    logo: "https://icons.llama.fi/uniswap-v3.png",
    category: "Dexs"
  },
  {
    name: "BaseSwap",
    description: "The premier DEX on Base Chain. Swap, earn, and yield farm with low fees.",
    url: "https://baseswap.fi",
    logo: "https://icons.llama.fi/baseswap.png",
    category: "Dexs"
  },
  {
    name: "Friend.tech",
    description: "A social network for your friends. Buy shares of your friends.",
    url: "https://www.friend.tech",
    logo: "https://icons.llama.fi/friend.tech.png",
    category: "Social"
  },
  {
    name: "BasePaint",
    description: "Collaborative pixel art on Base. Paint together, mint together.",
    url: "https://basepaint.xyz",
    logo: "https://icons.llama.fi/basepaint.jpg",
    category: "Art"
  },
  {
    name: "Moonwell",
    description: "An open lending and borrowing protocol on Base, Moonbeam, and Moonriver.",
    url: "https://moonwell.fi",
    logo: "https://icons.llama.fi/moonwell.png",
    category: "Lending"
  }
]


function Home() {
  const [allDapps, setAllDapps] = useState([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDappsCount()

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode')
    const shouldBeDark = savedDarkMode === null ? true : savedDarkMode === 'true'
    setDarkMode(shouldBeDark)
    document.body.classList.toggle('dark-mode', shouldBeDark)
  }, [])

  // Debounced search for suggestions
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
          // Limit to top 8 suggestions
          setSuggestions(response.data.dapps.slice(0, 8))
          setShowSuggestions(true)
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err)
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.home-search-box')) {
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



  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode)
    document.body.classList.toggle('dark-mode', newDarkMode)
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

  if (loading) {
    return (
      <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
        <div className="loading">Loading amazing dapps...</div>
      </div>
    )
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      {/* Dark Mode Toggle */}
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo-container">
            <img src="/Baseappslogo3.png" alt="BaseApps" className="logo" />
            <h1 className="logo-text">BaseApps</h1>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Discover the best <strong>Dapps</strong> on Base</h1>
            <p className="hero-description">
              Explore the fastest-growing ecosystem of decentralized applications
            </p>
            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-number">1240+</div>
                <div className="stat-label">Dapps</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">6</div>
                <div className="stat-label">Categories</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">∞</div>
                <div className="stat-label">Possibilities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="home-search-section">
        <div className="container">
          <form onSubmit={handleSearch} className="home-search-form">
            <div className="home-search-box">
              <input
                type="text"
                placeholder="Search for dapps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="home-search-input"
                autoComplete="off"
              />
              <button type="submit" className="home-search-btn">
                🔍 Search
              </button>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="search-suggestions">
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
      </section>

      {/* Explore All Dapps Button */}
      <section className="explore-section">
        <div className="container">
          <Link to="/all-dapps" className="explore-all-btn">
            <span className="explore-text">Explore All Dapps</span>
            <span className="explore-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Favorite Dapps Section */}
      <section className="featured-section">
        <div className="container">
          <h2 className="section-title favorite-title">
            💙 Favorite Dapps
          </h2>
          <div className="featured-grid">
            {FAVORITE_DAPPS.map((dapp, index) => (
              <FeaturedDappCard key={index} dapp={dapp} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending Dapps Section */}
      <section className="featured-section trending-section">
        <div className="container">
          <h2 className="section-title trending-title">
            🔥 Trending Dapps
          </h2>
          <div className="featured-grid">
            {TRENDING_DAPPS.map((dapp, index) => (
              <FeaturedDappCard key={index} dapp={dapp} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <p>Built for Base Network • Powered by Base</p>
          <a
            href="https://x.com/base_dapps"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-x-icon"
            aria-label="Follow us on X (Twitter)"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </footer>

      {/* Floating Add Dapp Button */}
      <Link to="/add-dapps" className="floating-add-btn" aria-label="Add a Dapp">
        <span className="add-text">Add Dapps</span>
      </Link>
    </div>
  )
}

// Featured Dapp Card Component
function FeaturedDappCard({ dapp, index }) {
  return (
    <a
      href={dapp.url}
      target="_blank"
      rel="noopener noreferrer"
      className="featured-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="featured-card-image">
        <img
          src={dapp.logo || '/placeholder-logo.png'}
          alt={dapp.name}
          onError={(e) => {
            e.target.src = '/placeholder-logo.png'
          }}
        />
      </div>
      <div className="featured-card-content">
        <h3 className="featured-card-name">{dapp.name}</h3>
        <p className="featured-card-description">{dapp.description}</p>

        <div className="featured-card-footer">
          <button className="featured-card-btn">
            Explore →
          </button>
        </div>
      </div>
    </a>
  )
}

export default Home
