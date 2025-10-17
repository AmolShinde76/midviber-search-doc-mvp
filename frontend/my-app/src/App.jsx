import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiSend } from 'react-icons/fi';
import './App.css';
import logoDark from './assets/AppLogoDarkTheme.png';
import logoLight from './assets/AppLogoLightTheme.png';

// AnswerText component to make page number clickable
function AnswerText({ text, onPageClick }) {
  const match = text.match(/Page no: (\d+)/);
  if (match) {
    const pageNum = parseInt(match[1], 10);
    return (
      <>
        {text.replace(/Page no: \d+/, '')}
        <span
          style={{ color: '#ff914d', cursor: 'pointer', fontWeight: 'bold', marginLeft: 8 }}
          onClick={() => onPageClick(pageNum)}
        >
          Page no: {pageNum}
        </span>
      </>
    );
  }
  return <span>{text}</span>;
}

// Typing Animation Component
const TypingAnimation = ({ text, speed = 8 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {displayedText}
    </ReactMarkdown>
  );
};

// Main Chat Component
const ChatApp = ({ selectedDoc, onPageClick, journals, onDocumentSelect, sidebarExpanded, toggleSidebar, toggleTheme }) => {
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAskedFirstQuestion, setHasAskedFirstQuestion] = useState(false);

  const resultsEndRef = useRef(null);

  const handleReferenceClick = (fileId) => {
    // Open the PDF in a new tab using the backend API
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${apiBaseUrl}/pdf/${fileId}`, '_blank');
  };

  // Auto-scroll to bottom when new results are added
  useEffect(() => {
    if (resultsEndRef.current) {
      resultsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results]);

  // Clear chat when document changes
  useEffect(() => {
    console.log(`Document changed to: ${selectedDoc} - clearing chat history`);
    setResults([]);
    setHasAskedFirstQuestion(false);
  }, [selectedDoc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const questionText = question.trim();
    setQuestion('');
    setHasAskedFirstQuestion(true);
    setIsLoading(true);
    setError('');

    // Immediately add the question to results with a temporary answer
    const tempResult = {
      id: Date.now(),
      question: questionText,
      answer: '', // Will be filled when response comes
      references: [],
      total_tokens: 'N/A',
      isLoading: true
    };

    setResults(prev => [...prev, tempResult]);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionText, document_id: selectedDoc }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';
      let references = [];
      let total_tokens = 'N/A';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'chunk') {
                accumulatedAnswer += data.content;
                // Update the result with the current accumulated answer
                setResults(prev => prev.map(result =>
                  result.id === tempResult.id
                    ? {
                        ...result,
                        answer: accumulatedAnswer,
                        isLoading: true // Keep loading until end
                      }
                    : result
                ));
              } else if (data.type === 'end') {
                references = data.references || [];
                total_tokens = data.total_tokens || 'N/A';
                // Update with final data
                setResults(prev => prev.map(result =>
                  result.id === tempResult.id
                    ? {
                        ...result,
                        answer: accumulatedAnswer,
                        references: references,
                        total_tokens: total_tokens,
                        isLoading: false
                      }
                    : result
                ));
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(`Failed to get response: ${err.message}`);
      // Update the result to show error
      setResults(prev => prev.map(result =>
        result.id === tempResult.id
          ? { ...result, answer: `Error: ${err.message}`, isLoading: false }
          : result
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (cardQuestion) => {
    setQuestion(cardQuestion);
    setHasAskedFirstQuestion(true);
    setIsLoading(true);
    setError('');

    // Immediately add the question to results with a temporary answer
    const tempResult = {
      id: Date.now(),
      question: cardQuestion,
      answer: '', // Will be filled when response comes
      references: [],
      total_tokens: 'N/A',
      isLoading: true
    };

    setResults(prev => [...prev, tempResult]);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: cardQuestion, document_id: selectedDoc }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';
      let references = [];
      let total_tokens = 'N/A';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'chunk') {
                accumulatedAnswer += data.content;
                // Update the result with the current accumulated answer
                setResults(prev => prev.map(result =>
                  result.id === tempResult.id
                    ? {
                        ...result,
                        answer: accumulatedAnswer,
                        isLoading: true // Keep loading until end
                      }
                    : result
                ));
              } else if (data.type === 'end') {
                references = data.references || [];
                total_tokens = data.total_tokens || 'N/A';
                // Update with final data
                setResults(prev => prev.map(result =>
                  result.id === tempResult.id
                    ? {
                        ...result,
                        answer: accumulatedAnswer,
                        references: references,
                        total_tokens: total_tokens,
                        isLoading: false
                      }
                    : result
                ));
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(`Failed to get response: ${err.message}`);
      // Update the result to show error
      setResults(prev => prev.map(result =>
        result.id === tempResult.id
          ? { ...result, answer: `Error: ${err.message}`, isLoading: false }
          : result
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {!sidebarExpanded && (
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          ☰
        </button>
      )}

      <header className="header">
      </header>

      {/* Initial Welcome Panel */}
      {!hasAskedFirstQuestion && (
        <div className="welcome-container">
          <div className="welcome-message">
            <h2>Hi 👋 I'm your AI assistant</h2>
            <p>Feel free to ask me anything about this note!</p>
          </div>
          <div className="question-cards">
            {(() => {
              const currentJournal = journals.find(j => j.id === selectedDoc);
              const defaultQuestions = currentJournal?.defaultDocumentQuestions || [];
              return (
                <>
                  {defaultQuestions.map((q) => (
                    <button
                      key={q.id}
                      className="question-card"
                      onClick={() => handleCardClick(q.Question)}
                      disabled={isLoading}
                    >
                      {q.Question}
                    </button>
                  ))}
                  <button
                    className="question-card"
                    onClick={() => setHasAskedFirstQuestion(true)}
                    disabled={isLoading}
                  >
                    💬 Ask your own question
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="results-container">
          {/* Show completed Q&A pairs first */}
          {results.map((result) => (
            <div key={result.id} className="result-item">
              <div className="question">{result.question}</div>

              {/* Show references if any */}
              {result.references && result.references.length > 0 && (
                <div className="references-box">
                  <div className="references-title">📄 References</div>
                  <div className="references-list">
                    {result.references.map((ref, index) => (
                      <div
                        key={index}
                        className="reference-item clickable"
                        onClick={() => handleReferenceClick(ref.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="reference-name">{ref.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show answer */}
              <div className="answer">
                {result.isLoading ? (
                  <div className="thinking-animation">
                    <div className="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                ) : result.id === results[results.length - 1]?.id && !isLoading ? (
                  <TypingAnimation text={result.answer} />
                ) : (
                  <AnswerText text={result.answer} onPageClick={onPageClick} />
                )}
              </div>

              {/* Show total tokens only when available */}
              {result.total_tokens !== 'N/A' && (
                <div className="tokens-info">
                  <span className="tokens-text">Total tokens used: {result.total_tokens}</span>
                </div>
              )}
            </div>
          ))}

          <div ref={resultsEndRef} />
        </div>
      )}

      {/* Sticky Search Form */}
      {hasAskedFirstQuestion && (
        <form className={`sticky-search-container ${sidebarExpanded ? 'sidebar-expanded' : ''}`} onSubmit={handleSubmit}>
          <textarea
            placeholder="Ask another question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            rows={2}
            className="search-input"
            aria-label="Ask a question about your documents"
          />
          <button
            type="submit"
            className="search-button"
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? '⏳' : <FiSend size={18} />}
          </button>
        </form>
      )}
    </>
  );
};
import SelectDocument from './SelectDocument';
import DocumentChat from './DocumentChat';

export default function App() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [journals, setJournals] = useState([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showJournalsList, setShowJournalsList] = useState(false);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${apiBaseUrl}/journals`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch journals');
        return res.json();
      })
      .then(data => setJournals(data))
      .catch(err => console.error('Error fetching journals:', err));
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      // Dark Theme with Orange accents
      root.style.setProperty('--bg-primary', '#0f0f0f');
      root.style.setProperty('--bg-secondary', '#1a1a1a');
      root.style.setProperty('--bg-tertiary', '#2a2a2a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#cccccc');
      root.style.setProperty('--text-muted', '#888888');
      root.style.setProperty('--accent', '#ff914d');        // Orange accent for dark theme
      root.style.setProperty('--accent-hover', '#ff6b35');  // Darker shade of orange
      root.style.setProperty('--border', '#333333');
      root.style.setProperty('--shadow', 'rgba(0, 0, 0, 0.3)');
    } else {
      // Light Theme with Blue accents
      root.style.setProperty('--bg-primary', '#ffffff');    // White background
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-tertiary', '#e9ecef');
      root.style.setProperty('--text-primary', '#212529');
      root.style.setProperty('--text-secondary', '#6c757d');
      root.style.setProperty('--text-muted', '#adb5bd');
      root.style.setProperty('--accent', '#3b82f6');        // Blue accent for light theme
      root.style.setProperty('--accent-hover', '#2563eb');  // Darker shade of blue
      root.style.setProperty('--border', '#dee2e6');
      root.style.setProperty('--shadow', 'rgba(0, 0, 0, 0.1)');
    }
  }, [isDarkMode]);

  const handlePageClick = (pageNum) => setPdfPage(pageNum);

  const handleDocumentSelect = (docId) => {
    console.log(`Opening document: ${docId}`);
    setSelectedDoc(docId);
    setPdfPage(1);

    // Special handling for Net Notes journal
    if (docId === 'file-Ve5WCSM8v29EqeyQBWGYqk') {
      console.log('Opening Net Notes - starting fresh chat session');
    }
  };

  return (
    <div className={`app-layout ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
      <div className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <img src={isDarkMode ? logoDark : logoLight} alt="App Logo" style={{ width: '100%', height: '60px' }} />
          </div>
          <button className="sidebar-close" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          <button className="sidebar-theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <a href="#" className={`nav-item ${showJournalsList ? 'active' : ''}`} onClick={() => setShowJournalsList(true)}>Documents</a>
        </nav>
        {showJournalsList && (
          <div className="sidebar-journals">
            <h3>Available Documents</h3>
            <div className="journals-list">
              {journals.map(doc => (
                <div
                  key={doc.id}
                  className={`journal-item ${doc.id === selectedDoc ? 'active' : ''}`}
                  onClick={() => {
                    console.log(`Clicked on journal: ${doc.title} (${doc.id})`);
                    handleDocumentSelect(doc.id);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="journal-title">{doc.title}</span>
                  <span className="journal-desc">{doc.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!selectedDoc ? (
        <SelectDocument onSelect={setSelectedDoc} isDarkMode={isDarkMode} />
      ) : (
        <DocumentChat selectedDoc={selectedDoc} pageNumber={pdfPage}>
          <ChatApp 
            selectedDoc={selectedDoc} 
            onPageClick={handlePageClick} 
            journals={journals}
            onDocumentSelect={handleDocumentSelect}
            sidebarExpanded={sidebarExpanded}
            toggleSidebar={toggleSidebar}
            toggleTheme={toggleTheme}
          />
        </DocumentChat>
      )}
    </div>
  );
}
