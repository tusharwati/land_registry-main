import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandImage from './LandImage';

const LandCard = ({ land, user, onBuy, onToggleStatus }) => {
    const navigate = useNavigate();

    const handleCardClick = (e) => {
        // Prevent navigation if clicking on the button
        if (e.target.tagName === 'BUTTON') return;
        navigate(`/lands/${land.id}`);
    };

    return (
        <div
            onClick={handleCardClick}
            className="card group h-full flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10"
        >
            <div className="h-52 w-full mb-5 rounded-xl overflow-hidden relative">
                    <LandImage
                        photoUrl={land.photoUrl}
                        alt={`Land at ${land.location}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>

                    <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${land.isForSale
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-slate-800/60 text-slate-400 border-slate-600/30'
                            }`}>
                            {land.isForSale ? 'For Sale' : 'Not Listed'}
                        </span>
                    </div>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{land.location}</h3>
                    {land.district && land.state && (
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {land.district}, {land.state}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Area</p>
                        <p className="font-semibold text-slate-200">{land.area} <span className="text-xs text-slate-500">sq.ft</span></p>
                    </div>
                    <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Price</p>
                        <p className="font-bold text-emerald-400">₹{land.price.toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-sm border-t border-slate-800/50 pt-4">
                        <span className="text-slate-500">Owner</span>
                        <span className="font-medium text-indigo-300 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {land.ownerName || 'Unknown'}
                        </span>
                    </div>

                    {user && user.id === land.ownerId ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleStatus) {
                                    onToggleStatus(land.id, !land.isForSale);
                                }
                            }}
                            className={`w-full py-2.5 rounded-xl font-medium transition-all duration-200 ${land.isForSale
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                }`}
                        >
                            {land.isForSale ? 'Remove from Sale' : 'List for Sale'}
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onBuy(land.id);
                            }}
                            className="w-full btn-primary"
                        >
                            Request to Buy
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LandCard;
