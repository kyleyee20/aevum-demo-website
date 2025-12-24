import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import Home from './pages/Home';
import HelpGuide from './pages/HelpGuide';
import PriorityList from './pages/PriorityList';
import Account from './pages/Account';
import Feedback from './pages/Feedback';
import './App.css';

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Fetch Google Calendar events using an access token
  const fetchCalendarEvents = async (token) => {
    console.log('Fetching calendar events with token:', token);

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching calendar events:', errorData);
        alert(
          `Error fetching calendar events: ${
            errorData.error?.message || 'Unknown error'
          }`
        );
        return;
      }

      const data = await response.json();
      console.log('Google Calendar Data:', data.items);
      setCalendarEvents(data.items || []);
    } catch (error) {
      console.error('Network or API error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Use the hook-based login which returns an access token
  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar', // request Calendar scope
    onSuccess: async (tokenResponse) => {
      console.log('Google Login Success:', tokenResponse);
      const accessToken = tokenResponse.access_token;
      if (accessToken) {
        setAuthToken(accessToken);
        await fetchCalendarEvents(accessToken);
      } else {
        alert('Failed to get access token. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      alert('Google Login failed. Please try again.');
    },
  });

  // Logout handler
  const handleLogout = () => {
    setAuthToken(null);
    setCalendarEvents([]);
  };

  return (
    <Router>
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">My Website</h2>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/priority">Priority List</Link></li>
          <li><Link to="/help">Help Guide</Link></li>
          <li><Link to="/account">Account</Link></li>
          <li><Link to="/feedback">Feedback</Link></li>
        </ul>
      </nav>

      {/* Google OAuth Button */}
      <div className="google-login-container">
        {!authToken ? (
          <button onClick={() => login()}>
            Sign in with Google
          </button>
        ) : (
          <div>
            <h2>Logged in successfully!</h2>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>

      {/* Page Routes */}
      <Routes>
        <Route path="/" element={<Home calendarEvents={calendarEvents} />} />
        <Route path="/priority" element={<PriorityList />} />
        <Route path="/help" element={<HelpGuide />} />
        <Route path="/account" element={<Account />} />
        <Route path="/feedback" element={<Feedback />} />
      </Routes>
    </Router>
  );
}

export default App;
