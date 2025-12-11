import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ShowsList from './pages/ShowsList';
import Admin from './pages/Admin';
import BookingPage from './pages/BookingPage';

/**
 * Main App component with routing.
 * I'm using React Router for navigation and Context API for state management.
 */
function App() {
  return (
    <AppProvider>
      <Router>
        <div className="app">
          <nav className="navbar">
            <div className="nav-container">
              <Link to="/" className="nav-logo">
                🎫 Modex Booking
              </Link>
              <div className="nav-links">
                <Link to="/" className="nav-link">Shows</Link>
                <Link to="/admin" className="nav-link">Admin</Link>
              </div>
            </div>
          </nav>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<ShowsList />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/booking/:showId" element={<BookingPage />} />
            </Routes>
          </main>

          <footer className="footer">
            <p>Modex Ticket Booking System</p>
          </footer>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
