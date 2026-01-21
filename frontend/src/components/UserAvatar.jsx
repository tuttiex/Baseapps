import { useState } from 'react';

export function UserAvatar({ user, size = 'medium', onClick }) {
    const [imageError, setImageError] = useState(false);

    const sizeClasses = {
        small: 'user-avatar-small',
        medium: 'user-avatar-medium',
        large: 'user-avatar-large'
    };

    const className = `user-avatar ${sizeClasses[size]}`;

    // If avatar URL exists and hasn't errored
    if (user?.avatarUrl && !imageError) {
        return (
            <img
                src={user.avatarUrl}
                alt={user.username || 'User avatar'}
                className={className}
                onClick={onClick}
                onError={() => setImageError(true)}
                style={{ cursor: onClick ? 'pointer' : 'default' }}
            />
        );
    }

    // Fallback to generated avatar
    const initial = user?.username?.[0]?.toUpperCase() ||
        user?.walletAddress?.[2]?.toUpperCase() ||
        '?';

    // Generate color from wallet address for consistency
    const colorIndex = user?.walletAddress
        ? parseInt(user.walletAddress.slice(2, 8), 16) % 360
        : 200;

    return (
        <div
            className={`${className} user-avatar-generated`}
            onClick={onClick}
            style={{
                backgroundColor: `hsl(${colorIndex}, 70%, 60%)`,
                cursor: onClick ? 'pointer' : 'default'
            }}
        >
            {initial}
        </div>
    );
}
