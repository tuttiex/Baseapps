import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'https://baseapps-production.up.railway.app/api'

function Admin() {
    const [secret, setSecret] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [activeTab, setActiveTab] = useState('pending') // 'pending', 'live', 'add'
    const [submissions, setSubmissions] = useState([])
    const [liveDapps, setLiveDapps] = useState([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    // Add Dapp Form State
    const [newDapp, setNewDapp] = useState({
        name: '',
        description: '',
        category: 'DeFi',
        websiteUrl: '',
        logoUrl: '' // optional if manual link
    })
    const [logoFile, setLogoFile] = useState(null)

    // Initialization
    useEffect(() => {
        const storedSecret = localStorage.getItem('adminSecret')
        if (storedSecret) {
            setSecret(storedSecret)
            // verify secret by trying to fetch submissions
            verifySecret(storedSecret)
        }
    }, [])

    const verifySecret = async (key) => {
        try {
            await axios.get(`${API_URL}/admin/submissions?secret=${key}`)
            setIsAuthenticated(true)
            fetchData(key)
        } catch (err) {
            console.error("Invalid secret or auth check failed")
        }
    }

    const handleLogin = (e) => {
        e.preventDefault()
        if (secret === 'baseboss') { // Client-side check for immediate feedback, real check on server
            localStorage.setItem('adminSecret', secret)
            verifySecret(secret)
        } else {
            alert("Invalid Secret")
        }
    }

    const fetchData = async (key) => {
        setLoading(true)
        try {
            // Fetch Submissions
            const subRes = await axios.get(`${API_URL}/admin/submissions?secret=${key}`)
            if (subRes.data.success) setSubmissions(subRes.data.submissions)

            // Fetch Live Dapps
            const liveRes = await axios.get(`${API_URL}/dapps`)
            if (liveRes.data.success) setLiveDapps(liveRes.data.dapps)

        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    // Action: Approve
    const handleApprove = async (id) => {
        if (!confirm("Approve this dapp?")) return
        try {
            await axios.post(`${API_URL}/admin/submissions/approve`, { secret, id })
            alert("Approved!")
            fetchData(secret)
        } catch (err) {
            alert("Error approving")
        }
    }

    // Action: Reject
    const handleReject = async (id) => {
        if (!confirm("Reject/Delete this submission?")) return
        try {
            await axios.delete(`${API_URL}/admin/submissions/${id}?secret=${secret}`)
            fetchData(secret)
        } catch (err) {
            alert("Error rejecting")
        }
    }

    // Action: Delete Live
    const handleDeleteLive = async (name) => {
        if (!confirm(`Permanently delete "${name}" from live site?`)) return
        try {
            await axios.delete(`${API_URL}/admin/dapps/${encodeURIComponent(name)}?secret=${secret}`)
            alert("Deleted.")
            fetchData(secret)
        } catch (err) {
            alert("Error deleting")
        }
    }

    // Action: Add Direct
    const handleAddDirect = async (e) => {
        e.preventDefault()
        try {
            const formData = new FormData()
            formData.append('secret', secret)
            formData.append('name', newDapp.name)
            formData.append('description', newDapp.description)
            formData.append('category', newDapp.category)
            formData.append('websiteUrl', newDapp.websiteUrl)
            if (newDapp.logoUrl) formData.append('logoUrl', newDapp.logoUrl)
            if (logoFile) formData.append('logo', logoFile)

            await axios.post(`${API_URL}/admin/dapps`, formData)
            alert("Dapp Added to Live Site!")
            setNewDapp({ name: '', description: '', category: 'DeFi', websiteUrl: '', logoUrl: '' })
            setLogoFile(null)
            fetchData(secret)
            setActiveTab('live')
        } catch (err) {
            console.error(err)
            alert("Failed to add dapp. Check console.")
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="admin-login-container">
                <h1>Admin Access</h1>
                <form onSubmit={handleLogin} className="admin-form">
                    <input
                        type="password"
                        placeholder="Enter Secret Key"
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>Unlocking...</button>
                </form>
            </div>
        )
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <h1>👮 Admin Dashboard</h1>

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
                    {submissions.length === 0 && <p>No pending submissions.</p>}
                    {submissions.map(sub => (
                        <div key={sub.id} className="dapp-card" style={{ borderColor: '#ff9800' }}>
                            <div className="dapp-card-body">
                                <h3>{sub.name}</h3>
                                <p style={{ fontSize: '0.8rem' }}>{sub.description}</p>
                                <p><strong>URL:</strong> <a href={sub.websiteUrl} target="_blank">{sub.websiteUrl}</a></p>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                    <button onClick={() => handleApprove(sub.id)} className="featured-card-btn" style={{ background: '#4caf50' }}>Approve</button>
                                    <button onClick={() => handleReject(sub.id)} className="featured-card-btn" style={{ background: '#f44336' }}>Reject</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'live' && (
                <div>
                    <p>Total Live: {liveDapps.length}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {liveDapps.map((dapp, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={dapp.logo} width="30" height="30" style={{ borderRadius: '50%' }} onError={e => e.target.style.display = 'none'} />
                                    <span><strong>{dapp.name}</strong></span>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Score: {dapp.score || 0}</span>
                                </div>
                                <button
                                    onClick={() => handleDeleteLive(dapp.name)}
                                    style={{ background: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                >Delete</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'add' && (
                <div className="form-card">
                    <h2>Add Dapp Directly</h2>
                    <form onSubmit={handleAddDirect}>
                        <div className="form-group">
                            <label>Name</label>
                            <input value={newDapp.name} onChange={e => setNewDapp({ ...newDapp, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea value={newDapp.description} onChange={e => setNewDapp({ ...newDapp, description: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select value={newDapp.category} onChange={e => setNewDapp({ ...newDapp, category: e.target.value })}>
                                <option value="DeFi">DeFi</option>
                                <option value="Dexs">Dexs</option>
                                <option value="Lending">Lending</option>
                                <option value="NFTs">NFTs</option>
                                <option value="Gaming">Gaming</option>
                                <option value="Social">Social</option>
                                <option value="Tools">Tools</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Website URL</label>
                            <input value={newDapp.websiteUrl} onChange={e => setNewDapp({ ...newDapp, websiteUrl: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Logo Upload</label>
                            <input type="file" onChange={e => setLogoFile(e.target.files[0])} />
                        </div>
                        <div className="form-group">
                            <label>Or Logo URL</label>
                            <input value={newDapp.logoUrl} onChange={e => setNewDapp({ ...newDapp, logoUrl: e.target.value })} placeholder="https://..." />
                        </div>
                        <button type="submit" className="submit-btn">Add Directly to Live</button>
                    </form>
                </div>
            )}

        </div>
    )
}

export default Admin
