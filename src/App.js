import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import Home from './pages/Home';
import HelpGuide from './pages/HelpGuide';
import PriorityList from './pages/PriorityList';
import Account from './pages/Account';
import Feedback from './pages/Feedback';
import GradeCalculator from './pages/GradeCalculator';
import './App.css';

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [priorityEvents, setPriorityEvents] = useState([]);

  // Restore from localStorage on first load
  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    const savedEvents = localStorage.getItem('google_calendar_events');
    const savedPriorityEvents = localStorage.getItem('priority_events');

    if (savedToken) {
      setAuthToken(savedToken);
    }
    if (savedEvents) {
      try {
        setCalendarEvents(JSON.parse(savedEvents));
      } catch {
        // ignore parse errors
      }
    }
    if (savedToken && savedPriorityEvents) {
      try {
        setPriorityEvents(JSON.parse(savedPriorityEvents));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

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
      localStorage.setItem(
        'google_calendar_events',
        JSON.stringify(data.items || [])
      );
    } catch (error) {
      console.error('Network or API error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // ✅ FIXED: Use setState callback pattern for proper localStorage sync
  const addPriorityEvent = (newEvent) => {
    const eventWithId = {
      ...newEvent,
      id: `priority_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isPriority: true
    };
    setPriorityEvents(prev => {
      const updated = [...prev, eventWithId];
      localStorage.setItem('priority_events', JSON.stringify(updated));
      return updated;
    });
  };

  // ✅ FIXED: Use setState callback pattern for proper localStorage sync
  const removePriorityEvent = (eventId) => {
    setPriorityEvents(prev => {
      const updated = prev.filter(event => event.id !== eventId);
      localStorage.setItem('priority_events', JSON.stringify(updated));
      return updated;
    });
  };

  // Restore ALL session data on login
  const restoreFullSession = () => {
    console.log('🔄 Restoring full session...');
    
    // Restore priority events
    const savedPriorityEvents = localStorage.getItem('priority_events');
    if (savedPriorityEvents) {
      try {
        const events = JSON.parse(savedPriorityEvents);
        setPriorityEvents(events);
        console.log('✅ Restored priority events:', events.length);
      } catch (e) {
        console.error('Failed to restore priority events');
      }
    }

    // PriorityList will auto-restore its data from localStorage
    console.log('✅ PriorityList data available in localStorage');
  };

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar',
    onSuccess: async (tokenResponse) => {
      console.log('Google Login Success:', tokenResponse);
      const accessToken = tokenResponse.access_token;
      if (accessToken) {
        setAuthToken(accessToken);
        localStorage.setItem('google_access_token', accessToken);
        await fetchCalendarEvents(accessToken);
        
        // Restore ALL previously saved session data
        restoreFullSession();
      } else {
        alert('Failed to get access token. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      alert('Google Login failed. Please try again.');
    },
  });

  // ✅ FIXED: Only clear AUTH data - KEEP assignments!
  const handleLogout = () => {
    console.log('🚪 Logging out - clearing AUTH only...');
    
    setAuthToken(null);
    setCalendarEvents([]);
    setPriorityEvents([]); // Clear UI state
    
    // ✅ KEEP assignment data for restoration!
    localStorage.removeItem('google_access_token');  // Only auth token
    localStorage.removeItem('google_calendar_events'); // Google events only
    
    // ✅ priority_events & userTitles stay for restoration!
    console.log('✅ Assignment data preserved in localStorage');
    console.log('priority_events still there:', localStorage.getItem('priority_events'));
    console.log('userTitles still there:', localStorage.getItem('userTitles'));
  };

  const handleSync = () => {
    if (authToken) {
      fetchCalendarEvents(authToken);
    }
  };

  return (
    <Router>
      <nav className="navbar">
        <h2 className="logo">My Website</h2>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/priority">Priority List</Link></li>
          <li><Link to="/help">Help Guide</Link></li>
          <li><Link to="/account">Account</Link></li>
          <li><Link to="/grades"> Grade Calculator</Link></li> 
          <li><Link to="/feedback">Feedback</Link></li>
        </ul>
      </nav>

      <div className="google-login-container">
        {!authToken ? (
          <button onClick={() => login()}>
            Sign in with Google
          </button>
        ) : (
          <div>
            <h2>Logged in successfully!</h2>
            <button 
              onClick={handleSync}
              style={{ 
                marginLeft: '10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '8px 16px'
              }}
            >
              🔄 Sync Google Calendar
            </button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>

      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              calendarEvents={[...calendarEvents, ...priorityEvents]} 
            />
          } 
        />
        <Route 
          path="/priority" 
          element={
            <PriorityList 
              priorityEvents={priorityEvents}
              addPriorityEvent={addPriorityEvent}
              removePriorityEvent={removePriorityEvent}
            />
          } 
        />
        <Route path="/help" element={<HelpGuide />} />
        <Route path="/account" element={<Account />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/grades" element={<GradeCalculator />} />
      </Routes>
    </Router>
  );
}

export default App;
