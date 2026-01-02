import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Link } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function Home({ calendarEvents }) {
  const [events, setEvents] = useState([]);
const [newPriorityFromGoogle, setNewPriorityFromGoogle] = useState(0); // 👈 ADD HERE
  // 🧠 Pull strength values directly from Account.js profiles + vocab
  const getCourseStrength = (courseTitle) => {
    if (!courseTitle || courseTitle.trim() === "") return 5;
    const profiles = JSON.parse(localStorage.getItem("courseProfiles") || "[]");
    const vocab = JSON.parse(localStorage.getItem("schoolVocab") || "{}");
    const lowerTitle = courseTitle.toLowerCase().trim();

    // 1️⃣ First check for a direct Account.js (category) match
    const directMatch = profiles.find(
      (p) => p.category && lowerTitle.includes(p.category.toLowerCase().trim())
    );
    if (directMatch) {
      console.log("✅ Direct match:", directMatch.category, "=", directMatch.strength);
      return directMatch.strength;
    }

    // 2️⃣ Then check vocab → dept → Account match
    for (const [dept, courses] of Object.entries(vocab)) {
      if (
        courses.some(
          (course) =>
            lowerTitle.includes(course.toLowerCase().trim()) ||
            course.toLowerCase().trim().includes(lowerTitle)
        )
      ) {
        const deptMatch = profiles.find(
          (p) => p.category?.toLowerCase().trim() === dept.toLowerCase().trim()
        );
        if (deptMatch) {
          console.log("🏫 Vocab→Account:", dept, "→", deptMatch.strength);
          return deptMatch.strength;
        }
      }
    }

    return 5;
  };

  useEffect(() => {
    const loadedEvents = JSON.parse(localStorage.getItem("calendarEvents") || "[]");

    // ---- Format localStorage events (user‑created)
    const formattedLocalStorageEvents = loadedEvents.map((event) => ({
      id: event.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: event.title || "Local Event",
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay || false,
    }));

    // ---- Load vocab and detect course matches
    const vocab = JSON.parse(localStorage.getItem("schoolVocab") || "{}");
    const priorityEligible = [];

    const normalize = (text) =>
      text ? text.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

  const formattedCalendarEvents = calendarEvents.map((event) => {
  // AI/Priority events stay untouched
  if (event.isPriority || event.title) {
    return event.isPriority ? {
      id: event.id,
      title: event.title || "Priority Event",
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay || false,
    } : null; // Skip non-priority Google events
  } else {
    const title = event.summary || "No title";
    const start = new Date(event.start.dateTime || event.start.date);


    // ---- EXTRACT COURSE CODE from title (e.g. "PHYS 2A", "MATH 4C")
    const extractCourseCode = (text) => {
      const codeMatch = text.match(/([a-zA-Z]{3,5})\s+([0-9]+[a-zA-Z]?)/i);
      if (!codeMatch) return null;
      
      const rawDept = codeMatch[1];
      const rawNum = codeMatch[2];
      const dept = normalize(rawDept);  // "math" → "math"
      const num = rawNum.toUpperCase(); // Keep number case-consistent: "4c" → "4C"
      
      return { dept, num };
    };

    const titleCourseCode = extractCourseCode(title);

    const matchCategory = Object.entries(vocab).find(([dept, courses]) =>
      courses.some((course) => {
        const courseCode = extractCourseCode(course);
        if (!courseCode || !titleCourseCode) return false;
        
        const match = titleCourseCode.dept === courseCode.dept && 
                      titleCourseCode.num === courseCode.num;

        if (match) {
          console.log(`✅ EXACT COURSE CODE MATCH: "${title}" (${JSON.stringify(titleCourseCode)}) ↔ "${course}" (${JSON.stringify(courseCode)}) in ${dept}`);
        }
        return match;
      })
    );

    if (matchCategory) {
      const today = new Date().toISOString().split("T")[0];
      const eventDate = start.toISOString().split("T")[0];
      
      if (eventDate >= today) {
        priorityEligible.push({
          title,
          dueDate: eventDate,
        });
        console.log(`✅ Future COURSE match: "${title}" → PriorityList`);
      } else {
        console.log(`⏰ Past due - skipping: "${title}"`);
      }
    } else {
      console.log(`🚫 No COURSE CODE match for: ${title} (${titleCourseCode || 'none'})`);
    }

    // DON'T RETURN Google events - scan only
    return null;
  }
});


    // ---- Directly insert matched courses into PriorityList’s storage
    if (priorityEligible.length > 0) {
      console.log("🎯 Auto‑detected priority events:", priorityEligible);

      // Get whatever the user already has
      const existingTitles = JSON.parse(localStorage.getItem("userTitles") || "[]");
      const existingDueDates = JSON.parse(localStorage.getItem("userDueDates") || "[]");
      const existingWeights = JSON.parse(
        localStorage.getItem("userStrengthWeights") || "[]"
      );
      const existingOverrides = JSON.parse(
        localStorage.getItem("manualOverrides") || "[]"
      );

      const newTitles = [...existingTitles];
      const newDueDates = [...existingDueDates];
      const newWeights = [...existingWeights];
      const newOverrides = [...existingOverrides];

      priorityEligible.forEach(({ title, dueDate }) => {
        if (!newTitles.includes(title)) {
          newTitles.push(title);
          newDueDates.push(dueDate);
          const strength = getCourseStrength(title);
          newWeights.push(strength);
          newOverrides.push(false);
          console.log(`📘 Added "${title}" (${strength}) to manual storage`);
           // 👈 ADD THIS LINE HERE:
    setNewPriorityFromGoogle(prev => prev + 1);
        }
      });

      // Persist directly into PriorityList’s keys
      localStorage.setItem("userTitles", JSON.stringify(newTitles));
      localStorage.setItem("userDueDates", JSON.stringify(newDueDates));
      localStorage.setItem("userStrengthWeights", JSON.stringify(newWeights));
      localStorage.setItem("manualOverrides", JSON.stringify(newOverrides));

      console.log("✅ Synced matched courses into PriorityList localStorage");
    } else {
      console.warn("⚠️ No vocab course matches found in calendar titles");
    }

    // ---- Combine events for calendar rendering
const allEvents = [...formattedLocalStorageEvents, ...formattedCalendarEvents.filter(Boolean)];
    setEvents(allEvents);

    console.log("📅 Raw calendarEvents from App:", calendarEvents);
    console.log("Formatted events count:", allEvents.length);
    console.log("First few events:", allEvents.slice(0, 3));
  }, [calendarEvents]);
  // 👈 ADD THIS NEW useEffect HERE:
useEffect(() => {
  const timer = setTimeout(() => setNewPriorityFromGoogle(0), 100);
  return () => clearTimeout(timer);
}, []);

  return (
    <div className="container" style={{ height: "80vh" }}>
      <h1>Welcome to Aevumm</h1>
      {newPriorityFromGoogle > 0 && (
  <div style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '15px 25px',
    borderRadius: '12px',
    margin: '15px 0',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
    border: '2px solid rgba(255,255,255,0.2)'
  }}>
    📚 <strong>{newPriorityFromGoogle} new course event(s)</strong> detected from Google Calendar 
    and added to Priority List! 
    <Link to="/priority" style={{ 
      color: '#FFD700', 
      marginLeft: '15px', 
      textDecoration: 'none', 
      fontWeight: 'bold' 
    }}>
      Review Now →
    </Link>
  </div>
)}


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
