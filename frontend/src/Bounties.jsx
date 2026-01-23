import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import './Bounties.css'
import './App.css'

// Mock data for bounties - In production, this would come from a backend API
const MOCK_BOUNTIES = [
    {
        id: 1,
        title: "Create Marketing Video",
        type: "task",
        category: "Content",
        dappName: "Base Apps",
        dappLogo: "https://baseapps-production.up.railway.app/logos/logo-1768595750102-562798533.png",
        description: "Produce a 60-second explainer video showcasing BaseApps platform features. Should be engaging and professional.",
        reward: "500",
        currency: "USDC",
        difficulty: "Intermediate",
        timeframe: "1 week",
        skills: ["Video Editing", "Motion Graphics", "Storytelling"],
        postedDate: "2026-01-21",
        applicants: 34,
        status: "open"
    }
]

function Bounties() {
    const [bounties, setBounties] = useState(MOCK_BOUNTIES)
    const [filteredBounties, setFilteredBounties] = useState(MOCK_BOUNTIES)
    const [selectedType, setSelectedType] = useState('all')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedDifficulty, setSelectedDifficulty] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        // Force dark mode always
        document.body.classList.add('dark-mode')
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

    const types = ['all', 'bounty', 'gig', 'task', 'job']
    const categories = ['all', 'Development', 'Security', 'Design', 'Content', 'Marketing']
    const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced', 'Expert']

    return (
        <div className="app dark-mode">
            <Header />

            {/* Hero Section */}
            <section className="bounties-hero">
                <div className="container">
                    <div className="bounties-hero-content">
                        <h1 className="bounties-hero-title">
                            Discover <strong>Opportunities</strong> on Base
                        </h1>
                        <p className="bounties-hero-description">
                            Find bounties, gigs, tasks, and job openings from top Dapps in the Base ecosystem
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
                                <div className="bounty-stat-label">Active Dapps</div>
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

                    {/* Horizontal Pill Button Filters */}
                    <div className="category-filters">
                        {/* All button */}
                        <button
                            className={`category-btn major ${selectedType === 'all' && selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedType('all');
                                setSelectedCategory('all');
                            }}
                        >
                            All
                        </button>

                        {/* Type filters */}
                        {types.filter(t => t !== 'all').map((type) => (
                            <button
                                key={type}
                                className={`category-btn major ${selectedType === type ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedType(type);
                                    setSelectedCategory('all');
                                }}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Active Filter Indicator */}
                    {(selectedType !== 'all' || selectedCategory !== 'all') && (
                        <div className="active-filter-indicator">
                            <span>Active filter: </span>
                            <span className="active-filter-value">
                                {selectedType !== 'all' ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : ''}
                                {selectedCategory !== 'all' ? selectedCategory : ''}
                            </span>
                            <button
                                className="clear-filter-btn"
                                onClick={() => {
                                    setSelectedType('all');
                                    setSelectedCategory('all');
                                }}
                            >
                                ✕ Clear
                            </button>
                        </div>
                    )}
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
