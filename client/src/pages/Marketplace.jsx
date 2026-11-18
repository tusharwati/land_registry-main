import React, { useEffect, useState } from 'react';
import LandCard from '../components/LandCard';
import { API_BASE_URL } from '../config';

const Marketplace = ({ user }) => {
    const [lands, setLands] = useState([]);
    const [filter, setFilter] = useState('for-sale'); // 'all' or 'for-sale'
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLands();
    }, []);

    const fetchLands = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands`);
            const data = await res.json();
            setLands(data);
        } catch (err) {
            console.error('Error fetching lands:', err);
        }
    };

    const handleBuy = async (landId) => {
        if (!user) {
            setMessage('Please login to buy land.');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landId, buyerId: user.id }),
            });
            if (res.ok) {
                setMessage('Purchase request sent successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to send request.');
            }
        } catch (err) {
            setMessage('Error sending request.');
        }
    };

    const handleToggleStatus = async (landId, isForSale) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/${landId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isForSale }),
            });
            if (res.ok) {
                setMessage(`Land ${isForSale ? 'listed for sale' : 'removed from sale'} successfully!`);
                fetchLands();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to update status.');
            }
        } catch (err) {
            setMessage('Error updating status.');
        }
    };

    const filteredLands = lands.filter(land => {
        const matchesFilter = filter === 'all' || land.isForSale;
        const query = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' ||
            land.location.toLowerCase().includes(query) ||
            (land.district && land.district.toLowerCase().includes(query)) ||
            (land.state && land.state.toLowerCase().includes(query)) ||
            (land.surveyNumber && land.surveyNumber.toLowerCase().includes(query));

        return matchesFilter && matchesSearch;
    });

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    Marketplace
                </h2>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('for-sale')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'for-sale'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        Available for Sale
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        All Lands
                    </button>
                </div>
            </div>

            {/* Search Section */}
            <div className="mb-8">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by Location, City, State, or Survey No..."
                        className="input-field pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {message && (
                <div className="mb-6 bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-100 px-4 py-3 rounded relative animate-pulse">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredLands.map(land => (
                    <LandCard key={land.id} land={land} user={user} onBuy={handleBuy} onToggleStatus={handleToggleStatus} />
                ))}
            </div>

            {lands.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-xl">No lands available at the moment.</p>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
