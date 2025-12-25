import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Link } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function Home({ calendarEvents }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const loadedEvents = JSON.parse(localStorage.getItem("calendarEvents") || "[]");

    // Format localStorage events
    const formattedLocalStorageEvents = loadedEvents.map((event) => ({
      id: event.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: event.title || 'Local Event',
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay || false,
    }));

    // UNIFIED MAPPING - handles Google, Priority, and mixed events
    const formattedCalendarEvents = calendarEvents.map((event) => {
      if (event.isPriority || event.title) {
        // Priority/AI events or events with direct title property
        return {
          id: event.id,
          title: event.title || 'Priority Event',
          start: new Date(event.start),
          end: new Date(event.end),
          allDay: event.allDay || false,
        };
      } else {
        // Google Calendar events
        return {
          id: event.id,
          title: event.summary || 'No title',
          start: new Date(event.start.dateTime || event.start.date),
          end: new Date(event.end.dateTime || event.end.date),
        };
      }
    });

    const allEvents = [...formattedLocalStorageEvents, ...formattedCalendarEvents];
    console.log("Raw calendarEvents from App:", calendarEvents);
    console.log("Formatted events count:", allEvents.length);
    console.log("First few events:", allEvents.slice(0, 3));
    setEvents(allEvents);
  }, [calendarEvents]);

  return (
    <div className="container" style={{ height: "80vh" }}>
      <h1>Welcome to Aevumm</h1>

      <Calendar
        localizer={localizer}
        events={events}
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
