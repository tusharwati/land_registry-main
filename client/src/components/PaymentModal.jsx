import React, { useState } from 'react';

const PaymentModal = ({ isOpen, onClose, onPay, amount }) => {
    const [loading, setLoading] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
        name: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate payment processing delay
        setTimeout(() => {
            setLoading(false);
            onPay();
            onClose();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Secure Payment</h3>
                    <p className="text-slate-400 mt-2">Total Amount: <span className="text-green-400 font-bold">₹{amount.toLocaleString()}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Card Number</label>
                        <input
                            type="text"
                            name="cardNumber"
                            placeholder="0000 0000 0000 0000"
                            className="input-field"
                            required
                            maxLength="19"
                            value={paymentDetails.cardNumber}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Expiry Date</label>
                            <input
                                type="text"
                                name="expiry"
                                placeholder="MM/YY"
                                className="input-field"
                                required
                                maxLength="5"
                                value={paymentDetails.expiry}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">CVV</label>
                            <input
                                type="password"
                                name="cvv"
                                placeholder="123"
                                className="input-field"
                                required
                                maxLength="3"
                                value={paymentDetails.cvv}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Cardholder Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="John Doe"
                            className="input-field"
                            required
                            value={paymentDetails.name}
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary mt-4 flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'Pay Now'
                        )}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Encrypted & Secure
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
