import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const Navbar = ({ user, onLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [notificationCount, setNotificationCount] = useState(0);

    const isActive = (path) => {
        return location.pathname === path ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/50';
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll every 10 seconds
            const interval = setInterval(fetchNotifications, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            // Fetch seller requests (PENDING)
            const sellerRes = await fetch(`${API_BASE_URL}/api/requests/${user.id}`);
            const sellerData = await sellerRes.json();
            const pendingSellerRequests = Array.isArray(sellerData) ? sellerData.filter(r => r.status === 'PENDING').length : 0;

            // Fetch buyer requests (WAITING_PAYMENT)
            const buyerRes = await fetch(`${API_BASE_URL}/api/buyer-requests/${user.id}`);
            const buyerData = await buyerRes.json();
            const pendingBuyerRequests = Array.isArray(buyerData) ? buyerData.filter(r => r.status === 'WAITING_PAYMENT').length : 0;

            setNotificationCount(pendingSellerRequests + pendingBuyerRequests);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    return (
        <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800">
            <div className="container mx-auto px-6 h-16 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                        <span className="text-white font-bold text-lg">B</span>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        BhoomiChain
                    </span>
                </Link>

                <div className="flex items-center gap-1">
                    {user && (
                        <>
                            <NavLink to="/marketplace" active={isActive('/marketplace')}>Marketplace</NavLink>
                            <NavLink to="/my-lands" active={isActive('/my-lands')}>My Lands</NavLink>
                            <NavLink to="/register-land" active={isActive('/register-land')}>Register</NavLink>
                            <NavLink to="/transactions" active={isActive('/transactions')}>Transactions</NavLink>
                            <NavLink to="/blockchain" active={isActive('/blockchain')}>Blockchain</NavLink>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4 pl-6 border-l border-slate-800">
                            {/* Notification Bell */}
                            <button
                                onClick={() => navigate('/transactions')}
                                className="relative p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                </svg>
                                {notificationCount > 0 && (
                                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg shadow-red-500/20 animate-pulse">
                                        {notificationCount}
                                    </span>
                                )}
                            </button>

                            <div className="flex flex-col items-end">
                                <span className="text-sm font-medium text-white">{user.name}</span>
                                <Link to="/profile" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                    View Profile
                                </Link>
                            </div>
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400">
                            Welcome Guest
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

const NavLink = ({ to, children, active }) => (
    <Link
        to={to}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active}`}
    >
        {children}
    </Link>
);

export default Navbar;
