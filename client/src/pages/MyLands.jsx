import React, { useEffect, useState } from 'react';
import LandCard from '../components/LandCard';
import { API_BASE_URL } from '../config';

const MyLands = ({ user }) => {
    const [myLands, setMyLands] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            fetchMyLands();
        }
    }, [user]);

    const fetchMyLands = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/my-lands/${user.id}`);
            const data = await res.json();
            setMyLands(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleStatus = async (landId, currentStatus) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/${landId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isForSale: currentStatus }),
            });
            if (res.ok) {
                setMessage(`Land is now ${currentStatus ? 'for sale' : 'not for sale'}`);
                fetchMyLands();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Error updating land status.');
        }
    };

    // Wrapper to match LandCard's expected signature if needed, 
    // but LandCard calls onBuy(id, status) for owners, so handleToggleStatus matches signature (id, status).

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                My Lands
            </h2>

            {message && (
                <div className="mb-6 bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-100 px-4 py-3 rounded relative animate-pulse">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myLands.map(land => (
                    <LandCard key={land.id} land={land} user={user} onToggleStatus={handleToggleStatus} />
                ))}
            </div>
            {myLands.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-gray-800 bg-opacity-30 rounded-lg border border-gray-700 border-dashed">
                    <p className="text-xl">You haven't registered any lands yet.</p>
                </div>
            )}
        </div>
    );
};

export default MyLands;
