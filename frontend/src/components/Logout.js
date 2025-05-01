import React from 'react';

// frontend/src/components/Logout.js
export default function Logout({ onLogout }) {
    const handleClick = () => {
      if (onLogout) {
        onLogout();
      } else {
        console.warn("onLogout prop is not provided to Logout component.");
      }
    };
  
    return (
      <button onClick={handleClick} style={{ marginTop: "1rem" }}>
        Logout
      </button>
    );
  }
  