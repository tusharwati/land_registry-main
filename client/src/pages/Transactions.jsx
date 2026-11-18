import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';
import { API_BASE_URL } from '../config';

const Transactions = ({ user }) => {
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/requests/${user.id}`);
            if (res.ok) {
                setIncomingRequests(await res.json());
            }
            const res2 = await fetch(`${API_BASE_URL}/api/buyer-requests/${user.id}`);
            if (res2.ok) {
                setOutgoingRequests(await res2.json());
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleApprove = async (requestId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            if (res.ok) {
                setMessage('Request approved. Waiting for payment.');
                fetchRequests();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Error approving request.');
        }
    };

    const initiatePayment = (request) => {
        setSelectedRequest(request);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = async () => {
        if (!selectedRequest) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/lands/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: selectedRequest.id }),
            });
            if (res.ok) {
                setMessage('Payment successful! Ownership transferred.');
                fetchRequests();
                setTimeout(() => setMessage(''), 3000);
            } else {
                const data = await res.json();
                setMessage(`Error: ${data.message}`);
            }
        } catch (err) {
            setMessage('Error processing payment.');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Transactions
            </h2>

            {message && (
                <div className="mb-6 bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-100 px-4 py-3 rounded relative animate-pulse">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Incoming Requests (For Sellers) */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                        Incoming Requests (Selling)
                    </h3>
                    <div className="space-y-4">
                        {incomingRequests.length === 0 ? (
                            <p className="text-gray-500">No incoming requests.</p>
                        ) : (
                            incomingRequests.map(req => (
                                <div key={req.id} className="card flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex flex-col">
                                                <p
                                                    className="font-bold text-white text-lg cursor-pointer hover:text-blue-400 transition-colors"
                                                    onClick={() => navigate(`/lands/${req.landId}`)}
                                                >
                                                    {req.land.location}
                                                </p>
                                                <p className="text-sm text-gray-400">Area: {req.land.area} sq ft</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-400">Buyer: <span className="text-blue-400">{req.buyer.name}</span></p>
                                                <button
                                                    onClick={() => navigate(`/user/${req.buyerId}`)}
                                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white transition-colors"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-400">Offer: <span className="text-green-400 font-bold">₹{req.land.price.toLocaleString()}</span></p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-yellow-500 bg-opacity-20 text-yellow-500' :
                                            req.status === 'WAITING_PAYMENT' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                                                'bg-green-500 bg-opacity-20 text-green-500'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    {req.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleApprove(req.id)}
                                            className="btn-primary w-full py-2 text-sm mt-2"
                                        >
                                            Approve Request
                                        </button>
                                    )}
                                    {req.status === 'WAITING_PAYMENT' && (
                                        <p className="text-sm text-blue-400 italic text-center">Waiting for buyer payment...</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Outgoing Requests (For Buyers) */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                        Outgoing Requests (Buying)
                    </h3>
                    <div className="space-y-4">
                        {outgoingRequests.length === 0 ? (
                            <p className="text-gray-500">No outgoing requests.</p>
                        ) : (
                            outgoingRequests.map(req => (
                                <div key={req.id} className="card flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex flex-col">
                                                <p
                                                    className="font-bold text-white text-lg cursor-pointer hover:text-blue-400 transition-colors"
                                                    onClick={() => navigate(`/lands/${req.landId}`)}
                                                >
                                                    {req.land.location}
                                                </p>
                                                <p className="text-sm text-gray-400">Area: {req.land.area} sq ft</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-400">Seller: <span className="text-blue-400">{req.seller ? req.seller.name : 'Unknown'}</span></p>
                                                <button
                                                    onClick={() => navigate(`/user/${req.sellerId}`)}
                                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white transition-colors"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-400">Price: <span className="text-green-400 font-bold">₹{req.land.price.toLocaleString()}</span></p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-yellow-500 bg-opacity-20 text-yellow-500' :
                                            req.status === 'WAITING_PAYMENT' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                                                'bg-green-500 bg-opacity-20 text-green-500'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    {req.status === 'WAITING_PAYMENT' && (
                                        <button
                                            onClick={() => initiatePayment(req)}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full transition duration-200 shadow-lg shadow-green-600/20"
                                        >
                                            Pay & Transfer Ownership
                                        </button>
                                    )}
                                    {req.status === 'PENDING' && (
                                        <p className="text-sm text-yellow-500 italic text-center">Waiting for owner approval...</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onPay={handlePaymentSuccess}
                amount={selectedRequest ? selectedRequest.land.price : 0}
            />
        </div >
    );
};

export default Transactions;
