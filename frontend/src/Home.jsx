import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:3001/api'

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
// TRENDING DAPPS - Hard-coded data
// ============================================
const TRENDING_DAPPS = [
  {
    name: "Compound V3",
    description: "Compound is an algorithmic, autonomous interest rate protocol built for developers, to unlock a universe of open financial applications.",
    url: "https://v3-app.compound.finance/",
    logo: "https://icons.llama.fi/compound-v3.png",
    category: "Lending & CDP"
  },
  {
    name: "Pendle",
    description: "Pendle Finance is a protocol that enables the trading of tokenized future yield on an AMM system.",
    url: "https://pendle.finance/",
    logo: "https://icons.llama.fi/pendle.jpg",
    category: "Yield & Yield Strategies"
  },
  {
    name: "Parallel Protocol V3",
    description: "Parallel is an over-collateralized, decentralized, modular & capital-efficient stablecoins protocol deployed on several chains.",
    url: "https://parallel.best/",
    logo: "https://icons.llama.fi/parallel-protocol-v3.jpg",
    category: "Lending & CDP"
  },
  {
    name: "friend.tech V1",
    description: "Your network is your net worth.",
    url: "https://www.friend.tech",
    logo: "https://icons.llama.fi/friend.tech.jpg",
    category: "SoFi"
  },
  {
    name: "Virtuals Protocol",
    description: "Infrastructure for building a decentralized society of AI agents onchain.",
    url: "https://app.virtuals.io",
    logo: "https://www.google.com/s2/favicons?domain=app.virtuals.io&sz=128",
    category: "AI"
  }
]

function Home() {
  const [allDapps, setAllDapps] = useState([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    fetchDappsCount()
    
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode')
    const shouldBeDark = savedDarkMode === null ? true : savedDarkMode === 'true'
    setDarkMode(shouldBeDark)
    document.body.classList.toggle('dark-mode', shouldBeDark)
  }, [])

  const fetchDappsCount = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/dapps`)
      setAllDapps(response.data)
    } catch (err) {
      console.error('Error fetching dapps count:', err)
      // Set default count if API fails
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
        <div className="container">
          <div className="logo-container">
            <img src="/Baseappslogo3.png" alt="BaseApps" className="logo" />
            <h1 className="logo-text">BaseApps</h1>
          </div>
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

      {/* Explore All Dapps Button */}
      <section className="explore-section">
        <div className="container">
          <Link to="/all-dapps" className="explore-all-btn">
            <span className="explore-text">Explore All Dapps</span>
            <span className="explore-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>Built for Base Network • Powered by Base</p>
        </div>
      </footer>
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
        <button className="featured-card-btn">
          Explore →
        </button>
      </div>
    </a>
  )
}

export default Home
