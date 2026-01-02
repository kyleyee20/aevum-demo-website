import React, { useState, useEffect, useCallback } from "react"; // 👈 Add useCallback
import * as ort from "onnxruntime-web";

export default function PriorityList({ priorityEvents, addPriorityEvent, removePriorityEvent }) {
  const [priorityScores, setPriorityScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courseVocab, setCourseVocab] = useState({});
  const [userTitles, setUserTitles] = useState([]);
  const [userDueDates, setUserDueDates] = useState([]);
  const [userStrengthWeights, setUserStrengthWeights] = useState([]);
  const [manualOverrides, setManualOverrides] = useState([]);
  const [sortCriteria, setSortCriteria] = useState("recommendedDueDate");
  const [completedAssignments, setCompletedAssignments] = useState(
  JSON.parse(localStorage.getItem("completedAssignments") || "[]")
  
);

  const isValidDate = (dateString) => {
    if (!dateString || dateString === "") return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const getCourseStrength = (courseTitle) => {
    if (!courseTitle || courseTitle.trim() === "") return 5;

    const profiles = JSON.parse(localStorage.getItem("courseProfiles") || "[]");
    const vocab = JSON.parse(localStorage.getItem("schoolVocab") || "{}");
    const lowerTitle = courseTitle.toLowerCase().trim();

    console.log("🔍 Matching:", courseTitle);

    // 1️⃣ Direct Account.js match first
    const directMatch = profiles.find(p => 
      p.category && lowerTitle.includes(p.category.toLowerCase().trim())
    );
    if (directMatch) {
      console.log("✅ Direct match:", directMatch.category, "=", directMatch.strength);
      return directMatch.strength;
    }

    // 2️⃣ School vocab → department → Account match
    for (const [dept, courses] of Object.entries(vocab)) {
      if (courses.some(course => 
        lowerTitle.includes(course.toLowerCase().trim()) ||
        course.toLowerCase().trim().includes(lowerTitle)
      )) {
        const deptMatch = profiles.find(p => 
          p.category?.toLowerCase().trim() === dept.toLowerCase().trim()
        );
        if (deptMatch) {
          console.log("🏫 Vocab→Account:", dept, "→", deptMatch.strength);
          return deptMatch.strength;
        }
      }
    }

    return 5;
  };

  const addNewAssignment = () => {
    setUserTitles((prev) => [...prev, ""]);
    setUserDueDates((prev) => [...prev, new Date().toISOString().split("T")[0]]);
    setUserStrengthWeights((prev) => [...prev, 0]);
    setManualOverrides((prev) => [...prev, false]);
  };

  const resetToAuto = (index) => {
    const overrides = [...manualOverrides];
    overrides[index] = false;
    setManualOverrides(overrides);
    
    const autoValue = getCourseStrength(userTitles[index]);
    const strengths = [...userStrengthWeights];
    strengths[index] = autoValue;
    setUserStrengthWeights(strengths);
  };

  const deleteRow = useCallback((index) => {
  const title = userTitles[index];
  const dueDate = userDueDates[index];
  const assignmentId = `${title?.toLowerCase()?.replace(/[^\w\s]/g, "")}_${dueDate}`;

  // 🆕 NEW: Delete from localStorage FIRST
  const savedTitles = JSON.parse(localStorage.getItem("userTitles") || "[]");
  const savedDueDates = JSON.parse(localStorage.getItem("userDueDates") || "[]");
  const savedStrengths = JSON.parse(localStorage.getItem("userStrengthWeights") || "[]");
  const savedOverrides = JSON.parse(localStorage.getItem("manualOverrides") || "[]");
  const savedScores = JSON.parse(localStorage.getItem("priorityScores") || "[]");

  const newTitles = savedTitles.filter((_, i) => i !== index);
  const newDueDates = savedDueDates.filter((_, i) => i !== index);
  const newStrengths = savedStrengths.filter((_, i) => i !== index);
  const newOverrides = savedOverrides.filter((_, i) => i !== index);
  const newScores = savedScores.filter((_, i) => i !== index);

  // 💾 Permanently save deletions to localStorage
  localStorage.setItem("userTitles", JSON.stringify(newTitles));
  localStorage.setItem("userDueDates", JSON.stringify(newDueDates));
  localStorage.setItem("userStrengthWeights", JSON.stringify(newStrengths));
  localStorage.setItem("manualOverrides", JSON.stringify(newOverrides));
  localStorage.setItem("priorityScores", JSON.stringify(newScores));

  // Update React state LAST (your existing logic)
  setUserTitles(newTitles);
  setUserDueDates(newDueDates);
  setUserStrengthWeights(newStrengths);
  setManualOverrides(newOverrides);
  setPriorityScores(newScores);

  // Remove from calendar (your existing logic)
  const token = localStorage.getItem("google_access_token");
  if (token && priorityEvents) {
    const eventToDelete = priorityEvents.find((e) => e.assignmentId === assignmentId);
    if (eventToDelete) {
      console.log(`🗓️ Removing calendar event for "${title}" on ${dueDate}`);
      removePriorityEvent(eventToDelete.id);
    }
  }
}, [userTitles, userDueDates, priorityEvents, removePriorityEvent]);

const handleComplete = (index) => {
  const completed = {
    title: userTitles[index],
    dueDate: userDueDates[index],
    priority: priorityScores[index] || 0,
    recommendedDueDate: getRecommendedDueDate(priorityScores[index], userDueDates[index], userStrengthWeights[index]),
    completedAt: new Date().toISOString().split("T")[0],
  };

  // 👈 IMMEDIATELY update localStorage FIRST
  const updatedCompleted = [...completedAssignments, completed];
  localStorage.setItem("completedAssignments", JSON.stringify(updatedCompleted));
  setCompletedAssignments(updatedCompleted);

  // THEN delete from active lists
  deleteRow(index);



  setCompletedAssignments((prev) => [...prev, completed]);
  deleteRow(index);  // ✅ Reuses your existing delete logic

  localStorage.setItem(
    "completedAssignments",
    JSON.stringify([...completedAssignments, completed])
  );
};

const handleUndo = (index) => {
  const restored = completedAssignments[index];

  // 🧱 Re-add the assignment back to active lists
  setUserTitles((prev) => [...prev, restored.title]);
  setUserDueDates((prev) => [...prev, restored.dueDate]);
  setUserStrengthWeights((prev) => [...prev, 5]); // Default confidence
  setManualOverrides((prev) => [...prev, false]);
  setPriorityScores((prev) => [...prev, restored.priority]);

  // 🧹 Remove it from completed
  const updated = completedAssignments.filter((_, i) => i !== index);
  setCompletedAssignments(updated);
  localStorage.setItem("completedAssignments", JSON.stringify(updated));

  console.log(`↩ Undid "${restored.title}" — restored to active list.`);
};


 const resetData = () => {
  // Clear React state
  setUserTitles([""]);
  setUserDueDates([""]);
  setUserStrengthWeights([0]);
  setManualOverrides([false]);
  setPriorityScores([]);

  // Clear localStorage for assignments
  ["userTitles", "userDueDates", "userStrengthWeights", "manualOverrides", "priorityScores"].forEach(
    (key) => localStorage.removeItem(key)
  );

  // 🗑️ CRITICAL: Remove ALL priority events from localStorage.calendarEvents too
  const storedEvents = JSON.parse(localStorage.getItem("calendarEvents") || "[]");
  const nonPriorityEvents = storedEvents.filter((event) => !event.isPriority);
  localStorage.setItem("calendarEvents", JSON.stringify(nonPriorityEvents));
  console.log(`🧹 Removed ${storedEvents.length - nonPriorityEvents.length} priority events from localStorage`);

  // 🗓️ Remove from live calendar state
  if (priorityEvents && Array.isArray(priorityEvents)) {
    priorityEvents.forEach((event) => {
      if (event.isPriority) {
        console.log(`🗓️ Removing priority event "${event.title}"`);
        removePriorityEvent(event.id);
      }
    });
  }

  console.log("🧹 Reset complete: assignments + calendar events + localStorage cleaned.");
};

// 🔔 PAST-DUE CLEANUP: Remove overdue assignments
useEffect(() => {
  const cleanPastDue = () => {
    const today = new Date().toISOString().split("T")[0];
    const savedTitles = JSON.parse(localStorage.getItem("userTitles") || "[]");
    
    // Find overdue indices
    const overdueIndices = savedTitles.map((title, i) => {
      const dueDate = JSON.parse(localStorage.getItem("userDueDates") || "[]")[i];
      return isValidDate(dueDate) && dueDate < today ? i : -1;
    }).filter(i => i !== -1);
    
    if (overdueIndices.length > 0) {
      console.log(`🔔 Found ${overdueIndices.length} past-due assignments - auto-deleting`);
      
      // Delete them using your existing logic
      overdueIndices.forEach(index => deleteRow(index));
    }
  };
  
  cleanPastDue();
  const interval = setInterval(cleanPastDue, 10 * 60 * 1000); // Every 10 minutes
  return () => clearInterval(interval);
}, [deleteRow]); // Depend on deleteRow so it has access


  // ✅ Restore data + token check
  useEffect(() => {
    const checkTokenAndLoad = () => {
      const token = localStorage.getItem("google_access_token");
      if (!token) {
        setUserTitles([""]);
        setUserDueDates([""]);
        setUserStrengthWeights([0]);
        setManualOverrides([false]);
        setPriorityScores([]);
        return;
      }

const completedAssignments = JSON.parse(localStorage.getItem("completedAssignments") || "[]");
    
    const savedTitles = JSON.parse(localStorage.getItem("userTitles") || "[]");
    const savedDueDates = JSON.parse(localStorage.getItem("userDueDates") || "[]");
    const savedStrengths = JSON.parse(localStorage.getItem("userStrengthWeights") || "[]");
    const savedOverrides = JSON.parse(localStorage.getItem("manualOverrides") || "[]");
    const savedScores = JSON.parse(localStorage.getItem("priorityScores") || "[]");

    // 🆕 NEW: Filter out completed assignments
    const isCompleted = (t, d) =>
      completedAssignments.some(
        (c) =>
          c.title?.toLowerCase().trim() === t?.toLowerCase().trim() &&
          c.dueDate === d
      );

    const filteredTitles = savedTitles.filter((t, i) => !isCompleted(t, savedDueDates[i]));
    const filteredDueDates = savedDueDates.filter((d, i) => !isCompleted(savedTitles[i], d));
    const filteredStrengths = savedStrengths.filter((_, i) => !isCompleted(savedTitles[i], savedDueDates[i]));
    const filteredOverrides = savedOverrides.filter((_, i) => !isCompleted(savedTitles[i], savedDueDates[i]));
    const filteredScores = savedScores.filter((_, i) => !isCompleted(savedTitles[i], savedDueDates[i]));

    // 🆕 Use filtered data instead
    if (filteredTitles.length > 0) {
      setUserTitles(filteredTitles);
      setUserDueDates(filteredDueDates);
      setUserStrengthWeights(filteredStrengths);
      setManualOverrides(
        filteredOverrides.length === filteredTitles.length
          ? filteredOverrides
          : Array(filteredTitles.length).fill(false)
      );
      setPriorityScores(filteredScores);
    } else {
      setUserTitles([""]);
      setUserDueDates([""]);
      setUserStrengthWeights([0]);
      setManualOverrides([false]);
    }
    };
      

    checkTokenAndLoad();
    const timer = setInterval(checkTokenAndLoad, 1000);
    return () => clearInterval(timer);
  }, []);
  // ✅ ADD THIS NEW useEffect - Auto-process Google Calendar matches
  


  // ✅ Auto-fill strengths from Account
  useEffect(() => {
    if (userTitles.length === 0) return;
    const autoStrengths = userTitles.map((title, index) => {
      if (!manualOverrides[index]) return getCourseStrength(title);
      return userStrengthWeights[index] || 5;
    });
    setUserStrengthWeights(autoStrengths);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTitles]);

  // ✅ Sync override array length
  useEffect(() => {
    if (manualOverrides.length !== userTitles.length) {
      setManualOverrides((prev) => {
        const updated = [...prev];
        while (updated.length < userTitles.length) updated.push(false);
        while (updated.length > userTitles.length) updated.pop();
        return updated;
      });
    }
  }, [userTitles.length, manualOverrides.length]);

  // ✅ DYNAMIC SCHOOL VOCAB - Matches Account.js selected school
  useEffect(() => {
    const loadDynamicVocab = () => {
      const school = localStorage.getItem("selectedSchool") || "ucsd";
      console.log(`📚 Loading ${school.toUpperCase()} courses...`);
      
      fetch(`/schools/${school}_courses.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`No ${school} courses found`);
          return res.json();
        })
        .then((data) => {
          const vocab = {};
          let current = null;
          data.forEach((item) => {
            const category = item["Table 1"];
            const course = item["Unnamed: 1"];
            if (category && category.trim()) current = category.trim();
            if (course && course.trim()) {
              if (!vocab[current]) vocab[current] = [];
              vocab[current].push(course.trim());
            }
          });
          setCourseVocab(vocab);
          console.log(`✅ ${school.toUpperCase()} vocab loaded:`, Object.keys(vocab).length, "departments");
        })
        .catch((err) => {
          console.error("❌ Course vocab failed:", err);
          setCourseVocab({});
        });
    };

    loadDynamicVocab();
    const schoolInterval = setInterval(loadDynamicVocab, 2000);
    return () => clearInterval(schoolInterval);
  }, []);

  // 🧹 AUTO-CLEAN: Remove completed assignments > 30 days old
useEffect(() => {
  const cleanOldCompleted = () => {
    const completed = JSON.parse(localStorage.getItem("completedAssignments") || "[]");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompleted = completed.filter((item) => {
      const completedDate = new Date(item.completedAt);
      return completedDate > thirtyDaysAgo;
    });
    
    if (recentCompleted.length < completed.length) {
      console.log(`🧹 Cleaned ${completed.length - recentCompleted.length} old completed assignments`);
      localStorage.setItem("completedAssignments", JSON.stringify(recentCompleted));
      setCompletedAssignments(recentCompleted);
    }
  };
  
  cleanOldCompleted();
  const interval = setInterval(cleanOldCompleted, 5 * 60 * 1000); // Every 5 minutes
  return () => clearInterval(interval);
}, []);


  // ✅ Save to localStorage
  useEffect(() => {
    const token = localStorage.getItem("google_access_token");
    if (!token || userTitles.length === 0) return;
    localStorage.setItem("userTitles", JSON.stringify(userTitles));
    localStorage.setItem("userDueDates", JSON.stringify(userDueDates));
    localStorage.setItem("userStrengthWeights", JSON.stringify(userStrengthWeights));
    localStorage.setItem("manualOverrides", JSON.stringify(manualOverrides));
    localStorage.setItem("priorityScores", JSON.stringify(priorityScores));
  }, [userTitles, userDueDates, userStrengthWeights, manualOverrides, priorityScores]);

  const runModelInference = async () => {
    const token = localStorage.getItem("google_access_token");
    if (!token) {
      alert("Please sign in with Google first");
      return;
    }

    setLoading(true);
    try {
      const session = await ort.InferenceSession.create("/assignment_priority_gru.onnx");
      const { titleIndices, dueDates, strengthWeights } = preprocessData(
        userTitles,
        userDueDates,
        userStrengthWeights
      );

      const tTitles = new ort.Tensor("int64", titleIndices, [userTitles.length, 1]);
      const tDue = new ort.Tensor("float32", dueDates, [userTitles.length, 1, 1]);
      const tStrength = new ort.Tensor("float32", strengthWeights, [userTitles.length, 1, 1]);

      const results = await session.run({
        titles: tTitles,
        due_dates: tDue,
        strength_weights: tStrength,
      });

      const predicted = Array.from(results.priority_score.data);
      const validScores = predicted.map((s) => (isNaN(s) ? 0 : s));
      setPriorityScores(validScores);

      validScores.forEach((score, idx) => {
  if (userTitles[idx] && isValidDate(userDueDates[idx])) {
    const assignmentId = `${userTitles[idx].toLowerCase().replace(/[^\w\s]/g, "")}_${userDueDates[idx]}`;
    
    // 🗑️ Remove Google/manual duplicates (looser matching)
    const cleanCurrent = userTitles[idx].toLowerCase().replace(/[^\w\s]/g, "").trim();
    const eventDate = new Date(userDueDates[idx]).toISOString().split("T")[0];

    const duplicates = priorityEvents?.filter((e) => {
      if (e.isPriority) return false;
      const cleanExisting = e.title.toLowerCase().replace(/[^\w\s]/g, "").trim();
      const titleMatch = 
        cleanExisting.includes(cleanCurrent) ||
        cleanCurrent.includes(cleanExisting) ||
        cleanExisting.split(' ').some(word => cleanCurrent.includes(word));
      const dateMatch = new Date(e.start).toISOString().split("T")[0] === eventDate;
      
      return titleMatch && dateMatch;
    });
    
    duplicates?.forEach((dup) => {
      console.log(`🗑️ Removing Google duplicate "${dup.title}"`);
      removePriorityEvent(dup.id);
    });

    // Remove old priority version
    const oldPriority = priorityEvents?.find((e) => e.assignmentId === assignmentId);
    if (oldPriority) removePriorityEvent(oldPriority.id);

    // Add new priority event
    const event = {
      id: `priority_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      assignmentId,
      title: `${userTitles[idx]} (Priority: ${score.toFixed(2)})`,
      start: new Date(userDueDates[idx]),
      end: new Date(userDueDates[idx]),
      priority: score,
      confidenceWeight: userStrengthWeights[idx],
      allDay: true,
      isPriority: true,
    };
    addPriorityEvent(event);
    console.log(`✅ Added "${event.title}"`);
    



        }
      });
    } catch (err) {
      console.error("Inference error:", err);
      alert("Model inference failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Matches PyTorch training normalization exactly
  const preprocessData = (titles, dates, weights) => {
    const indexMap = Object.keys(courseVocab).reduce((acc, cat, i) => {
      acc[cat.toLowerCase()] = i;
      return acc;
    }, {});

    const titleIndices = titles.map((t) => {
      const clean = t.toLowerCase().replace(/[^\w\s]/g, "").trim();
      let idx = -1;
      Object.keys(courseVocab).forEach((cat) => {
        const lowerCourses = courseVocab[cat].map((c) =>
          c.toLowerCase().replace(/[^\w\s]/g, "").trim()
        );
        if (lowerCourses.includes(clean)) idx = indexMap[cat.toLowerCase()];
      });
      return idx !== -1 ? idx : 0;
    });

    // ✅ DYNAMIC MAX NORMALIZATION (matches training: due_days /= max_days)
    let maxDueDays = 0;
    dates.forEach((d) => {
      if (isValidDate(d)) {
        const today = new Date();
        const dd = new Date(d);
        const diff = Math.ceil((dd - today) / (1000 * 3600 * 24));
        if (diff > maxDueDays) maxDueDays = diff;
      }
    });

    const dueNormalized = dates.map((d) => {
      if (!isValidDate(d)) return 0;
      const today = new Date();
      const dd = new Date(d);
      const diff = Math.ceil((dd - today) / (1000 * 3600 * 24));
      return Math.max(0, diff / (maxDueDays || 30)); // Fallback to 30 days
    });

    // ✅ RAW STRENGTH WEIGHTS (matches training: no /10 normalization)
    const weightNorm = weights.map((w) => w || 0);

    console.log("📊 Preprocessing:", { titleIndices: titleIndices.slice(0, 3), dueNormalized: dueNormalized.slice(0, 3), weightNorm: weightNorm.slice(0, 3), maxDueDays });
    
    return { titleIndices, dueDates: dueNormalized, strengthWeights: weightNorm };
  };
const getRecommendedDueDate = (priority, dueDate, confidenceWeight = 5) => {
  if (!isValidDate(dueDate)) return "Invalid Date";

  const today = new Date();
  const dueDateObj = new Date(dueDate);
  const diffDays = Math.ceil((dueDateObj - today) / (1000 * 3600 * 24));

  // 🏗 Dynamic max: 50% of deadline OR 14 days
  const maxAdjustment = Math.min(14, diffDays * 0.5);
  
  // 🎯 COMBINED PRIORITY: 70% model + 30% inverse confidence (weak subjects = earlier)
  const modelPriority = Math.max(0, Math.min(1, priority));
  const confidenceBoost = Math.max(0, (10 - confidenceWeight) / 10); // 10=0 boost, 0=1.0 boost
  const effectivePriority = (modelPriority * 0.7) + (confidenceBoost * 0.3);
  
  const adjustment = effectivePriority * maxAdjustment;

  const recommended = new Date(dueDateObj);
  recommended.setDate(dueDateObj.getDate() - adjustment);

  // Bounds
  if (recommended < today) recommended.setTime(today.getTime());
  if (recommended > dueDateObj) recommended.setTime(dueDateObj.getTime());

  return recommended.toISOString().split("T")[0];
};





  const sortData = (data) => {
    switch (sortCriteria) {
      case "priority":
        return [...data].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      case "dueDate":
        return [...data].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case "recommendedDueDate":
      default:
        return [...data].sort(
          (a, b) => new Date(a.recommendedDueDate) - new Date(b.recommendedDueDate)
        );
    }
  };

const sortedData = sortData(
  priorityScores.map((score, i) => ({
    title: userTitles[i] || "Untitled",
    dueDate: userDueDates[i] || "No Date",
    priority: score,
    confidence: userStrengthWeights[i] || 5,  // 👈 Pass confidence
    recommendedDueDate: getRecommendedDueDate(score, userDueDates[i], userStrengthWeights[i] || 5),
  }))
);


  const isLoggedIn = !!localStorage.getItem("google_access_token");

  const handleTitleChange = (i, val) => {
    const u = [...userTitles];
    u[i] = val;
    setUserTitles(u);
  };

  const handleDueDateChange = (i, val) => {
    const u = [...userDueDates];
    u[i] = val || "";
    setUserDueDates(u);
  };

  const handleStrengthWeightChange = (i, val) => {
    const u = [...userStrengthWeights];
    u[i] = parseFloat(val) || 0;
    setUserStrengthWeights(u);
    const o = [...manualOverrides];
    o[i] = true;
    setManualOverrides(o);
  };

  return (
    <div className="container text-center">
      <h1>🎯 Priority List</h1>

      {!isLoggedIn && (
        <div style={{ background: "#ffeeee", padding: 10, marginBottom: 20 }}>
          <strong>Please sign in with Google to use Priority List</strong>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h3>🔃 Sort By:</h3>
        <select
          value={sortCriteria}
          onChange={(e) => setSortCriteria(e.target.value)}
          disabled={!isLoggedIn}
          style={{
            padding: "8px",
            fontSize: "14px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        >
          <option value="recommendedDueDate">Recommended Due Date</option>
          <option value="dueDate">Actual Due Date</option>
          <option value="priority">Priority Score</option>
        </select>
      </div>

      {priorityEvents && priorityEvents.length > 0 && (
        <div style={{ marginBottom: 20, textAlign: "left" }}>
          <h3>📅 Priority Events on Calendar</h3>
          <ul>
            {priorityEvents.map((event) => (
              <li key={event.id}>
                {event.title} - {new Date(event.start).toLocaleDateString()}
                <button
                  onClick={() => removePriorityEvent(event.id)}
                  style={{
                    marginLeft: 10,
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: 3,
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); runModelInference(); }}>
        <table className="table">
          <thead>
            <tr>
              <th>Course Title</th>
              <th>Due Date</th>
              <th>Confidence Weight</th>
            </tr>
          </thead>
          <tbody>
            {userTitles.map((title, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    value={title || ""}
                    onChange={(e) => handleTitleChange(i, e.target.value)}
                    disabled={!isLoggedIn}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={userDueDates[i] || ""}
                    onChange={(e) => handleDueDateChange(i, e.target.value)}
                    disabled={!isLoggedIn}
                  />
                </td>
                <td style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input
                    type="number"
                    value={userStrengthWeights[i] || 0}
                    onChange={(e) => handleStrengthWeightChange(i, e.target.value)}
                    min="0"
                    max="10"
                    disabled={!isLoggedIn}
                  />
                  {!manualOverrides[i] && isLoggedIn && (
                    <span style={{ fontSize: 12, color: "#28a745" }}>📚 Account</span>
                  )}
                  {manualOverrides[i] && isLoggedIn && (
                    <button type="button" onClick={() => resetToAuto(i)} style={{ fontSize: 12 }}>
                      🔄 Auto
                    </button>
                  )}
                  {isLoggedIn && (
  <button
    type="button"
    onClick={() => handleComplete(i)}
    style={{
      fontSize: 12,
      background: "#28a745",
      color: "white",
      border: "none",
      borderRadius: 3,
      padding: "4px 8px",
      cursor: "pointer",
      marginRight: "4px"  // Small spacing
    }}
  >
    ✔ Done
  </button>
)}

                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={() => deleteRow(i)}
                      style={{
                        fontSize: 12,
                        background: "#ff4444",
                        color: "white",
                        border: "none",
                        borderRadius: 3,
                        padding: "4px 8px",
                        cursor: "pointer"
                      }}
                    >
                      ❌ Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ margin: "20px 0" }}>
          <button type="button" onClick={addNewAssignment} disabled={!isLoggedIn}>
            ➕ Add Assignment
          </button>
          <button type="submit" disabled={loading || !isLoggedIn}>
            {loading ? "🤖 Analyzing..." : "🚀 Analyze & Add to Calendar"}
          </button>
          <button type="button" onClick={resetData}>
            🔄 Reset All
          </button>
        </div>
      </form>

       {priorityScores.length > 0 && !loading && (
        <div>
          <h2>
            Predicted Priority List —{" "}
            <small>Sorted by {sortCriteria.replace(/([A-Z])/g, " $1")}</small>
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Course Title</th>
                <th>Due Date</th>
                <th>Priority Score</th>
                <th>Recommended Due</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((data, i) => (
                <tr key={i}>
                  <td>{data.title}</td>
                  <td>{data.dueDate}</td>
                  <td>{data.priority.toFixed(3)}</td>
                  <td>{data.recommendedDueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ✅ Completed Assignments Table */}
          {completedAssignments.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2>✅ Completed Assignments</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Course Title</th>
                    <th>Due Date</th>
                    <th>Priority Score</th>
                    <th>Recommended Due</th>
                    <th>Completed On</th>
                  </tr>
                </thead>
                <tbody>
                  {completedAssignments.map((item, i) => (
                    <tr key={i}>
                      <td>{item.title}</td>
                      <td>{item.dueDate}</td>
                      <td>{item.priority.toFixed(3)}</td>
                      <td>{item.recommendedDueDate}</td>
                      <td>{item.completedAt}</td>
                      <button
  onClick={() => handleUndo(i)}
  style={{
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: 3,
    padding: "4px 8px",
    cursor: "pointer",
  }}
>
  ↩ Undo
</button>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}