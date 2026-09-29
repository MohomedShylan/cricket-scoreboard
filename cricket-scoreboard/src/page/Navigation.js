import React, { useState } from 'react';
import './Navigation.css';

export default function Navigation({ activeFormat, setActiveFormat }) {
  const [isOpen, setIsOpen] = useState(false);
  const formats = ['Test', 'ODI', 'T20', 'T10', '5 Over'];

  return (
    <nav className="nav-container">
      <div className="nav-brand">
        Ambanpola <span className="nav-brand-highlight">FoxEleven</span>
      </div>
      
      {/* Hamburger Icon for Mobile */}
      <div className="hamburger" onClick={() => setIsOpen(!isOpen)}>
        <span className={`bar ${isOpen ? 'open' : ''}`}></span>
        <span className={`bar ${isOpen ? 'open' : ''}`}></span>
        <span className={`bar ${isOpen ? 'open' : ''}`}></span>
      </div>
      
      {/* Navigation Links */}
      <div className={`nav-links ${isOpen ? 'open' : ''}`}>
        {formats.map((format) => (
          <a
            key={format}
            href={`#${format.replace(/\s+/g, '').toLowerCase()}`}
            className={`nav-item ${activeFormat === format ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault(); 
              setActiveFormat(format);
              setIsOpen(false); // Close menu on mobile after clicking a link
            }}
          >
            {format}
          </a>
        ))}
      </div>
    </nav>
  );
}