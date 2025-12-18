import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Home from './pages/Home';
import HelpGuide from './pages/HelpGuide';
import PriorityList from './pages/PriorityList';
import Account from './pages/Account';
import Feedback from './pages/Feedback';
import './App.css';

const clientId = "1022010187384-0nj3c6govd8r9pbi4v8b79lstdlatej6.apps.googleusercontent.com"; // Replace with your actual client ID

function App() {
  const [authToken, setAuthToken] = useState(null);  // State for OAuth token
  const [calendarEvents, setCalendarEvents] = useState([]);  // State for Google Calendar events

  // Handle Google login success
  const handleLoginSuccess = async (response) => {
    const token = response.credential; // Get OAuth token
    setAuthToken(token);  // Store the token

    // Log the token to ensure it's correct
    console.log('OAuth Token:', token);

    // Fetch Google Calendar events after successful login
    await fetchCalendarEvents(token);
  };

  // Handle Google login failure
  const handleLoginFailure = (error) => {
    console.error('Login failed:', error);
    alert('Google Login failed. Please try again.');
  };

  // Fetch Google Calendar events
  const fetchCalendarEvents = async (token) => {
    console.log("Fetching calendar events with token:", token);

    try {
      // Request the Google Calendar API using the token
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,  // Use OAuth token in the Authorization header
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching calendar events:', errorData);
        alert(`Error fetching calendar events: ${errorData.error.message}`);
        return;
      }

      const data = await response.json();
      console.log('Google Calendar Data:', data.items);

      // Update the state with the events
      setCalendarEvents(data.items || []); // Save Google Calendar events to state
    } catch (error) {
      console.error('Network or API error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setAuthToken(null);
    setCalendarEvents([]); // Clear calendar events on logout
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>  {/* Wrap your app with GoogleOAuthProvider */}
      <Router>
        {/* Navbar */}
        <nav className="navbar">
          <h2 className="logo">My Website</h2>
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/priority">Priority List</Link>
            </li>
            <li>
              <Link to="/help">Help Guide</Link>
            </li>
            <li>
              <Link to="/account">Account</Link>
            </li>
            <li>
              <Link to="/feedback">Feedback</Link>
            </li>
          </ul>
        </nav>

        {/* Google OAuth Button */}
        <div className="google-login-container">
          {!authToken ? (
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginFailure}
              scope="https://www.googleapis.com/auth/calendar.readonly"  // Add the calendar scope
              uxMode="popup"  // Open login in a popup window
            />
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
    </GoogleOAuthProvider>
  );
}

export default App;
