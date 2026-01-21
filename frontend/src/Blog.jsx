import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import './App.css';
import './Blog.css';

function Blog() {
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        // Force dark mode
        document.body.classList.add('dark-mode');
        const savedDarkMode = localStorage.getItem('darkMode');
        const shouldBeDark = savedDarkMode === null ? true : savedDarkMode === 'true';
        setDarkMode(shouldBeDark);
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('darkMode', newDarkMode);
        document.body.classList.toggle('dark-mode', newDarkMode);
    };

    // Sample blog posts
    const blogPosts = [
        {
            id: 1,
            title: "Welcome to BaseApps Blog",
            excerpt: "Discover the latest updates, insights, and stories from the Base ecosystem. We're here to share news, tutorials, and community highlights.",
            date: "January 21, 2026",
            author: "BaseApps Team",
            category: "Announcement",
            image: "/Baseappslogo3.png",
            featured: true
        },
        {
            id: 2,
            title: "Getting Started with Base Network",
            excerpt: "Learn how to connect your wallet, bridge assets, and start exploring the fastest-growing Layer 2 ecosystem on Ethereum.",
            date: "January 20, 2026",
            author: "Community",
            category: "Tutorial",
            featured: false
        },
        {
            id: 3,
            title: "Top DeFi Apps on Base",
            excerpt: "Explore the most popular decentralized finance applications building on Base, from DEXs to lending protocols.",
            date: "January 18, 2026",
            author: "BaseApps Team",
            category: "Ecosystem",
            featured: false
        }
    ];

    return (
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
            {/* Dark Mode Toggle */}
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                {darkMode ? '☀️' : '🌙'}
            </button>

            <Header />

            {/* Blog Hero */}
            <section className="blog-hero">
                <div className="container">
                    <h1 className="blog-title">BaseApps Blog</h1>
                    <p className="blog-subtitle">
                        News, updates, and insights from the Base ecosystem
                    </p>
                </div>
            </section>

            {/* Blog Content */}
            <main className="blog-main">
                <div className="container">
                    {/* Featured Post */}
                    {blogPosts.filter(post => post.featured).map(post => (
                        <article key={post.id} className="featured-post">
                            <div className="featured-post-content">
                                <span className="post-category">{post.category}</span>
                                <h2 className="featured-post-title">{post.title}</h2>
                                <p className="featured-post-excerpt">{post.excerpt}</p>
                                <div className="post-meta">
                                    <span className="post-author">{post.author}</span>
                                    <span className="post-date">{post.date}</span>
                                </div>
                                <button className="read-more-btn">Read More →</button>
                            </div>
                            {post.image && (
                                <div className="featured-post-image">
                                    <img src={post.image} alt={post.title} />
                                </div>
                            )}
                        </article>
                    ))}

                    {/* All Posts Grid */}
                    <div className="blog-posts-grid">
                        {blogPosts.filter(post => !post.featured).map(post => (
                            <article key={post.id} className="blog-post-card">
                                <span className="post-category">{post.category}</span>
                                <h3 className="post-title">{post.title}</h3>
                                <p className="post-excerpt">{post.excerpt}</p>
                                <div className="post-meta">
                                    <span className="post-author">{post.author}</span>
                                    <span className="post-date">{post.date}</span>
                                </div>
                                <button className="read-more-btn">Read More →</button>
                            </article>
                        ))}
                    </div>

                    {/* Coming Soon Message */}
                    <div className="blog-coming-soon">
                        <h3>More content coming soon!</h3>
                        <p>We're working on bringing you the latest news and insights from the Base ecosystem.</p>
                    </div>
                </div>
            </main>

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
        </div>
    );
}

export default Blog;
