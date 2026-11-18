import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const SAMPLE_PHOTO_URL = '/uploads/QmYThhMmY0ZWQ0OWQ5YmJkZjk1NGVmMmYzMjllZjFhMmI5.jpeg';

const LandImage = ({ photoUrl, alt = 'Land photograph', className = '' }) => {
    const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);
    const [samplePhotoFailed, setSamplePhotoFailed] = useState(false);
    const failed = photoUrl && failedPhotoUrl === photoUrl;

    if ((!photoUrl || failed) && !samplePhotoFailed) {
        const sampleUrl = `${API_BASE_URL.replace(/\/$/, '')}/${SAMPLE_PHOTO_URL.replace(/^\/+/, '')}`;
        return (
            <div className={`relative ${className}`}>
                <img
                    src={sampleUrl}
                    alt={`${alt} (sample image; original unavailable)`}
                    className="h-full w-full object-cover"
                    onError={() => setSamplePhotoFailed(true)}
                />
                <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                    Sample photo — original unavailable
                </span>
            </div>
        );
    }

    if (!photoUrl || failed) {
        return <div role="img" aria-label="Land photograph unavailable" className={`flex items-center justify-center bg-slate-800 text-slate-400 text-sm ${className}`}>Image unavailable</div>;
    }

    const imageUrl = /^https?:\/\//i.test(photoUrl)
        ? photoUrl
        : `${API_BASE_URL.replace(/\/$/, '')}/${photoUrl.replace(/^\/+/, '')}`;

    return (
        <img
            src={imageUrl}
            alt={alt}
            className={className}
            onError={() => setFailedPhotoUrl(photoUrl)}
        />
    );
};

export default LandImage;