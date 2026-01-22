import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import './Bounties.css'
import './App.css'

// Mock data for bounties - In production, this would come from a backend API
const MOCK_BOUNTIES = [
    {
        id: 1,
        title: "Build a DEX Integration Plugin",
        type: "bounty",
        category: "Development",
        dappName: "Aerodrome Finance",
        dappLogo: "https://github.com/aerodrome-finance.png",
        description: "Create a browser extension that integrates with our DEX for one-click swaps. Must support Base network and include slippage protection.",
        reward: "5000",
        currency: "USDC",
        difficulty: "Advanced",
        timeframe: "4-6 weeks",
        skills: ["JavaScript", "Web3.js", "React", "Smart Contracts"],
        postedDate: "2026-01-20",
        applicants: 12,
        status: "open"
    },
    {
        id: 2,
        title: "Smart Contract Security Audit",
        type: "gig",
        category: "Security",
        dappName: "Aave V3",
        dappLogo: "https://cryptologos.cc/logos/aave-aave-logo.png",
        description: "Comprehensive security audit needed for our new lending pool implementation. Looking for experienced auditors familiar with DeFi protocols.",
        reward: "8000",
        currency: "ETH",
        difficulty: "Expert",
        timeframe: "2-3 weeks",
        skills: ["Solidity", "Security Auditing", "DeFi", "Testing"],
        postedDate: "2026-01-18",
        applicants: 8,
        status: "open"
    },
    {
        id: 3,
        title: "UI/UX Designer - NFT Marketplace",
        type: "job",
        category: "Design",
        dappName: "Zora",
        dappLogo: "https://github.com/ourzora.png",
        description: "Full-time UI/UX designer to reimagine our NFT marketplace experience. Remote position with competitive salary and token options.",
        reward: "100000",
        currency: "USD/year",
        difficulty: "Intermediate",
        timeframe: "Full-time",
        skills: ["Figma", "Web Design", "Prototyping", "User Research"],
        postedDate: "2026-01-15",
        applicants: 45,
        status: "open"
    },
    {
        id: 4,
        title: "Write Technical Documentation",
        type: "task",
        category: "Content",
        dappName: "Virtuals Protocol",
        dappLogo: "https://icons.llama.fi/virtuals-protocol.jpg",
        description: "Create comprehensive developer documentation for our AI agent SDK. Must include tutorials, API references, and code examples.",
        reward: "2500",
        currency: "USDC",
        difficulty: "Beginner",
        timeframe: "1-2 weeks",
        skills: ["Technical Writing", "Documentation", "AI/ML"],
        postedDate: "2026-01-22",
        applicants: 23,
        status: "open"
    },
    {
        id: 5,
        title: "Community Manager",
        type: "job",
        category: "Marketing",
        dappName: "Farcaster",
        dappLogo: "https://github.com/farcasterxyz.png",
        description: "Lead our community initiatives across Discord, Twitter, and Farcaster. Build engagement and grow our user base.",
        reward: "75000",
        currency: "USD/year",
        difficulty: "Intermediate",
        timeframe: "Full-time",
        skills: ["Community Management", "Social Media", "Web3"],
        postedDate: "2026-01-19",
        applicants: 67,
        status: "open"
    },
    {
        id: 6,
        title: "Bug Bounty: Critical Vulnerabilities",
        type: "bounty",
        category: "Security",
        dappName: "Uniswap",
        dappLogo: "https://cryptologos.cc/logos/uniswap-uni-logo.png",
        description: "Ongoing bug bounty program for critical vulnerabilities in our protocol. Rewards vary based on severity and impact.",
        reward: "50000",
        currency: "USDC",
        difficulty: "Expert",
        timeframe: "Ongoing",
        skills: ["Security Research", "Smart Contracts", "Penetration Testing"],
        postedDate: "2026-01-10",
        applicants: 156,
        status: "open"
    },
    {
        id: 7,
        title: "Create Marketing Video",
        type: "task",
        category: "Content",
        dappName: "Base Apps",
        dappLogo: "https://baseapps-production.up.railway.app/logos/logo-1768595750102-562798533.png",
        description: "Produce a 60-second explainer video showcasing BaseApps platform features. Should be engaging and professional.",
        reward: "1500",
        currency: "USDC",
        difficulty: "Intermediate",
        timeframe: "1 week",
        skills: ["Video Editing", "Motion Graphics", "Storytelling"],
        postedDate: "2026-01-21",
        applicants: 34,
        status: "open"
    },
    {
        id: 8,
        title: "Full Stack Developer - DeFi",
        type: "job",
        category: "Development",
        dappName: "Aerodrome Finance",
        dappLogo: "https://github.com/aerodrome-finance.png",
        description: "Join our core team to build next-generation DeFi primitives on Base. Experience with Solidity and React required.",
        reward: "120000",
        currency: "USD/year",
        difficulty: "Advanced",
        timeframe: "Full-time",
        skills: ["Solidity", "React", "Node.js", "DeFi", "Web3"],
        postedDate: "2026-01-16",
        applicants: 89,
        status: "open"
    }
]

