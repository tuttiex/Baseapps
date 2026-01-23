import { useState, useEffect } from 'react'
import axios from 'axios'
import { Header } from './components/Header'
import './App.css'

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://baseapps-production.up.railway.app/api'

function Admin() {
    const [secret, setSecret] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [activeTab, setActiveTab] = useState('pending') // 'pending', 'live', 'add'
    const [submissions, setSubmissions] = useState([])
    const [liveDapps, setLiveDapps] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingAction, setLoadingAction] = useState(null) // 'approve-id', 'reject-id', 'delete-name'
    const [categories, setCategories] = useState({}) // { Major: [Minors] }

    // Add Dapp Form State
    const [newDapp, setNewDapp] = useState({
        name: '',
        description: '',
        category: '',
        subcategory: '',
        customCategory: '',
        websiteUrl: '',
        logoUrl: '', // optional manual link
        chain: 'Base'
    })
    const [logoFile, setLogoFile] = useState(null)

    // Initialization
    useEffect(() => {
        document.body.classList.add('dark-mode')
        const storedSecret = localStorage.getItem('adminSecret')
        if (storedSecret) {
            setSecret(storedSecret)
            verifySecret(storedSecret)
        }
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/dapps/categories`)
            if (response.data.success) {
                setCategories(response.data.categories)
            }
        } catch (err) {
            console.error('Error fetching categories:', err)
        }
    }

    const verifySecret = async (key) => {
        try {
            await axios.get(`${API_BASE_URL}/admin/submissions?secret=${key}`)
            setIsAuthenticated(true)
            fetchData(key)
        } catch (err) {
            console.error("Invalid secret or auth check failed")
            if (isAuthenticated) setIsAuthenticated(false) // Log out if check fails
        }
    }

    const handleLogin = (e) => {
        e.preventDefault()
        // Simple client-side optimization, real check happens next
        if (secret) {
            localStorage.setItem('adminSecret', secret)
            verifySecret(secret)
        }
    }

    const fetchData = async (key) => {
        setLoading(true)
        try {
            // Fetch Submissions
            const subRes = await axios.get(`${API_BASE_URL}/admin/submissions?secret=${key}`)
            if (subRes.data.success) setSubmissions(subRes.data.submissions)

            // Fetch Live Dapps
            const liveRes = await axios.get(`${API_BASE_URL}/dapps`)
            if (liveRes.data.success) {
                // Sort dapps by score (highest first)
                const sortedDapps = liveRes.data.dapps.sort((a, b) => (b.score || 0) - (a.score || 0))
                setLiveDapps(sortedDapps)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    // --- Actions ---

    const handleApprove = async (id) => {
        if (!confirm("Approve this dapp? It will go live immediately.")) return
        setLoadingAction(`approve-${id}`)
        try {
            await axios.post(`${API_BASE_URL}/admin/submissions/approve`, { secret, id })
            alert("Approved! Dapp is now live.")
            fetchData(secret)
        } catch (err) {
            alert("Error approving: " + (err.response?.data?.error || err.message))
        } finally {
            setLoadingAction(null)
        }
    }

    const handleReject = async (id) => {
        if (!confirm("Reject and permanently DELETE this submission?")) return
        setLoadingAction(`reject-${id}`)
        try {
            await axios.delete(`${API_BASE_URL}/admin/submissions/${id}?secret=${secret}`)
            fetchData(secret)
        } catch (err) {
            alert("Error rejecting")
        } finally {
            setLoadingAction(null)
        }
    }

    const handleDeleteLive = async (name) => {
        if (!confirm(`Are you SURE you want to delete "${name}" from the LIVE site? This cannot be undone.`)) return
        setLoadingAction(`delete-${name}`)
        try {
            await axios.delete(`${API_BASE_URL}/admin/dapps/${encodeURIComponent(name)}?secret=${secret}`)
            alert("Deleted.")
            fetchData(secret)
        } catch (err) {
            alert("Error deleting: " + (err.response?.data?.error || err.message))
        } finally {
            setLoadingAction(null)
        }
    }

    const handleAddDirect = async (e) => {
        e.preventDefault()
        if (!newDapp.category) {
            alert("Please select a category")
            return
        }

        try {
            const formData = new FormData()
            formData.append('secret', secret)
            formData.append('name', newDapp.name)
            formData.append('description', newDapp.description)
            // Use subcategory as category if present, or custom
            const finalCategory = newDapp.subcategory || newDapp.category
            formData.append('category', finalCategory)
            formData.append('websiteUrl', newDapp.websiteUrl)
            formData.append('chain', newDapp.chain)

            if (newDapp.logoUrl) formData.append('logoUrl', newDapp.logoUrl)
            if (logoFile) formData.append('logo', logoFile)

            await axios.post(`${API_BASE_URL}/admin/dapps`, formData)
            alert("Dapp Added to Live Site!")

            // Reset form
            setNewDapp({
                name: '', description: '', category: '', subcategory: '',
                customCategory: '', websiteUrl: '', logoUrl: '', chain: 'Base'
            })
            setLogoFile(null)

            fetchData(secret)
            setActiveTab('live')
        } catch (err) {
            console.error(err)
            alert("Failed to add dapp: " + (err.response?.data?.error || err.message))
        }
    }

    // Helper to resolve logo URL
    const getLogoUrl = (dapp) => {
        if (!dapp.logo) return null;
        if (dapp.logo.startsWith('http')) return dapp.logo;
        // If relative path (e.g. /logos/...), prepend API base for display
        // Note: API_BASE_URL usually ends in /api, we need the root. 
        // But for Railway, we might just need the full domain.
        // Let's assume the backend serves static files correctly if we use the backend origin.
        const origin = new URL(API_BASE_URL).origin;
        return `${origin}${dapp.logo}`;
    }

    if (!isAuthenticated) {
        return (
            <div className="admin-login-container dark-mode" style={{ minHeight: '100vh', padding: '2rem' }}>
                <Header />
                <div className="container" style={{ maxWidth: 500, margin: '4rem auto' }}>
                    <div className="form-card">
                        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Access</h1>
                        <form onSubmit={handleLogin} className="admin-form">
                            <div className="form-group">
                                <label>Secret Key</label>
                                <input
                                    type="password"
                                    placeholder="Enter Secret Key"
                                    value={secret}
                                    onChange={e => setSecret(e.target.value)}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}
                                />
                            </div>
                            <button type="submit" className="sign-in-btn" style={{ width: '100%', marginTop: '1rem' }}>
                                Unlock Dashboard
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    const availableSubcategories = newDapp.category && categories[newDapp.category]
        ? categories[newDapp.category]
        : [];

    return (
        <div className="app dark-mode">
            <Header />
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>👮 Admin Dashboard</h1>
                    <button
                        onClick={() => {
                            setIsAuthenticated(false);
                            localStorage.removeItem('adminSecret');
                        }}
                        style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Sign Out
                    </button>
                </div>

                <div className="category-filters" style={{ marginBottom: '2rem' }}>
                    <button className={`category-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                        Pending Submissions ({submissions.length})
                    </button>
                    <button className={`category-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
                        Live Dapps ({liveDapps.length})
                    </button>
                    <button className={`category-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
                        + Add Special Dapp
                    </button>
                </div>

                {activeTab === 'pending' && (
                    <div className="dapps-grid">
                        {submissions.length === 0 && (
                            <div style={{ textAlign: 'center', width: '100%', padding: '4rem', color: '#888' }}>
                                <h2>All Caught Up! 🎉</h2>
                                <p>No pending submissions at the moment.</p>
                            </div>
                        )}
                        {submissions.map(sub => (
                            <div key={sub.id} className="dapp-card" style={{ borderColor: '#ff9800', borderWidth: '1px', borderStyle: 'solid' }}>
                                <div style={{ background: '#332200', padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #ff9800', fontSize: '0.8rem', color: '#ff9800', fontWeight: 'bold' }}>
                                    PENDING APPROVAL
                                </div>
                                <div className="dapp-card-body" style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        {sub.logo && (
                                            <img
                                                src={sub.logo.startsWith('http') ? sub.logo : `${new URL(API_BASE_URL).origin}${sub.logo}`}
                                                alt={sub.name}
                                                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/64?text=?'; }}
                                            />
                                        )}
                                        <div>
                                            <h3 style={{ margin: 0 }}>{sub.name}</h3>
                                            <span className="vote-badge" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                                {sub.category} {sub.subcategory ? `> ${sub.subcategory}` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1rem' }}>{sub.description}</p>

                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <strong>Website:</strong> <a href={sub.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>{sub.websiteUrl}</a>
                                        </div>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <strong>Submitted By:</strong> <span style={{ fontFamily: 'monospace' }}>{sub.submittedBy || 'Unknown'}</span>
                                        </div>
                                        <div>
                                            <strong>TxHash:</strong> {sub.txHash ? (
                                                <a href={`https://basescan.org/tx/${sub.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'underline' }}>
                                                    {sub.txHash.substring(0, 10)}...
                                                </a>
                                            ) : 'None'}
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#888' }}>
                                            Submitted: {new Date(sub.submittedAt).toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '1.5rem' }}>
                                        <button
                                            onClick={() => handleApprove(sub.id)}
                                            disabled={loadingAction === `approve-${sub.id}`}
                                            className="btn"
                                            style={{ background: '#4caf50', color: 'white' }}
                                        >
                                            {loadingAction === `approve-${sub.id}` ? 'Approving...' : '✅ Approve'}
                                        </button>
                                        <button
                                            onClick={() => handleReject(sub.id)}
                                            disabled={loadingAction === `reject-${sub.id}`}
                                            className="btn"
                                            style={{ background: 'rgba(244, 67, 54, 0.2)', color: '#f44336', border: '1px solid #f44336' }}
                                        >
                                            {loadingAction === `reject-${sub.id}` ? 'Rejecting...' : '❌ Reject'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'live' && (
                    <div className="form-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2>Live Dapps Directory</h2>
                            <span>Total: {liveDapps.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {liveDapps.map((dapp, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <img
                                            src={dapp.logo}
                                            width="40" height="40"
                                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{dapp.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                                {dapp.category} • Score: {dapp.score || 0}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteLive(dapp.name)}
                                        disabled={loadingAction === `delete-${dapp.name}`}
                                        style={{
                                            background: 'rgba(244, 67, 54, 0.1)', color: '#f44336', border: '1px solid #f44336',
                                            padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        {loadingAction === `delete-${dapp.name}` ? 'Deleting...' : '🗑️ Delete'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'add' && (
                    <div className="form-card" style={{ maxWidth: 600, margin: '0 auto' }}>
                        <h2>Add Dapp Directly (Bypass Voting)</h2>
                        <form onSubmit={handleAddDirect}>
                            <div className="form-group">
                                <label>Name</label>
                                <input value={newDapp.name} onChange={e => setNewDapp({ ...newDapp, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newDapp.description}
                                    onChange={e => setNewDapp({ ...newDapp, description: e.target.value })}
                                    rows="3"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={newDapp.category}
                                    onChange={e => setNewDapp({ ...newDapp, category: e.target.value, subcategory: '' })}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {Object.keys(categories).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {availableSubcategories.length > 0 && (
                                <div className="form-group">
                                    <label>Sub-Category</label>
                                    <select
                                        value={newDapp.subcategory}
                                        onChange={e => setNewDapp({ ...newDapp, subcategory: e.target.value })}
                                    >
                                        <option value="">Select Sub-Category</option>
                                        {availableSubcategories.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Website URL</label>
                                <input type="url" value={newDapp.websiteUrl} onChange={e => setNewDapp({ ...newDapp, websiteUrl: e.target.value })} required />
                            </div>

                            <div className="form-group">
                                <label>Logo Upload (Preferred)</label>
                                <input type="file" onChange={e => setLogoFile(e.target.files[0])} />
                            </div>

                            <div className="form-group">
                                <label>Or Logo URL (Backup)</label>
                                <input
                                    value={newDapp.logoUrl}
                                    onChange={e => setNewDapp({ ...newDapp, logoUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <button type="submit" className="submit-btn">
                                Add Dapp to Live
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Admin
