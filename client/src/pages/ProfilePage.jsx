import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const ProfilePage = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        password: user.password
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, type: user.type }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update profile');

            onUpdateUser(data);
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="card max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Edit Profile</h2>
                </div>

                {message && (
                    <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-100 px-4 py-3 rounded relative">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded relative">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="input-field mt-1"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="input-field mt-1"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300">Mobile Number</label>
                            <input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                required
                                className="input-field mt-1"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="text"
                                required
                                className="input-field mt-1"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button type="submit" className="btn-primary flex-1">
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