function Bounties() {
    const [bounties, setBounties] = useState(MOCK_BOUNTIES)
    const [filteredBounties, setFilteredBounties] = useState(MOCK_BOUNTIES)
    const [darkMode, setDarkMode] = useState(true)
    const [selectedType, setSelectedType] = useState('all')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedDifficulty, setSelectedDifficulty] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        // Load dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode')
        const shouldBeDark = savedDarkMode === null ? true : savedDarkMode === 'true'
        setDarkMode(shouldBeDark)
        document.body.classList.toggle('dark-mode', shouldBeDark)
    }, [])

    useEffect(() => {
        // Filter bounties based on selected filters
        let filtered = bounties

        if (selectedType !== 'all') {
            filtered = filtered.filter(b => b.type === selectedType)
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(b => b.category === selectedCategory)
        }

        if (selectedDifficulty !== 'all') {
            filtered = filtered.filter(b => b.difficulty === selectedDifficulty)
        }

        if (searchTerm.trim()) {
            filtered = filtered.filter(b =>
                b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.dappName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        setFilteredBounties(filtered)
    }, [selectedType, selectedCategory, selectedDifficulty, searchTerm, bounties])

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode
        setDarkMode(newDarkMode)
        localStorage.setItem('darkMode', newDarkMode)
        document.body.classList.toggle('dark-mode', newDarkMode)
    }

    const types = ['all', 'bounty', 'gig', 'task', 'job']
    const categories = ['all', 'Development', 'Security', 'Design', 'Content', 'Marketing']
    const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced', 'Expert']

    return (
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
            {/* Dark Mode Toggle */}
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                {darkMode ? '☀️' : '🌙'}
            </button>

            <Header />

            {/* Hero Section */}
            <section className="bounties-hero">
                <div className="container">
                    <div className="bounties-hero-content">
                        <h1 className="bounties-hero-title">
                            Discover <strong>Opportunities</strong> on Base
                        </h1>
                        <p className="bounties-hero-description">
                            Find bounties, gigs, tasks, and job openings from top dApps in the Base ecosystem
                        </p>
                        <div className="bounties-stats">
                            <div className="bounty-stat-card">
                                <div className="bounty-stat-number">{filteredBounties.length}</div>
                                <div className="bounty-stat-label">Active Opportunities</div>
                            </div>
                            <div className="bounty-stat-card">
                                <div className="bounty-stat-number">
                                    {filteredBounties.reduce((sum, b) => sum + b.applicants, 0)}
                                </div>
                                <div className="bounty-stat-label">Total Applicants</div>
                            </div>
                            <div className="bounty-stat-card">
                                <div className="bounty-stat-number">
                                    {new Set(bounties.map(b => b.dappName)).size}
                                </div>
                                <div className="bounty-stat-label">Active dApps</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search and Filters */}
            <section className="bounties-filters-section">
                <div className="container">
                    {/* Search Bar */}
                    <div className="bounties-search-box">
                        <input
                            type="text"
                            placeholder="Search by title, skills, or dApp name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bounties-search-input"
                        />
                        <span className="bounties-search-icon">🔍</span>
                    </div>

                    {/* Filters */}
                    <div className="bounties-filters">
                        {/* Type Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Type</label>
                            <div className="filter-buttons">
                                {types.map(type => (
                                    <button
                                        key={type}
                                        className={`filter-btn ${selectedType === type ? 'active' : ''}`}
                                        onClick={() => setSelectedType(type)}
                                    >
                                        {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Category</label>
                            <div className="filter-buttons">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Difficulty</label>
                            <div className="filter-buttons">
                                {difficulties.map(difficulty => (
                                    <button
                                        key={difficulty}
                                        className={`filter-btn ${selectedDifficulty === difficulty ? 'active' : ''}`}
                                        onClick={() => setSelectedDifficulty(difficulty)}
                                    >
                                        {difficulty}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bounties Grid */}
            <section className="bounties-grid-section">
                <div className="container">
                    {filteredBounties.length === 0 ? (
                        <div className="bounties-empty">
                            <div className="empty-icon">🔍</div>
                            <h3>No opportunities found</h3>
                            <p>Try adjusting your filters or search terms</p>
                        </div>
                    ) : (
                        <div className="bounties-grid">
                            {filteredBounties.map(bounty => (
                                <BountyCard key={bounty.id} bounty={bounty} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container footer-content">
                    <p>Built for Base Network • Powered by Base</p>
                    <a
                        href="https://x.com/baseapps_"
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
        </div>
    )
}

// Bounty Card Component
function BountyCard({ bounty }) {
    const getTypeColor = (type) => {
        const colors = {
            bounty: '#667eea',
            gig: '#f093fb',
            task: '#4facfe',
            job: '#43e97b'
        }
        return colors[type] || '#667eea'
    }

    const getDifficultyColor = (difficulty) => {
        const colors = {
            Beginner: '#43e97b',
            Intermediate: '#4facfe',
            Advanced: '#f093fb',
            Expert: '#fa709a'
        }
        return colors[difficulty] || '#667eea'
    }

    const formatReward = (reward, currency) => {
        const num = parseInt(reward)
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M ${currency}`
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k ${currency}`
        return `${reward} ${currency}`
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffTime = Math.abs(now - date)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="bounty-card">
            {/* Header */}
            <div className="bounty-card-header">
                <div className="bounty-dapp-info">
                    <img
                        src={bounty.dappLogo}
                        alt={bounty.dappName}
                        className="bounty-dapp-logo"
                        onError={(e) => { e.target.src = '/placeholder-logo.png' }}
                    />
                    <div>
                        <div className="bounty-dapp-name">{bounty.dappName}</div>
                        <div className="bounty-posted-date">{formatDate(bounty.postedDate)}</div>
                    </div>
                </div>
                <span
                    className="bounty-type-badge"
                    style={{ background: getTypeColor(bounty.type) }}
                >
                    {bounty.type}
                </span>
            </div>

            {/* Title */}
            <h3 className="bounty-card-title">{bounty.title}</h3>

            {/* Description */}
            <p className="bounty-card-description">{bounty.description}</p>

            {/* Skills */}
            <div className="bounty-skills">
                {bounty.skills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="bounty-skill-tag">{skill}</span>
                ))}
                {bounty.skills.length > 3 && (
                    <span className="bounty-skill-tag">+{bounty.skills.length - 3}</span>
                )}
            </div>

            {/* Meta Info */}
            <div className="bounty-meta">
                <div className="bounty-meta-item">
                    <span className="meta-label">Difficulty</span>
                    <span
                        className="meta-value difficulty-badge"
                        style={{ color: getDifficultyColor(bounty.difficulty) }}
                    >
                        {bounty.difficulty}
                    </span>
                </div>
                <div className="bounty-meta-item">
                    <span className="meta-label">Timeframe</span>
                    <span className="meta-value">{bounty.timeframe}</span>
                </div>
                <div className="bounty-meta-item">
                    <span className="meta-label">Applicants</span>
                    <span className="meta-value">{bounty.applicants}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="bounty-card-footer">
                <div className="bounty-reward">
                    <span className="reward-label">Reward</span>
                    <span className="reward-amount">{formatReward(bounty.reward, bounty.currency)}</span>
                </div>
                <button className="bounty-apply-btn">
                    Apply Now →
                </button>
            </div>
        </div>
    )
}

export default Bounties
