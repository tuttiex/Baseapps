import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { NewsCard } from './NewsCard';
import './NewsCarousel.css';

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://baseapps-production.up.railway.app/api';

export function NewsCarousel() {
    const [latestPosts, setLatestPosts] = useState([]);
    const carouselRef = useRef(null);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/blog`);
                if (response.data.success) {
                    setLatestPosts(response.data.posts.slice(0, 5));
                }
            } catch (error) {
                console.error('Error fetching news:', error);
            }
        };
        fetchPosts();
    }, []);

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
