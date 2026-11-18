import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const Auth = ({ onLogin, onClose }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', type: 'USER' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
        const url = `${API_BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Something went wrong');
            onLogin(data);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <h2 className="text-xl font-bold mb-4">{isRegistering ? 'Register' : 'Login'}</h2>
                {error && <p className="text-red-500 mb-2">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    {isRegistering && (
                        <>
                            <input
                                type="text"
                                name="name"
                                placeholder="Name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                                required
                            />
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                            >
                                <option value="USER">User (Buyer)</option>
                                <option value="OWNER">Land Owner</option>
                            </select>
                        </>
                    )}
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border p-2 rounded"
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border p-2 rounded"
                        required
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        {isRegistering ? 'Register' : 'Login'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-blue-600 hover:underline"
                    >
                        {isRegistering ? 'Login' : 'Register'}
                    </button>
                </p>
                <button onClick={onClose} className="mt-2 w-full text-gray-500 hover:text-gray-700">Close</button>
            </div>
        </div>
    );
};

export default Auth;
