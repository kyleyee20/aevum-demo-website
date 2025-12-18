import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Link } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function Home({ calendarEvents }) {
  const [events, setEvents] = useState([]); // State to store calendar events

  // Load events from localStorage and merge with Google Calendar events
  useEffect(() => {
    const loadedEvents = JSON.parse(localStorage.getItem("calendarEvents") || "[]");

    // Format localStorage events to ensure they have proper Date objects
    const formattedLocalStorageEvents = loadedEvents.map((event) => ({
      ...event,
      start: new Date(event.start), // Ensure start is a Date object
      end: new Date(event.end), // Ensure end is a Date object
    }));

    // Format Google Calendar events (props) to ensure start and end are Date objects
    const formattedGoogleCalendarEvents = calendarEvents.map((event) => ({
      ...event,
      start: new Date(event.start.dateTime || event.start.date),  // Use dateTime or date
      end: new Date(event.end.dateTime || event.end.date),  // Use dateTime or date
    }));

    // Merge both localStorage events and Google Calendar events
    const allEvents = [...formattedLocalStorageEvents, ...formattedGoogleCalendarEvents];

    // Log the merged events for debugging
    console.log("Merged Events:", allEvents);

    // Update state with the merged events
    setEvents(allEvents);
  }, [calendarEvents]); // Re-run whenever calendarEvents (Google events) change

  return (
    <div className="container" style={{ height: "80vh" }}>
      <h1>Welcome to the Demo Website</h1>

      {/* React Big Calendar */}
      <Calendar
        localizer={localizer}
        events={events} // Events passed here
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500, margin: "20px 0" }}
      />

      {events.length === 0 && (
        <p>No events to display. Please add some events.</p>
      )}

      <div className="feedback-container">
        <Link to="/feedback" className="feedback-link">
          Give Feedback
        </Link>
      </div>
    </div>
  );
}
