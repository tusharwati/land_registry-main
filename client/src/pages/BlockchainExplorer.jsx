import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const BlockchainExplorer = ({ user }) => {
    const [data, setData] = useState([]);
    const [integrityReports, setIntegrityReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [evmStatus, setEvmStatus] = useState(null);

    useEffect(() => {
        fetchBlockchainData();
        fetchIntegrityData();
        fetchEvmStatus();
    }, [user]);

    const fetchEvmStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/evm/status`);
            if (!response.ok) throw new Error('Unable to read EVM status');
            setEvmStatus(await response.json());
        } catch (err) {
            setEvmStatus({ evmConnected: false, error: err.message });
        }
    };

    const fetchIntegrityData = async () => {
        try {
            // Only run integrity check if finding global data or if user owns land (for now just run it)
            if (!user) return;

            const res = await fetch(`${API_BASE_URL}/api/blockchain/integrity?userId=${user.id}`);
            if (res.ok) {
                const result = await res.json();
                // Filter for user if needed, but for "Explorer" show all
                setIntegrityReports(result);
            }
        } catch (err) {
            console.error("Integrity check failed:", err);
        }
    };

    const fetchBlockchainData = async () => {
        try {
            let url = `${API_BASE_URL}/api/blockchain`;
            if (user) {
                url += `?userId=${user.id}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch blockchain data');
            const result = await response.json();
            setData(result);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading blockchain data...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">
                    {user ? 'My Land History' : 'Blockchain Explorer'}
                </h1>
                <button
                    onClick={() => {
                        fetchBlockchainData();
                        fetchIntegrityData();
                        fetchEvmStatus();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Refresh
                </button>
            </div>

            <section className="mb-8 rounded-lg border border-slate-700 bg-slate-800 p-5" aria-label="Local EVM status">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-white">Local EVM node</h2>
                    <span className={`rounded-full px-3 py-1 text-sm ${evmStatus?.evmConnected
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-amber-500/20 text-amber-300'
                        }`}>
                        {evmStatus?.evmConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="text-slate-400">JSON-RPC endpoint</p><p className="break-all font-mono text-white">{evmStatus?.rpcUrl || 'Not configured'}</p></div>
                    <div><p className="text-slate-400">Chain ID</p><p className="text-white">{evmStatus?.chainId || '—'}</p></div>
                    <div><p className="text-slate-400">Latest EVM block</p><p className="text-white">{evmStatus?.currentBlock ?? '—'}</p></div>
                    <div><p className="text-slate-400">LandRegistry contract</p><p className="break-all font-mono text-white">{evmStatus?.contractAddress || 'Not deployed'}</p></div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                    Contract state is held by the local Hardhat EVM node. This development node is in-memory and resets when it stops.
                    The separate JavaScript audit ledger is stored in the MySQL <span className="font-mono">blocks</span> table;
                    land photos/documents are files in the server uploads directory, not EVM storage.
                </p>
                {evmStatus?.error && <p className="mt-2 text-sm text-amber-300">{evmStatus.error}</p>}
            </section>

            {integrityReports.length > 0 && (
                <div className="mb-8 space-y-4">
                    {integrityReports.map((report, idx) => (
                        <div key={idx} className="bg-red-500/10 border border-red-500 p-4 rounded-lg text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">⚠️</span>
                                <h3 className="font-bold text-lg text-red-400">SECURITY ALERT: TAMPER DETECTED</h3>
                            </div>
                            <p className="mb-2">
                                The database record for <span className="font-bold text-white">{report.location}</span>
                                does not match the immutable blockchain history.
                            </p>
                            <div className="bg-black/50 p-3 rounded font-mono text-sm">
                                {report.discrepancies.map((d, i) => (
                                    <div key={i} className="flex justify-between border-b border-red-500/30 last:border-0 py-1">
                                        <span className="text-gray-400">{d.field.toUpperCase()}:</span>
                                        <span>
                                            <span className="text-green-400">Chain: {d.chainValue}</span>
                                            <span className="mx-2">vs</span>
                                            <span className="text-red-400">DB: {d.dbValue}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to overwrite the database record with the blockchain data? This cannot be undone.")) return;
                                    try {
                                        const res = await fetch(`${API_BASE_URL}/api/lands/revert`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ landId: report.landId })
                                        });
                                        if (res.ok) {
                                            alert("Restoration Successful! The Immutable Blockchain has healed the database.");
                                            fetchIntegrityData(); // Refresh alerts
                                            fetchBlockchainData(); // Refresh blocks
                                        } else {
                                            alert("Restoration failed.");
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm shadow inline-flex items-center gap-2"
                            >
                                🔄 RESTORE FROM BLOCKCHAIN
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {data.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <p className="text-xl">No blockchain events found for your lands.</p>
                    <p className="text-sm mt-2">Register a land or make a transaction to see it here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {data.map((event, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                            <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${event.type === 'Registration' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {event.type}
                                        </span>
                                        <span className="text-gray-400 text-sm">{event.timestamp}</span>
                                    </div>
                                    <h2 className="text-xl font-semibold text-white mt-2">
                                        {event.type === 'Registration' ? `Registered Land` : `Ownership Transferred`}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs uppercase tracking-wider">Block #{event.blockNumber}</p>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Tx Hash</p>
                                    <p className="text-gray-300 font-mono text-xs truncate w-32" title={event.transactionHash}>{event.transactionHash}</p>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {event.type === 'Registration' ? (
                                        <>
                                            <div>
                                                <p className="text-gray-500 text-xs">Location</p>
                                                <p className="text-white text-sm">{event.details.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Price</p>
                                                <p className="text-white text-sm">₹{event.details.price}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Area</p>
                                                <p className="text-white text-sm">{event.details.area} sq ft</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Owner</p>
                                                <p className="text-blue-400 text-sm font-medium">{event.details.ownerName}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="text-gray-500 text-xs">Location</p>
                                                <p className="text-white text-sm">{event.details.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Price</p>
                                                <p className="text-white text-sm">₹{event.details.price}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Seller (From)</p>
                                                <p className="text-red-400 text-sm font-medium">{event.details.oldOwnerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Buyer (To)</p>
                                                <p className="text-green-400 text-sm font-medium">{event.details.newOwnerName}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BlockchainExplorer;
