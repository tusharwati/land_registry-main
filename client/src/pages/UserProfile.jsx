import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/${id}/profile`);
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                } else {
                    setMessage('User not found');
                }
            } catch (err) {
                setMessage('Error fetching profile');
            }
        };
        fetchProfile();
    }, [id]);

    if (!profile) {
        return <div className="text-center text-white mt-10">{message || 'Loading...'}</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-4">
                &larr; Back
            </button>

            <div className="card max-w-2xl mx-auto">
                <div className="flex items-center justify-center mb-8">
                    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-4xl font-bold text-white">
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-white mb-8">{profile.name}</h2>

                <div className="space-y-6">
                    <div className="flex items-center border-b border-gray-700 pb-4">
                        <span className="text-gray-400 w-32">Email</span>
                        <span className="text-white text-lg">{profile.email}</span>
                    </div>
                    <div className="flex items-center border-b border-gray-700 pb-4">
                        <span className="text-gray-400 w-32">Phone</span>
                        <span className="text-white text-lg">{profile.phoneNumber || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
