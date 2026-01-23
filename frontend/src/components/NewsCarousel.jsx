import { useRef } from 'react';
import { NewsCard } from './NewsCard';
import { getLatestPosts } from '../data/blogPosts';
import './NewsCarousel.css';

export function NewsCarousel() {
    const carouselRef = useRef(null);
    const latestPosts = getLatestPosts(5); // Get latest 5 posts

    const scroll = (direction) => {
        const scrollAmount = 340; // card width (320) + gap (20)
        if (carouselRef.current) {
            carouselRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="news-carousel-wrapper">
            {/* Left Arrow */}
            <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scroll('left')}
                aria-label="Scroll left"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>

            {/* Carousel */}
            <div className="news-carousel" ref={carouselRef}>
                {latestPosts.map((post) => (
                    <NewsCard key={post.id} post={post} />
                ))}
            </div>

            {/* Right Arrow */}
            <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scroll('right')}
                aria-label="Scroll right"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>
        </div>
    );
}
