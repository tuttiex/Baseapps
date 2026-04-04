import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Header } from './components/Header';
import { Calendar, Clock, User, ArrowRight, Sparkles, Search } from 'lucide-react';
import './App.css';
import './Blog.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://baseapps-backend.onrender.com/api');

function Blog() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        document.body.classList.add('dark-mode');
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/blog`);
            if (response.data.success) {
                setPosts(response.data.posts);
            }
        } catch (error) {
            console.error('Error fetching blog posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...new Set(posts.map(post => post.category))];
    
    const filteredPosts = posts.filter(post => {
        const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const featuredPost = posts.find(post => post.featured);
    const regularPosts = filteredPosts.filter(post => post.id !== featuredPost?.id);

    if (loading) {
        return (
            <div className="app dark-mode">
                <Header />
                <div className="blog-loading">
                    <div className="loading-spinner-modern">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                    </div>
                    <p>Loading stories...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app dark-mode">
            <Header />

            {/* Hero Section */}
            <section className="blog-hero-modern">
                <div className="hero-gradient-bg"></div>
                <div className="floating-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>
                <div className="container">
                    <div className="blog-hero-content">
                        <div className="hero-badge-modern">
                            <Sparkles size={16} className="badge-icon" />
                            <span>BaseApps Blog</span>
                        </div>
                        <h1 className="blog-hero-title-modern">
                            Stories from the
                            <span className="gradient-text-modern"> Base Ecosystem</span>
                        </h1>
                        <p className="blog-hero-subtitle-modern">
                            Discover news, tutorials, and insights from the fastest-growing 
                            Layer 2 network on Ethereum
                        </p>
                        
                        {/* Search Bar */}
                        <div className="blog-search-wrapper">
                            <Search size={20} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search articles..."
                                className="blog-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Category Filter */}
            <section className="category-filter-section">
                <div className="container">
                    <div className="category-scroll">
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category === 'all' ? 'All Stories' : category}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Post */}
            {featuredPost && selectedCategory === 'all' && !searchQuery && (
                <section className="featured-section-modern">
                    <div className="container">
                        <Link to={`/blog/${featuredPost.slug}`} className="featured-card-modern">
                            <div className="featured-image-wrapper-modern">
                                <img 
                                    src={featuredPost.image || '/Baseappslogo3.png'} 
                                    alt={featuredPost.title}
                                    className="featured-image-modern"
                                />
                                <div className="featured-overlay-modern"></div>
                                <div className="featured-shine"></div>
                                <span className="featured-badge-modern">
                                    <Sparkles size={14} />
                                    Featured
                                </span>
                            </div>
                            <div className="featured-content-modern">
                                <div className="featured-meta-modern">
                                    <span className="category-tag-modern">{featuredPost.category}</span>
                                    <span className="meta-dot"></span>
                                    <span className="meta-item-modern">
                                        <Calendar size={14} />
                                        {featuredPost.date}
                                    </span>
                                </div>
                                <h2 className="featured-title-modern">{featuredPost.title}</h2>
                                <p className="featured-excerpt-modern">{featuredPost.excerpt}</p>
                                <div className="featured-author-modern">
                                    <div className="author-avatar-modern">
                                        {featuredPost.author.charAt(0)}
                                    </div>
                                    <div className="author-info-modern">
                                        <span className="author-name-modern">{featuredPost.author}</span>
                                        <span className="read-time-modern">
                                            <Clock size={12} />
                                            {Math.ceil(featuredPost.content.length / 1000)} min read
                                        </span>
                                    </div>
                                </div>
                                <div className="read-more-link-modern">
                                    <span>Read Article</span>
                                    <ArrowRight size={18} className="arrow-icon" />
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>
            )}

            {/* Blog Grid */}
            <main className="blog-grid-modern">
                <div className="container">
                    <div className="section-header-modern">
                        <h2 className="section-title-modern">
                            {searchQuery ? `Search Results` : 
                             selectedCategory === 'all' ? 'Latest Stories' : 
                             `${selectedCategory} Stories`}
                        </h2>
                        <span className="post-count-modern">{regularPosts.length} {regularPosts.length === 1 ? 'article' : 'articles'}</span>
                    </div>

                    {regularPosts.length === 0 ? (
                        <div className="empty-state-modern">
                            <div className="empty-icon-modern">📚</div>
                            <h3>No stories found</h3>
                            <p>{searchQuery ? 'Try a different search term' : 'Check back soon for new content!'}</p>
                        </div>
                    ) : (
                        <div className="posts-grid-modern">
                            {regularPosts.map((post, index) => (
                                <Link 
                                    key={post.id} 
                                    to={`/blog/${post.slug}`}
                                    className="post-card-modern"
                                    style={{ '--delay': `${index * 0.1}s` }}
                                >
                                    <div className="post-card-image-modern">
                                        <img 
                                            src={post.image || '/Baseappslogo3.png'} 
                                            alt={post.title}
                                            loading="lazy"
                                        />
                                        <div className="post-card-overlay-modern"></div>
                                        <div className="post-card-glow"></div>
                                    </div>
                                    <div className="post-card-content-modern">
                                        <div className="post-card-meta-modern">
                                            <span className="post-category-modern">{post.category}</span>
                                            <span className="post-date-modern">{post.date}</span>
                                        </div>
                                        <h3 className="post-card-title-modern">{post.title}</h3>
                                        <p className="post-card-excerpt-modern">{post.excerpt}</p>
                                        <div className="post-card-footer-modern">
                                            <div className="post-author-small-modern">
                                                <div className="author-dot"></div>
                                                <span>{post.author}</span>
                                            </div>
                                            <span className="read-more-arrow-modern">
                                                <ArrowRight size={18} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Newsletter CTA */}
            <section className="newsletter-section-modern">
                <div className="container">
                    <div className="newsletter-card-modern">
                        <div className="newsletter-glow"></div>
                        <div className="newsletter-content-modern">
                            <h3>Stay in the loop</h3>
                            <p>Get the latest Base ecosystem updates delivered to your inbox</p>
                        </div>
                        <div className="newsletter-form-modern">
                            <input 
                                type="email" 
                                placeholder="your@email.com"
                                className="newsletter-input-modern"
                            />
                            <button className="newsletter-button-modern">
                                Subscribe
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
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
    );
}

export default Blog;
