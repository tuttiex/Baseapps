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
        // No cleanup needed - dark mode is always on
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
                const fetchedUser = response.data.user;
                // Fix avatar URL if needed
                if (fetchedUser.avatarUrl && !fetchedUser.avatarUrl.startsWith('http')) {
                    fetchedUser.avatarUrl = `https://baseapps-production.up.railway.app${fetchedUser.avatarUrl}`;
                }
                setProfileUser(fetchedUser);
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
                            <VoteIcon size={20} /> Recent Votes ({profileUser?.votes?.length || 0})
                        </h3>
                        {profileUser?.votes?.length > 0 ? (
                            <div className="favorites-grid">
                                {profileUser.votes.map((vote, idx) => (
                                    <div key={idx} className="favorite-item">
                                        {vote.dappLogo && (
                                            <img src={vote.dappLogo} alt="" style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 8, objectFit: 'cover' }} />
                                        )}
                                        <span className="favorite-name">{vote.dappName || 'Unknown Dapp'}</span>
                                        <span className="vote-badge" style={{
                                            marginLeft: 'auto',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: vote.value > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                            color: vote.value > 0 ? '#4caf50' : '#f44336',
                                            fontSize: '0.8rem',
                                            border: `1px solid ${vote.value > 0 ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`
                                        }}>
                                            {vote.value > 0 ? 'Upvoted' : 'Downvoted'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="votes-placeholder">
                                <p>No voting history yet</p>
                            </div>
                        )}
                    </div>

                    {/* Submissions Section - Show verified submissions */}
                    <div className="profile-section">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DocumentIcon size={20} /> Submitted Dapps ({profileUser?.submittedDapps?.length || 0})
                        </h3>
                        {profileUser?.submittedDapps?.length > 0 ? (
                            <div className="favorites-grid">
                                {profileUser.submittedDapps.map((dapp, idx) => (
                                    <div key={idx} className="favorite-item">
                                        {dapp.logo && (
                                            <img src={dapp.logo} alt="" style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 8, objectFit: 'cover' }} />
                                        )}
                                        <span className="favorite-name">{dapp.name}</span>
                                        <a href={dapp.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                                color: '#2196f3',
                                                fontSize: '0.8rem',
                                                border: '1px solid rgba(33, 150, 243, 0.3)'
                                            }}>
                                                Live
                                            </span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="submissions-placeholder">
                                <p>No submitted dapps found</p>
                                <small>Dapps submitted by this user will appear here</small>
                            </div>
                        )}
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
