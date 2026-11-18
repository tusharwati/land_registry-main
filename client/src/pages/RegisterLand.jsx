import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const RegisterLand = ({ user }) => {
    const [formData, setFormData] = useState({
        location: '',
        area: '',
        price: '',
        surveyNumber: '',
        district: '',
        state: '',
        pinCode: '',
        marketValue: ''
    });
    const [files, setFiles] = useState({
        document: null,
        photo: null
    });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFiles({ ...files, [e.target.name]: e.target.files[0] });
    };

    const handleAddLand = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('ownerId', user.id);
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (files.document) data.append('document', files.document);
        if (files.photo) data.append('photo', files.photo);

        try {
            const res = await fetch(`${API_BASE_URL}/api/lands`, {
                method: 'POST',
                body: data, // No Content-Type header, let browser set it with boundary
            });
            if (res.ok) {
                setMessage('Land registered successfully!');
                setFormData({
                    location: '', area: '', price: '', surveyNumber: '',
                    district: '', state: '', pinCode: '', marketValue: ''
                });
                setFiles({ document: null, photo: null });
                setTimeout(() => {
                    setMessage('');
                    navigate('/my-lands');
                }, 1500);
            } else {
                const errorData = await res.json();
                setMessage(`Error: ${errorData.message}`);
            }
        } catch (err) {
            setMessage('Error registering land.');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Register New Land
            </h2>

            {message && (
                <div className="mb-6 bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-100 px-4 py-3 rounded relative animate-pulse">
                    {message}
                </div>
            )}

            <div className="card max-w-4xl mx-auto">
                <form onSubmit={handleAddLand} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-400 mb-2">Survey Number (Unique)</label>
                            <input
                                type="text" name="surveyNumber" placeholder="e.g. 123/A"
                                value={formData.surveyNumber} onChange={handleChange}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Location Address</label>
                            <input
                                type="text" name="location" placeholder="e.g. 123 Blockchain Ave"
                                value={formData.location} onChange={handleChange}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">District</label>
                            <input
                                type="text" name="district" placeholder="e.g. Crypto City"
                                value={formData.district} onChange={handleChange}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">State</label>
                            <input
                                type="text" name="state" placeholder="e.g. Ethereum State"
                                value={formData.state} onChange={handleChange}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Pin Code</label>
                            <input
                                type="text" name="pinCode" placeholder="e.g. 560001"
                                value={formData.pinCode} onChange={handleChange}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Land Area (sq.ft)</label>
                            <input
                                type="number" name="area" placeholder="e.g. 1000"
                                value={formData.area} onChange={handleChange}
                                onWheel={(e) => e.target.blur()}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Market Value (₹)</label>
                            <input
                                type="number" name="marketValue" placeholder="e.g. 45000"
                                value={formData.marketValue} onChange={handleChange}
                                onWheel={(e) => e.target.blur()}
                                className="input-field w-full" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Selling Price (₹)</label>
                            <input
                                type="number" name="price" placeholder="e.g. 50000"
                                value={formData.price} onChange={handleChange}
                                onWheel={(e) => e.target.blur()}
                                className="input-field w-full" required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-700 pt-6">
                        <div>
                            <label className="block text-gray-400 mb-2">Land Document (PDF/Image)</label>
                            <input
                                type="file" name="document" onChange={handleFileChange}
                                className="text-gray-300" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">Land Photo (Image)</label>
                            <input
                                type="file" name="photo" onChange={handleFileChange}
                                className="text-gray-300" required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full py-3 text-lg mt-6">
                        Register Land
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterLand;
