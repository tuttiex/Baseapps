import { UserAvatar } from './UserAvatar';

export function ProfileCard({ user, showActions = false, onEdit }) {
    if (!user) {
        return <div className="profile-card-loading">Loading profile...</div>;
    }

    const displayName = user.username ||
        `${user.walletAddress?.slice(0, 6)}...${user.walletAddress?.slice(-4)}`;

    const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="profile-card">
            <div className="profile-card-header">
                <UserAvatar user={user} size="large" />
                <div className="profile-card-info">
                    <h2 className="profile-card-name">{displayName}</h2>
                    <p className="profile-card-address">
                        {user.walletAddress?.slice(0, 10)}...{user.walletAddress?.slice(-8)}
                    </p>
                    <p className="profile-card-joined">Joined {joinedDate}</p>
                </div>
                {showActions && onEdit && (
                    <button className="profile-edit-btn" onClick={onEdit}>
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {user.bio && (
                <div className="profile-card-bio">
                    <p>{user.bio}</p>
                </div>
            )}

            <div className="profile-card-stats">
                <div className="profile-stat">
                    <span className="profile-stat-value">0</span>
                    <span className="profile-stat-label">Votes</span>
                </div>
                <div className="profile-stat">
                    <span className="profile-stat-value">0</span>
                    <span className="profile-stat-label">Submissions</span>
                </div>
                <div className="profile-stat">
                    <span className="profile-stat-value">0</span>
                    <span className="profile-stat-label">Favorites</span>
                </div>
            </div>
        </div>
    );
}
