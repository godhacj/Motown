import React, { useState } from 'react';
import '../styles/components/Payment-portal.css';

const PaymentPortal = ({ onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState('');

  const handlePayment = () => {
    if (selectedMethod) {
      alert(`Processing payment with ${selectedMethod}`);
      onClose();
    } else {
      alert('Please select a payment method');
    }
  };

  return (
    <div className="payment-portal">
      <div className="payment-portal__content">
        <button className="payment-portal__close" onClick={onClose}>×</button>
        <h1>Payment Portal</h1>
        <div className="payment-portal__methods">
          <h2>Select Payment Method</h2>
          <div className="payment-method">
            <input
              type="radio"
              id="bank"
              name="payment"
              value="Bank"
              onChange={(e) => setSelectedMethod(e.target.value)}
            />
            <label htmlFor="bank">Bank Transfer</label>
          </div>
          <div className="payment-method">
            <input
              type="radio"
              id="google-pay"
              name="payment"
              value="Google Pay"
              onChange={(e) => setSelectedMethod(e.target.value)}
            />
            <label htmlFor="google-pay">Google Pay</label>
          </div>
          <div className="payment-method">
            <input
              type="radio"
              id="mobile-money"
              name="payment"
              value="Mobile Money"
              onChange={(e) => setSelectedMethod(e.target.value)}
            />
            <label htmlFor="mobile-money">Mobile Money</label>
          </div>
        </div>
        <button className="payment-portal__pay-btn" onClick={handlePayment}>
          Pay Now
        </button>
      </div>
    </div>
  );
};

export default PaymentPortal;
