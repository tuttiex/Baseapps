import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ConnectWallet } from './components/ConnectWallet'
import axios from 'axios'
import { useSendTransaction, useAccount, useChainId, useSwitchChain } from 'wagmi'
import { parseEther } from 'viem'
import { base } from 'wagmi/chains'

const ADMIN_WALLET = "0x94Da11A4a55C67aFe39B5C2250a503c059b27ce2"

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://baseapps-production.up.railway.app/api'

function AddDapps() {
    // Start with Dark Mode by default
    const [darkMode, setDarkMode] = useState(true)

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
        document.body.classList.toggle('dark-mode')
    }

    // Effect to enforce dark mode on mount
    useEffect(() => {
        document.body.classList.add('dark-mode')
        return () => {
            // Optional: cleanup if we wanted to revert state content
            // document.body.classList.remove('dark-mode')
        }
    }, [])

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        subcategory: '', // New field
        customCategory: '',
        websiteUrl: '',
        logo: null
    })
    const [categories, setCategories] = useState({}) // Store categories { Major: [Minor, Minor] }
    const [errors, setErrors] = useState({})
    const [logoPreview, setLogoPreview] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState(null) // 'success', 'error', null
    const [ethPrice, setEthPrice] = useState(null)
    const [dynamicFee, setDynamicFee] = useState('0.0003') // Fallback default

    const { address, isConnected } = useAccount()
    const chainId = useChainId()
    const { switchChainAsync } = useSwitchChain()
    const { sendTransactionAsync } = useSendTransaction()

    // Fetch ETH price and categories
    useEffect(() => {
        const fetchEthPrice = async () => {
            try {
                // Using CoinGecko simple price API
                const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
                const price = response.data.ethereum.usd
                console.log("Current ETH Price:", price)
                setEthPrice(price)
                // Calculate fee for $0.01 USD (TEMPORARY FOR TESTING)
                const fee = (0.01 / price).toFixed(6)
                setDynamicFee(fee)
            } catch (err) {
                console.error('Error fetching ETH price:', err)
                // Keep default 0.0003 (~$1 at $3333 ETH)
            }
        }

        fetchEthPrice()
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
        fetchCategories()
    }, [])

    // Categories from AllDapps (we should ideally centralize this)
    // const CATEGORIES = [ // Removed as categories are now fetched
    //     "DeFi",
    //     "NFT",
    //     "Gaming",
    //     "Social",
    //     "Infrastructure",
    //     "DAO",
    //     "Other"
    // ]

    const handleInputChange = (e) => {
        const { name, value } = e.target

        // Character Limit Logic
        if (name === 'name' && value.length > 25) return
        if (name === 'description' && value.length > 200) return

        setFormData(prev => {
            const newData = { ...prev, [name]: value }

            // Reset subcategory and customCategory if main category changes
            if (name === 'category') {
                newData.subcategory = ''
                newData.customCategory = ''
            }
            return newData
        })

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // 5MB Validation
        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, logo: "File size must be less than 5MB" }))
            return
        }

        setFormData(prev => ({ ...prev, logo: file }))
        setLogoPreview(URL.createObjectURL(file))
        setErrors(prev => ({ ...prev, logo: null }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.name.trim()) newErrors.name = "Name is required"
        if (!formData.description.trim()) newErrors.description = "Description is required"
        if (!formData.category) newErrors.category = "Category is required"

        // Validate Subcategory (skip if "Other" or no subcategories exist)
        const hasSubcategories = categories[formData.category] && categories[formData.category].length > 0
        if (formData.category !== 'Other' && hasSubcategories && !formData.subcategory) {
            newErrors.subcategory = "Sub-category is required"
        }

        if ((formData.category === 'Other' || formData.subcategory === 'Other') && !formData.customCategory.trim()) {
            newErrors.customCategory = "Please specify a category"
        }
        if (!formData.websiteUrl.trim()) {
            newErrors.websiteUrl = "Website URL is required"
        } else if (!/^https?:\/\/.+/.test(formData.websiteUrl)) {
            newErrors.websiteUrl = "Must be a valid URL (start with http:// or https://)"
        }
        if (!formData.logo) newErrors.logo = "Logo is required"

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        if (!isConnected) {
            alert("Please connect your wallet first!")
            return
        }

        // --- NEW SAFETY CHECK: Ensure user is on Base Network ---
        if (chainId !== base.id) {
            try {
                const confirmed = window.confirm(`You are on the wrong network. Switch to Base to continue?`)
                if (confirmed) {
                    await switchChainAsync({ chainId: base.id })
                } else {
                    return
                }
            } catch (err) {
                alert("Network switch failed. Please switch to Base Network manually in your wallet.")
                return
            }
        }
        // --------------------------------------------------------

        setIsSubmitting(true)
        setSubmitStatus(null)

        try {
            // 1. Payment Step
            console.log(`Initiating payment for ${dynamicFee} ETH...`)
            const hash = await sendTransactionAsync({
                to: ADMIN_WALLET,
                value: parseEther(dynamicFee), // Dynamic $1.00 USD
            })

            console.log("Payment sent! Hash:", hash)

            // 2. Prepare Data
            const data = new FormData()
            data.append('name', formData.name)
            data.append('description', formData.description)
            data.append('category', formData.category)
            if (formData.subcategory) data.append('subcategory', formData.subcategory)
            if (formData.customCategory) data.append('customCategory', formData.customCategory)
            data.append('websiteUrl', formData.websiteUrl)
            data.append('logo', formData.logo)
            data.append('txHash', hash) // Attach receipt

            // 3. Send to Backend
            console.log("Uploading to backend...")
            const response = await axios.post(`${API_BASE_URL}/submit-dapp`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            if (response.data.success) {
                setSubmitStatus('success')
                // Reset form
                setFormData({
                    name: '', description: '', category: '', subcategory: '',
                    customCategory: '', websiteUrl: '', logo: null
                })
                setLogoPreview(null)
            }

        } catch (err) {
            console.error("Submission failed:", err)
            setSubmitStatus('error')
            alert("Error: " + (err.shortMessage || err.message || "Submission failed"))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
            {/* Dark Mode Toggle */}
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                {darkMode ? '☀️' : '🌙'}
            </button>

            <header className="header">
                <div className="container header-content">
                    <div className="logo-container">
                        <Link to="/">
                            <img src="/Baseappslogo3.png" alt="BaseApps" className="logo" />
                        </Link>
                        <h1 className="logo-text">BaseApps</h1>
                    </div>
                    <ConnectWallet />
                </div>
            </header>

            <main className="container add-dapp-container">
                <div className="form-card">
                    <h1 className="form-title">Submit your Dapp</h1>
                    <p className="form-subtitle">Get listed on the BaseApps directory</p>

                    <form onSubmit={handleSubmit} className="add-dapp-form">

                        {/* Name */}
                        <div className="form-group">
                            <label>Dapp Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g. Aerodrome Finance"
                                className={errors.name ? 'error' : ''}
                            />
                            <div className="field-info">
                                {errors.name ? <span className="error-text">{errors.name}</span> : <span></span>}
                                <span className="char-count">{formData.name.length}/25</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label>Description <span className="required">*</span></label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Short description of your dapp..."
                                rows="3"
                                className={errors.description ? 'error' : ''}
                            />
                            <div className="field-info">
                                {errors.description ? <span className="error-text">{errors.description}</span> : <span></span>}
                                <span className="char-count">{formData.description.length}/200</span>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="form-group">
                            <label>Category <span className="required">*</span></label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className={errors.category ? 'error' : ''}
                            >
                                <option value="">Select a Category</option>
                                {Object.keys(categories)
                                    .filter(cat => cat !== 'Other') // Filter out "Other" if it comes from API
                                    .map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="Other">Other</option>
                            </select>
                            {errors.category && <p className="error-text">{errors.category}</p>}
                        </div>

                        {/* Sub-Category (Dynamic) */}
                        {formData.category && formData.category !== 'Other' && categories[formData.category]?.length > 0 && (
                            <div className="form-group">
                                <label>Sub-Category <span className="required">*</span></label>
                                <select
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleInputChange}
                                    className={errors.subcategory ? 'error' : ''}
                                >
                                    <option value="">Select a Sub-Category</option>
                                    {categories[formData.category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    <option value="Other">Other</option>
                                </select>
                                {errors.subcategory && <p className="error-text">{errors.subcategory}</p>}
                            </div>
                        )}

                        {/* Custom Category Input - Shows if Main OR Sub is 'Other' */}
                        {(formData.category === 'Other' || formData.subcategory === 'Other') && (
                            <div className="form-group">
                                <label>
                                    {formData.category === 'Other' ? 'Specify Category' : 'Specify Sub-Category'}
                                    <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="customCategory"
                                    value={formData.customCategory}
                                    onChange={handleInputChange}
                                    placeholder={formData.category === 'Other' ? "e.g. Analytics" : "e.g. Yield Aggregator"}
                                    className={errors.customCategory ? 'error' : ''}
                                />
                                {errors.customCategory && <p className="error-text">{errors.customCategory}</p>}
                            </div>
                        )}

                        {/* Website URL */}
                        <div className="form-group">
                            <label>Website URL <span className="required">*</span></label>
                            <input
                                type="url"
                                name="websiteUrl"
                                value={formData.websiteUrl}
                                onChange={handleInputChange}
                                placeholder="https://yourdapp.com"
                                className={errors.websiteUrl ? 'error' : ''}
                            />
                            {errors.websiteUrl && <p className="error-text">{errors.websiteUrl}</p>}
                        </div>

                        {/* Logo Upload */}
                        <div className="form-group">
                            <label>Logo (Max 5MB) <span className="required">*</span></label>
                            <div className="file-upload-wrapper">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    id="logo-upload"
                                    hidden
                                />
                                <label htmlFor="logo-upload" className="file-upload-btn">
                                    {formData.logo ? 'Change Logo' : 'Upload Logo'}
                                </label>
                                <span className="file-name">{formData.logo ? formData.logo.name : 'No file chosen'}</span>
                            </div>
                            {errors.logo && <p className="error-text">{errors.logo}</p>}

                            {/* Preview */}
                            {logoPreview && (
                                <div className="logo-preview-container">
                                    <img src={logoPreview} alt="Preview" className="logo-preview" />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={isSubmitting}
                            style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
                        >
                            {isSubmitting ? 'Processing Payment...' : `submit (${dynamicFee} ETH)`}
                        </button>

                        {submitStatus === 'success' && (
                            <div className="success-message" style={{ marginTop: '1rem', color: '#4caf50', textAlign: 'center' }}>
                                ✅ Dapp Submitted Successfully! Pending Review.
                            </div>
                        )}

                    </form>
                </div>
            </main>
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
        </div>
    )
}

export default AddDapps
