import { useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { UserAvatar } from './UserAvatar';
import { LoadingIcon, CameraIcon, AlertIcon } from './Icons';

export function EditProfile({ isOpen, onClose }) {
    const { user, updateProfile, uploadAvatar } = useUser();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        bio: user?.bio || ''
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log('Selected file:', file.name, file.type, file.size);

        // Validate file
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be less than 2MB');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            console.log('Starting upload...');
            const result = await uploadAvatar(file);
            console.log('Upload successful:', result);
        } catch (err) {
            console.error('Upload error:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.error || err.message || 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await updateProfile(formData);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose} />
            <div className="modal edit-profile-modal">
                <div className="modal-header">
                    <h2>Edit Profile</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="edit-profile-form">
                    <div className="form-group avatar-upload">
                        <label>Profile Picture</label>
                        <div className="avatar-upload-container">
                            <UserAvatar user={user} size="large" onClick={handleAvatarClick} />
                            <button
                                type="button"
                                className="avatar-upload-btn"
                                onClick={handleAvatarClick}
                                disabled={uploading}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                            >
                                {uploading ? (
                                    <>
                                        <LoadingIcon size={16} />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <CameraIcon size={16} />
                                        <span>Change</span>
                                    </>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <p className="form-hint">JPG, PNG, or GIF. Max 2MB.</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username (optional)"
                            minLength={3}
                            maxLength={50}
                            pattern="[a-zA-Z0-9_-]+"
                            title="Letters, numbers, hyphens, and underscores only"
                        />
                        <p className="form-hint">3-50 characters. Letters, numbers, - and _ only.</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bio">Bio</label>
                        <textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell us about yourself (optional)"
                            maxLength={500}
                            rows={4}
                        />
                        <p className="form-hint">{formData.bio.length}/500 characters</p>
                    </div>

                    {error && (
                        <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertIcon size={16} /> {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || uploading}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
