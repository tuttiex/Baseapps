import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { ProfileCard } from '../components/ProfileCard';
import { EditProfile } from '../components/EditProfile';
import { LoadingIcon, ErrorIcon, StarIcon, VoteIcon, DocumentIcon } from '../components/Icons';
import { Header } from '../components/Header';
import '../Profile.css';

const API_URL = 'https://baseapps-production.up.railway.app/api';

export default function Profile() {
    const { address } = useParams();
    const { user: currentUser, isAuthenticated, getToken } = useUser();
    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [favorites, setFavorites] = useState([]);

    const isOwnProfile = currentUser?.walletAddress?.toLowerCase() === address?.toLowerCase();

    // Force dark mode on profile pages
    useEffect(() => {
        document.body.classList.add('dark-mode');

        // Cleanup: don't remove dark mode on unmount since Home page also defaults to dark
        return () => {
            // Only remove if user has explicitly chosen light mode
            const savedDarkMode = localStorage.getItem('darkMode');
            if (savedDarkMode === 'false') {
                document.body.classList.remove('dark-mode');
            }
        };
    }, []);

    useEffect(() => {
        fetchProfile();
        if (isOwnProfile && isAuthenticated) {
            fetchFavorites();
        }
    }, [address]);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/profile/${address}`);

            if (response.data.success) {
                setProfileUser(response.data.user);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.response?.data?.error || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await axios.get(`${API_URL}/profile/me/favorites`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setFavorites(response.data.favorites || []);
            }
        } catch (err) {
            console.error('Error fetching favorites:', err);
        }
    };

    if (loading) {
        return (
            <div className="profile-page dark-mode">
                <Header />
                <div className="container">
                    <div className="profile-loading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <LoadingIcon size={20} /> Loading profile...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-page dark-mode">
                <Header />
                <div className="container">
                    <div className="profile-error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ErrorIcon size={20} /> {error}
                        </div>
                        <br />
                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.href = '/'}
                            style={{ marginTop: '1rem' }}
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page dark-mode">
            <Header />
            <div className="container">
                <div className="profile-content">
                    <ProfileCard
                        user={profileUser}
                        showActions={isOwnProfile}
                        onEdit={() => setShowEditModal(true)}
                    />

                    {/* Favorites Section */}
                    {isOwnProfile && favorites.length > 0 && (
                        <div className="profile-section">
                            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <StarIcon size={20} /> Favorite Dapps
                            </h3>
                            <div className="favorites-grid">
                                {favorites.map((fav) => (
                                    <div key={fav.dappName} className="favorite-item">
                                        <span className="favorite-name">{fav.dappName}</span>
                                        <span className="favorite-date">
                                            {new Date(fav.addedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Voting History Section */}
                    <div className="profile-section">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <VoteIcon size={20} /> Recent Votes
                        </h3>
                        <div className="votes-placeholder">
                            <p>Voting history will appear here</p>
                            <small>This feature will be populated with on-chain voting data</small>
                        </div>
                    </div>

                    {/* Submissions Section */}
                    <div className="profile-section">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DocumentIcon size={20} /> Submitted Dapps
                        </h3>
                        <div className="submissions-placeholder">
                            <p>Submitted dapps will appear here</p>
                            <small>This feature will show dapps submitted by this user</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isOwnProfile && (
                <EditProfile
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        fetchProfile(); // Refresh profile after editing
                    }}
                />
            )}
        </div>
    );
}
