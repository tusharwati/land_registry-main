import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import LandImage from '../components/LandImage';

const LandDetails = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [land, setLand] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchLandDetails();
    }, [id]);

    const fetchLandDetails = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/${id}`);
            if (res.ok) {
                const data = await res.json();
                setLand(data);
            } else {
                setMessage('Land not found');
            }
        } catch (err) {
            console.error(err);
            setMessage('Error fetching land details');
        }
    };

    const handleBuy = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landId: land.id, buyerId: user.id }),
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

    const handleToggleStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/${land.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isForSale: !land.isForSale }),
            });
            if (res.ok) {
                setMessage(`Land is now ${!land.isForSale ? 'for sale' : 'not for sale'}`);
                fetchLandDetails();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Error updating land status.');
        }
    };

    if (!land) {
        return <div className="text-center text-white mt-10">{message || 'Loading...'}</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-4">
                &larr; Back
            </button>

            {message && (
                <div className="mb-6 bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-100 px-4 py-3 rounded relative animate-pulse">
                    {message}
                </div>
            )}

            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-2">
                {/* Image Section */}
                <div className="h-64 lg:h-auto relative">
                    <LandImage
                        photoUrl={land.photoUrl}
                        alt={`Land at ${land.location}`}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded text-sm font-bold shadow-md ${land.isForSale
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                            }`}>
                            {land.isForSale ? 'For Sale' : 'Not For Sale'}
                        </span>
                    </div>
                </div>

                {/* Details Section */}
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-white mb-2">{land.location}</h2>
                    <p className="text-gray-400 mb-6">{land.district}, {land.state} - {land.pinCode}</p>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-gray-500 text-sm">Price</p>
                            <p className="text-2xl font-bold text-green-400">₹{land.price.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Area</p>
                            <p className="text-xl text-white">{land.area} sq.ft</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Market Value</p>
                            <p className="text-lg text-gray-300">₹{land.marketValue ? land.marketValue.toLocaleString() : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Survey Number</p>
                            <p className="text-lg text-gray-300">{land.surveyNumber || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-6 mb-8">
                        <h3 className="text-xl font-bold text-white mb-4">Owner Details</h3>
                        <div className="space-y-2">
                            <p className="text-gray-300"><span className="text-gray-500 w-24 inline-block">Name:</span> {land.ownerName}</p>
                            <p className="text-gray-300"><span className="text-gray-500 w-24 inline-block">Email:</span> {land.ownerEmail}</p>
                            <p className="text-gray-300"><span className="text-gray-500 w-24 inline-block">Phone:</span> {land.ownerPhone || 'N/A'}</p>
                        </div>
                    </div>

                    {land.documentUrl && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white mb-4">Documents</h3>
                            <a
                                href={`${API_BASE_URL}${land.documentUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline"
                            >
                                View Land Document
                            </a>
                        </div>
                    )}

                    <div className="mt-auto">
                        {user && user.id === land.ownerId ? (
                            <button
                                onClick={handleToggleStatus}
                                className={`w-full py-3 rounded-lg font-bold transition duration-200 ${land.isForSale
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                            >
                                {land.isForSale ? 'Remove from Sale' : 'Make Available for Sale'}
                            </button>
                        ) : (
                            <button
                                onClick={handleBuy}
                                disabled={!land.isForSale}
                                className={`w-full py-3 rounded-lg font-bold transition duration-200 ${land.isForSale
                                    ? 'btn-primary'
                                    : 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    }`}
                            >
                                {land.isForSale ? 'Request to Buy' : 'Not Available for Sale'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LandDetails;
