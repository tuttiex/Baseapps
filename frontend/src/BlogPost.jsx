import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Header } from './components/Header';
import './App.css';
import './Blog.css';

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://baseapps-production.up.railway.app/api';

function BlogPost() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Force dark mode always
        document.body.classList.add('dark-mode');
        fetchPost();
    }, [slug]);

    const fetchPost = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/blog/${slug}`);
            if (response.data.success) {
                setPost(response.data.post);
            } else {
                setError('Post not found');
            }
        } catch (error) {
            console.error('Error fetching blog post:', error);
            setError('Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="app dark-mode">
                <Header />
                <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center' }}>
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="app dark-mode">
                <Header />
                <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center' }}>
                    <h2>{error || 'Post not found'}</h2>
                    <br />
                    <Link to="/blog" className="back-btn">← Back to Blog</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="app dark-mode">
            <Header />

            <main className="blog-post-view">
                {/* Hero / Header Section */}
                <div className="post-header-section">
                    <div className="container">
                        <Link to="/blog" className="back-link">← Back to Blog</Link>
                        <span className="post-category-tag">{post.category}</span>
                        <h1 className="post-main-title">{post.title}</h1>
                        <div className="post-meta-detailed">
                            <span className="author">By {post.author}</span>
                            <span className="separator">•</span>
                            <span className="date">{post.date}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="container post-container">
                    {post.image && (
                        <div className="post-main-image">
                            <img src={post.image} alt={post.title} />
                        </div>
                    )}

                    <div className="post-content-body">
                        {/* Simple rendering for now - handling newlines as paragraphs */}
                        {post.content.split('\n').map((paragraph, index) => (
                            paragraph.trim() ? <p key={index}>{paragraph}</p> : <br key={index} />
                        ))}
                    </div>
                </div>
            </main>

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

export default BlogPost;
