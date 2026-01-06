import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:3001/api'

// ============================================
// FAVORITE DAPPS - Edit this list anytime!
// Just add/remove/change the dapp names here
// ============================================
const FEATURED_DAPP_NAMES = [
  "Aave V3",
  "Uniswap V3", 
  "Aerodrome Finance",
  "Moonwell",
  "BaseSwap"
]

// ============================================
// TRENDING DAPPS - Edit this list anytime!
// Hot and trending dapps on Base right now
// ============================================
const TRENDING_DAPP_NAMES = [
  "Compound V3",
  "Pendle",
  "Parallel Protocol V3",
  "friend.tech V1",
  "Virtuals Protocol"
]

function App() {
  const [dapps, setDapps] = useState([])
  const [featuredDapps, setFeaturedDapps] = useState([])
  const [trendingDapps, setTrendingDapps] = useState([])
  const [categories, setCategories] = useState({})
  const [selectedMajorCategory, setSelectedMajorCategory] = useState('all')
  const [selectedMinorCategory, setSelectedMinorCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [darkMode, setDarkMode] = useState(true) // Default to dark mode

  useEffect(() => {
    fetchDapps()
    fetchCategories()
    
    // Check for saved dark mode preference, default to dark mode if none saved
    const savedDarkMode = localStorage.getItem('darkMode')
    const shouldBeDark = savedDarkMode === null ? true : savedDarkMode === 'true'
    setDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.body.classList.add('dark-mode')
    }
  }, [])

  useEffect(() => {
    fetchDapps()
  }, [selectedMajorCategory, selectedMinorCategory, searchTerm])

  const fetchDapps = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      // Use minor category if selected, otherwise use major category
      if (selectedMinorCategory !== 'all') {
        params.append('category', selectedMinorCategory)
      } else if (selectedMajorCategory !== 'all') {
        // Filter by any subcategory in the major category
        // We'll handle this in the response
      }
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await axios.get(`${API_URL}/dapps?${params.toString()}`)
      let filteredDapps = response.data.dapps || []
      
      // If major category is selected but no minor category, filter by all subcategories
      if (selectedMajorCategory !== 'all' && selectedMinorCategory === 'all') {
        const subcategories = categories[selectedMajorCategory] || []
        filteredDapps = filteredDapps.filter(dapp => 
          subcategories.includes(dapp.category)
        )
      }
      
      setDapps(filteredDapps)
      
      // Set featured dapps based on FEATURED_DAPP_NAMES array
      if (selectedMajorCategory === 'all' && !searchTerm) {
        const featured = FEATURED_DAPP_NAMES
          .map(name => filteredDapps.find(dapp => dapp.name === name))
          .filter(dapp => dapp !== undefined) // Remove any not found
        setFeaturedDapps(featured)
        
        // Set trending dapps based on TRENDING_DAPP_NAMES array
        const trending = TRENDING_DAPP_NAMES
          .map(name => filteredDapps.find(dapp => dapp.name === name))
          .filter(dapp => dapp !== undefined) // Remove any not found
        setTrendingDapps(trending)
      } else {
        setFeaturedDapps([])
        setTrendingDapps([])
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching dapps:', err)
      setError('Failed to load dapps. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/dapps/categories`)
      setCategories(response.data.categories || {})
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleMajorCategoryClick = (majorCategory) => {
    if (majorCategory === selectedMajorCategory) {
      // Toggle expansion
      setExpandedCategory(expandedCategory === majorCategory ? null : majorCategory)
    } else {
      // Select new major category
      setSelectedMajorCategory(majorCategory)
      setSelectedMinorCategory('all')
      setExpandedCategory(majorCategory)
    }
  }

  const handleMinorCategoryClick = (minorCategory) => {
    setSelectedMinorCategory(minorCategory)
    setExpandedCategory(null) // Collapse after selection
  }

  const handleResetFilters = () => {
    setSelectedMajorCategory('all')
    setSelectedMinorCategory('all')
    setExpandedCategory(null)
  }

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode)
    
    if (newDarkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }

  const majorCategories = Object.keys(categories)
  const showHero = selectedMajorCategory === 'all' && !searchTerm

  return (
    <div className="app">
      {/* Dark Mode Toggle */}
      <button className="dark-mode-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
        {darkMode ? '☀️' : '🌙'}
      </button>

      <header className="header">
        <div className="container">
          <h1 className="title">
            <img src="/Baseappslogo3.png" alt="BaseApps Logo" className="title-icon" />
            BaseApps
          </h1>
          <p className="subtitle">Discover the best Dapps on Base</p>
        </div>
      </header>

      {/* Hero Section */}
      {showHero && (
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h2 className="hero-title">Your gateway to the Base ecosystem</h2>
              <p className="hero-description">
                Explore 1240+ decentralized applications built on Base. 
                From DeFi to NFTs, gaming to infrastructure - discover what's possible onchain.
              </p>
              <div className="hero-stats">
                <div className="stat-card">
                  <div className="stat-number">1240+</div>
                  <div className="stat-label">Dapps</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{majorCategories.length}</div>
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
      )}

      {/* Favorite Dapps Section */}
      {featuredDapps.length > 0 && (
        <section className="featured-section">
          <div className="container">
            <h2 className="section-title favorite-title">
              💙 Favorite Dapps
            </h2>
            <div className="featured-grid">
              {featuredDapps.map((dapp, index) => (
                <FeaturedDappCard key={index} dapp={dapp} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Dapps Section */}
      {trendingDapps.length > 0 && (
        <section className="featured-section trending-section">
          <div className="container">
            <h2 className="section-title trending-title">
              🔥 Trending Dapps
            </h2>
            <div className="featured-grid">
              {trendingDapps.map((dapp, index) => (
                <FeaturedDappCard key={index} dapp={dapp} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="main">
        <div className="container">
          <div className="controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search dapps..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>

            <div className="category-filters">
              {/* All button */}
              <button
                className={`category-btn major ${selectedMajorCategory === 'all' ? 'active' : ''}`}
                onClick={handleResetFilters}
              >
                All
              </button>

              {/* Major categories */}
              {majorCategories.map((majorCategory) => (
                <div key={majorCategory} className="category-group">
                  <button
                    className={`category-btn major ${
                      selectedMajorCategory === majorCategory ? 'active' : ''
                    }`}
                    onClick={() => handleMajorCategoryClick(majorCategory)}
                  >
                    {majorCategory}
                    {categories[majorCategory]?.length > 0 && (
                      <span className="subcategory-count">
                        {expandedCategory === majorCategory ? ' ▼' : ' ▶'}
                      </span>
                    )}
                  </button>

                  {/* Minor categories (subcategories) */}
                  {expandedCategory === majorCategory && (
                    <div className="subcategory-dropdown">
                      {categories[majorCategory]?.map((minorCategory) => (
                        <button
                          key={minorCategory}
                          className={`category-btn minor ${
                            selectedMinorCategory === minorCategory ? 'active' : ''
                          }`}
                          onClick={() => handleMinorCategoryClick(minorCategory)}
                        >
                          {minorCategory}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Active filter indicator */}
            {(selectedMajorCategory !== 'all' || selectedMinorCategory !== 'all') && (
              <div className="active-filters">
                <span className="filter-label">Active filter:</span>
                <span className="filter-value">
                  {selectedMinorCategory !== 'all' 
                    ? selectedMinorCategory 
                    : selectedMajorCategory}
                </span>
                <button className="clear-filter" onClick={handleResetFilters}>
                  ✕ Clear
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading dapps...</p>
            </div>
          ) : error ? (
            <div className="error">
              <p>⚠️ {error}</p>
              <p className="error-hint">Start the backend server: cd backend && npm install && npm start</p>
            </div>
          ) : (
            <>
              {!showHero && (
                <div className="stats">
                  <p>Found <strong>{dapps.length}</strong> dapp{dapps.length !== 1 ? 's' : ''}</p>
                </div>
              )}
              <div className="dapps-grid">
                {dapps.length === 0 ? (
                  <div className="no-results">
                    <p>No dapps found matching your criteria.</p>
                  </div>
                ) : (
                  dapps.map((dapp, index) => (
                    <DappCard key={index} dapp={dapp} index={index} />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Built for Base Network • Powered by Base</p>
        </div>
      </footer>
    </div>
  )
}

function FeaturedDappCard({ dapp, index }) {
  const handleVisit = () => {
    if (dapp.url) {
      window.open(dapp.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="featured-card" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="featured-card-image">
        <img src={dapp.logo} alt={dapp.name} onError={(e) => {
          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23667eea" width="100" height="100"/></svg>'
        }} />
      </div>
      <div className="featured-card-content">
        <h3 className="featured-card-name">{dapp.name}</h3>
        <p className="featured-card-description">{dapp.description}</p>
        <button className="featured-card-btn" onClick={handleVisit}>
          Explore →
        </button>
      </div>
    </div>
  )
}

function DappCard({ dapp, index }) {
  const handleVisit = () => {
    if (dapp.url) {
      window.open(dapp.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="dapp-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="dapp-card-header">
        {dapp.logo ? (
          <img src={dapp.logo} alt={dapp.name} className="dapp-logo" onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'flex'
          }} />
        ) : null}
        <div className="dapp-logo-placeholder" style={{ display: dapp.logo ? 'none' : 'flex' }}>
          {dapp.name.charAt(0).toUpperCase()}
        </div>
        <span className="dapp-category">{dapp.category}</span>
      </div>
      <div className="dapp-card-body">
        <h3 className="dapp-name">{dapp.name}</h3>
        <p className="dapp-description">{dapp.description}</p>
      </div>
      <div className="dapp-card-footer">
        <button className="visit-btn" onClick={handleVisit}>
          Visit Dapp →
        </button>
      </div>
    </div>
  )
}

export default App
