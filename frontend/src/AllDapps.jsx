import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './App.css'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'

function AllDapps() {
  const [dapps, setDapps] = useState([])
  const [categories, setCategories] = useState({})
  const [selectedMajorCategory, setSelectedMajorCategory] = useState('all')
  const [selectedMinorCategory, setSelectedMinorCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [darkMode, setDarkMode] = useState(true)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)

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

  // Pagination functions
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(dapps.length / itemsPerPage)
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Calculate pagination
  const indexOfLastDapp = currentPage * itemsPerPage
  const indexOfFirstDapp = indexOfLastDapp - itemsPerPage
  const currentDapps = dapps.slice(indexOfFirstDapp, indexOfLastDapp)
  const totalPages = Math.ceil(dapps.length / itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMajorCategory, selectedMinorCategory, searchTerm])

  const majorCategories = Object.keys(categories)
  const showHero = selectedMajorCategory === 'all' && !searchTerm

  return (
    <div className="app">
      {/* Dark Mode Toggle */}
      <button className="dark-mode-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo-container">
            <Link to="/">
              <img src="/Baseappslogo3.png" alt="BaseApps" className="logo" />
            </Link>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <section className="all-dapps-header">
        <div className="container">
          <h1 className="all-dapps-title">All Dapps</h1>
          <p className="all-dapps-subtitle">Browse and search through all dapps on Base</p>
        </div>
      </section>

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
              <div className="stats-pagination-container">
                <div className="stats">
                  <p>Showing <strong>{indexOfFirstDapp + 1}-{Math.min(indexOfLastDapp, dapps.length)}</strong> of <strong>{dapps.length}</strong> dapp{dapps.length !== 1 ? 's' : ''}</p>
                </div>
                
                {/* Items per page toggle */}
                <div className="items-per-page">
                  <span className="items-label">Show:</span>
                  <button 
                    className={`items-btn ${itemsPerPage === 30 ? 'active' : ''}`}
                    onClick={() => handleItemsPerPageChange(30)}
                  >
                    30
                  </button>
                  <button 
                    className={`items-btn ${itemsPerPage === 50 ? 'active' : ''}`}
                    onClick={() => handleItemsPerPageChange(50)}
                  >
                    50
                  </button>
                  <button 
                    className={`items-btn ${itemsPerPage === 100 ? 'active' : ''}`}
                    onClick={() => handleItemsPerPageChange(100)}
                  >
                    100
                  </button>
                </div>
              </div>
              
              <div className="dapps-grid">
                {dapps.length === 0 ? (
                  <div className="no-results">
                    <p>No dapps found matching your criteria.</p>
                  </div>
                ) : (
                  currentDapps.map((dapp, index) => (
                    <DappCard key={index} dapp={dapp} index={index} />
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {dapps.length > 0 && totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn prev"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>
                  
                  <div className="pagination-info">
                    <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                  </div>
                  
                  <button 
                    className="pagination-btn next"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
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

export default AllDapps
