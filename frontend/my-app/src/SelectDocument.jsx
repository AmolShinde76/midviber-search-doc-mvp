
import React, { useState, useEffect } from 'react';
import logoDark from './assets/AppLogoDarkTheme.png';
import logoLight from './assets/AppLogoLightTheme.png';

export default function SelectDocument({ onSelect, isDarkMode }) {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${apiBaseUrl}/journals`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch journals');
        return res.json();
      })
      .then(data => {
        setJournals(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="landing-page">
      <div style={{ textAlign: 'left', marginBottom: '0.5rem', marginLeft: '2rem' }}>
        <img src={isDarkMode ? logoDark : logoLight} alt="App Logo" style={{ maxWidth: '150px', height: 'auto' }} />
      </div>
      <h1 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '2.5rem' }}>MEDICAL INTERACTIONS MADE SIMPLE</h1>
      <p style={{ textAlign: 'center', fontSize: '1.2rem' }}>Ask questions to any document</p>
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading journals...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: 'red', marginTop: '2rem' }}>{error}</div>
      ) : (
        <div className="document-cards">
          {journals.map(doc => (
            <div key={doc.id} className="document-card">
              <img src={doc.img} alt={doc.title} />
              <h2>{doc.title}</h2>
              <p>{doc.desc}</p>
              <button onClick={() => onSelect(doc.id)}>SELECT</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
