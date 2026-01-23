import { Link } from 'react-router-dom';
import './NewsCard.css';

export function NewsCard({ post }) {
    return (
        <Link
            to={`/blog#${post.slug}`}
            className="news-card"
            style={{ textDecoration: 'none' }}
        >
            {/* Featured Image */}
            <div className="news-card-image">
                <img
                    src={post.image || '/Baseappslogo3.png'}
                    alt={post.title}
                    onError={(e) => {
                        e.target.src = '/Baseappslogo3.png';
                    }}
                />
            </div>

            {/* Content */}
            <div className="news-card-content">
                <h3 className="news-card-title">{post.title}</h3>
                <p className="news-card-excerpt">{post.excerpt}</p>
            </div>
        </Link>
    );
}
