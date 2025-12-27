import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Link } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function Home({ calendarEvents }) {
  const [events, setEvents] = useState([]);

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
        return {
          id: event.id,
          title: event.title || "Priority Event",
          start: new Date(event.start),
          end: new Date(event.end),
          allDay: event.allDay || false,
        };
      } else {
        const title = event.summary || "No title";
        const start = new Date(event.start.dateTime || event.start.date);
        const end = new Date(event.end.dateTime || event.end.date);
        const cleanTitle = normalize(title);

        // ---- Match against vocab
        const matchCategory = Object.entries(vocab).find(([dept, courses]) =>
          courses.some((course) => {
            const cleanCourse = normalize(course);
            const match =
              cleanTitle.includes(cleanCourse) ||
              cleanCourse.includes(cleanTitle);
            if (match) {
              console.log(`✅ Match found: "${title}" ↔ "${course}" (in ${dept})`);
            }
            return match;
          })
        );

        if (matchCategory) {
          priorityEligible.push({
            title,
            dueDate: start.toISOString().split("T")[0],
          });
        } else {
          console.log(`🚫 No match for: ${title}`);
        }

        return { id: event.id, title, start, end };
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
    const allEvents = [...formattedLocalStorageEvents, ...formattedCalendarEvents];
    setEvents(allEvents);

    console.log("📅 Raw calendarEvents from App:", calendarEvents);
    console.log("Formatted events count:", allEvents.length);
    console.log("First few events:", allEvents.slice(0, 3));
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
