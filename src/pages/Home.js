import { useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Link } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function Home() {
  const [events, setEvents] = useState([]); // Empty array, no events

  return (
    <div className="container" style={{ height: "80vh" }}>
      <h1>Welcome to the Demo Website</h1>

      <Calendar
        localizer={localizer}
        events={events}          // No events shown
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500, margin: "20px 0" }}
      />

      <div className="feedback-container">
        <Link to="/feedback" className="feedback-link">
          Give Feedback
        </Link>
      </div>
    </div>
  );
}
