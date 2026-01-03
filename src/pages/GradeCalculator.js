import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function GradeCalculator() {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const loadPriorityCourses = () => {
  try {
    const activeTitles = JSON.parse(localStorage.getItem("userTitles") || "[]");
    const completedAssignments = JSON.parse(localStorage.getItem("completedAssignments") || "[]");
    const completedTitles = completedAssignments.map(item => item.title).filter(Boolean);
    const allTitles = [...activeTitles, ...completedTitles];
    
    const courseCodes = allTitles
      .filter(title => title && title.trim())
      .map(title => {
        const trimmed = title.trim();
        const codeMatch = trimmed.match(/^([A-Z]{2,4}\s*\d+[A-Z]?)/i);
        return codeMatch ? codeMatch[1].toUpperCase().trim() : null;
      })
      .filter(code => code && code.length >= 4 && code.length <= 8)
      .filter((code, index, self) => self.indexOf(code) === index)
      .slice(0, 10);

    console.log(`📚 Found ${courseCodes.length} course codes:`, courseCodes);

    // ✅ FIXED: Check localStorage instead of React state
    const savedCourses = JSON.parse(localStorage.getItem("gradeCalculatorCourses") || "[]");
    const existingCourseNames = savedCourses.map(c => c.name.toUpperCase());
    const newCourseCodes = courseCodes.filter(code => !existingCourseNames.includes(code));
    
    console.log(`✅ ${newCourseCodes.length} NEW courses (existing: ${savedCourses.length})`);

    if (newCourseCodes.length > 0) {
      const newCourses = newCourseCodes.map((courseCode) => ({
        id: `priority_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: courseCode,
        source: "priorityList",
        gradeScale: {
          Aplus: 97, A: 94, Aminus: 90, Bplus: 87, B: 83, 
          Bminus: 80, Cplus: 77, C: 73, Cminus: 70, D: 60
        },
        assignments: [
          { name: "Midterm", grade: "", weight: 40 },
          { name: "Final", grade: "", weight: 40 },
          { name: "Homework", grade: "", weight: 10 },
          { name: "Quizzes", grade: "", weight: 10 }
        ]
      }));

      setCourses(prevCourses => {
        const updated = [...prevCourses, ...newCourses];
        console.log(`📚 Added ${newCourses.length} new courses. Total: ${updated.length}`);
        return updated;
      });

      if (newCourses.length > 0 && !activeCourseId) {
        setActiveCourseId(newCourses[0].id);
      }
    } else {
      console.log("✅ No new courses to add");
    }
  } catch (error) {
    console.log("❌ Priority courses error:", error);
  }
};
// 🔥 ON-PAGE-LOAD Sync: Check Priority List once when GradeCalculator opens
useEffect(() => {
  const token = localStorage.getItem("google_access_token");
  if (!token) return;
  
  // Small delay to ensure localStorage is loaded
  const timer = setTimeout(() => {
    console.log("🔍 Page opened → checking Priority List...");
    loadPriorityCourses();
  }, 1000);
  
  return () => clearTimeout(timer);
}, []); // 👈 Runs ONCE when page opens



 // 🔥 NEW 1/3 - LOAD ON MOUNT (AFTER loadPriorityCourses function)
useEffect(() => {
  const checkTokenAndLoad = () => {
    // 🔐 ALWAYS load from localStorage FIRST (data never dies)
    try {
      const savedCourses = JSON.parse(localStorage.getItem("gradeCalculatorCourses") || "[]");
      
      if (savedCourses.length > 0) {
        console.log("📊 LOADED", savedCourses.length, "courses from localStorage");
        
        const token = localStorage.getItem("google_access_token");
        if (!token) {
          console.log("🚪 Signed out → blank UI (data preserved)");
          setCourses([]);  
          setActiveCourseId(null);
        } else {
          // ✅ FIXED: Only set activeCourseId if it's null (don't override user selection)
          setCourses(savedCourses);
          if (!activeCourseId) {  // 👈 ONLY set if no course selected
            setActiveCourseId(savedCourses[0]?.id || null);
          }
        }
        setIsLoadingCourses(false);
        return;
      }
    } catch (e) {
      console.log("❌ Load error:", e);
    }

    // No saved data → try priority courses (only if signed in)
    const token = localStorage.getItem("google_access_token");
    if (token) {
      loadPriorityCourses();
    } else {
      setCourses([]);
      setActiveCourseId(null);
    }
    
    setIsLoadingCourses(false);
  };

  checkTokenAndLoad();
// eslint-disable-next-line
}, []); // 👈 Keep empty deps



// 🔥 NEW 2/3 - SAVE EVERYWHERE (right after load useEffect)
useEffect(() => {
  if (courses.length === 0) return;
  
  console.log("💾 SAVING", courses.length, "courses");
  localStorage.setItem("gradeCalculatorCourses", JSON.stringify(courses));
  
  const token = localStorage.getItem("google_access_token");
  if (token) {
    const userCoursesKey = `gradeCalculatorCourses_${token.slice(-10)}`;
    localStorage.setItem(userCoursesKey, JSON.stringify(courses));
    console.log("✅ Google sync too");
  }
  console.log("✅ FULLY SYNCED");
}, [courses]);

// 🔥 NEW 3/3 - LIGHT TOKEN MONITOR (right after save useEffect)
useEffect(() => {
  const checkToken = () => {
    const token = localStorage.getItem("google_access_token");
    if (!token) return;
    
    const userCoursesKey = `gradeCalculatorCourses_${token.slice(-10)}`;
    try {
      const googleSaved = JSON.parse(localStorage.getItem(userCoursesKey) || "[]");
      if (googleSaved.length > 0 && JSON.stringify(googleSaved) !== JSON.stringify(courses)) {
        console.log("🔄 Google → local sync");
        setCourses(googleSaved);
      }
    } catch (e) {}
  };
  
  const interval = setInterval(checkToken, 2000);
  return () => clearInterval(interval);
  // eslint-disable-next-line
}, []);



// When creating a new course
const addCourse = () => {
  const newCourse = {
    id: `course${courses.length + 1}`,
    name: `Course ${courses.length + 1}`,
    assignments: [
      { name: "Midterm", grade: "", weight: 40 },
      { name: "Final", grade: "", weight: 40 },
      { name: "Homework", grade: "", weight: 10 },
      { name: "Quizzes", grade: "", weight: 10 }
    ],
    gradeScale: {
  Aplus: 97, A: 94, Aminus: 90, Bplus: 87, B: 83, 
  Bminus: 80, Cplus: 77, C: 73, Cminus: 70, D: 60
}

  };
  setCourses([...courses, newCourse]);
  setActiveCourseId(newCourse.id);
};

const updateGradeScale = (courseId, key, value) => {
  setCourses(courses.map(course =>
    course.id === courseId
      ? {
          ...course,
          gradeScale: {
            ...course.gradeScale,
            [key]: value === "" ? null : parseFloat(value) || 90  // null = use default
          }
        }
      : course
  ));
};


const getLetterGradeForCourse = (percentage, course) => {
  const scale = course.gradeScale || {};
  const p = percentage;

  if (p >= (scale.A ?? 93)) return "A";
  if (p >= (scale.Aminus ?? 90)) return "A-";
  if (p >= (scale.Bplus ?? 87)) return "B+";
  if (p >= (scale.B ?? 83)) return "B";
  if (p >= (scale.Bminus ?? 80)) return "B-";
  if (p >= (scale.Cplus ?? 77)) return "C+";
  if (p >= (scale.C ?? 73)) return "C";
  if (p >= (scale.Cminus ?? 70)) return "C-";
  if (p >= (scale.D ?? 60)) return "D";
  return "F";
};



  const updateCourseName = (courseId, name) => {
    setCourses(courses.map(course => 
      course.id === courseId ? { ...course, name } : course
    ));
  };

  const deleteCourse = (courseId) => {
    const newCourses = courses.filter(course => course.id !== courseId);
    setCourses(newCourses);
    if (newCourses.length === 0) {
      setActiveCourseId(null);
    } else if (activeCourseId === courseId) {
      setActiveCourseId(newCourses[0]?.id);
    }
  };

  const addAssignment = () => {
    const activeCourse = courses.find(c => c.id === activeCourseId);
    if (!activeCourse) return;
    
    const newAssignment = { 
      name: `Assignment ${activeCourse.assignments.length + 1}`, 
      grade: "", 
      weight: 10 
    };
    setCourses(courses.map(course =>
      course.id === activeCourseId
        ? { ...course, assignments: [...course.assignments, newAssignment] }
        : course
    ));
  };

  const removeAssignment = (courseId, assignmentIndex) => {
    const course = courses.find(c => c.id === courseId);
    if (!course || course.assignments.length <= 2) return;

    const newAssignments = course.assignments.filter((_, i) => i !== assignmentIndex);
    const totalWeight = newAssignments.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
    
    if (totalWeight > 0) {
      newAssignments.forEach((assignment) => {
        assignment.weight = ((parseFloat(assignment.weight) || 0) / totalWeight * 100).toFixed(1);
      });
    }

    setCourses(courses.map(course =>
      course.id === courseId ? { ...course, assignments: newAssignments } : course
    ));
  };

  const updateAssignment = (courseId, assignmentIndex, field, value) => {
    setCourses(courses.map(course =>
      course.id === courseId
        ? {
            ...course,
            assignments: course.assignments.map((assignment, i) =>
              i === assignmentIndex ? { ...assignment, [field]: value } : assignment
            )
          }
        : course
    ));
  };

const calculateGrade = () => {
  const activeCourse = courses.find(c => c.id === activeCourseId);
  if (!activeCourse) return null;
  
  const totalWeighted = activeCourse.assignments.reduce((sum, assignment) => {
    const grade = parseFloat(assignment.grade) || 0;
    const weight = parseFloat(assignment.weight) || 0;
    return sum + (grade * weight / 100);
  }, 0);

  const totalWeight = activeCourse.assignments.reduce(
    (sum, assignment) => sum + (parseFloat(assignment.weight) || 0),
    0
  );

  const finalGrade = totalWeight > 0 ? totalWeighted : 0;
  

  return {
    finalGrade,
    letterGrade: getLetterGradeForCourse(finalGrade, activeCourse),
    totalWeight
  };
};
const getDefaultGrade = (key) => {
  const defaults = {
    Aplus: 97, A: 94, Aminus: 90, Bplus: 87, B: 83, 
    Bminus: 80, Cplus: 77, C: 73, Cminus: 70, D: 60
  };
  return defaults[key] || 60;
};



  const result = calculateGrade();
  const activeCourse = courses.find(c => c.id === activeCourseId);
  

  return (
    <div className="container" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1>📊 Grade Calculator</h1>
        <div>
          <Link to="/" style={{ color: "#007bff", textDecoration: "none", marginRight: "20px" }}>← Home</Link>
          <button
            onClick={addCourse}
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
            disabled={isLoadingCourses}
          >
            ➕ New Course
          </button>
        </div>
      </div>

      {isLoadingCourses && (
        <div style={{ 
          textAlign: "center", 
          padding: "60px 20px", 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "12px"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "20px" }}>🔄 Loading your courses...</div>
          <div style={{ fontSize: "16px", opacity: 0.9 }}>
            {localStorage.getItem("google_access_token") ? "Loading Google-synced grades..." : "Pulling from Priority List..."}
          </div>
        </div>
      )}

      {!isLoadingCourses && (
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "15px" }}>
            📚 Your Courses 
            <span style={{ fontSize: "14px", color: "#6c757d", marginLeft: "10px" }}>
              ({courses.length})
            </span>
          </h3>
          {courses.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px", 
              background: "#f8f9fa", 
              borderRadius: "12px",
              border: "2px dashed #dee2e6"
            }}>
              <p style={{ color: "#6c757d", fontSize: "16px", marginBottom: "20px" }}>
                No courses found. 
              </p>
              <p style={{ color: "#495057", fontSize: "14px" }}>
                Create assignments in <Link to="/priority" style={{ color: "#007bff" }}>Priority List</Link> 
                or add courses manually 👆
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setActiveCourseId(course.id)}
                  style={{
                    background: activeCourseId === course.id ? "#007bff" : "#f8f9fa",
                    color: activeCourseId === course.id ? "white" : "#333",
                    border: `2px solid ${activeCourseId === course.id ? "#0056b3" : "#007bff"}`,
                    padding: "10px 16px",
                    borderRadius: "25px",
                    cursor: "pointer",
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                    position: "relative"
                  }}
                  title={course.source === "priorityList" ? "From Priority List" : "Saved grades"}
                >
                  {course.name}
                  {course.source === "priorityList" && (
                    <span style={{ fontSize: "10px", marginLeft: "4px" }}>📚</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeCourse && !isLoadingCourses && (
        <div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "20px",
            padding: "15px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <input
              type="text"
              value={activeCourse.name}
              onChange={(e) => updateCourseName(activeCourse.id, e.target.value)}
              style={{
                border: "none",
                background: "white",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "18px",
                fontWeight: "bold",
                width: "300px"
              }}
              placeholder="Course name"
            />
            <div>
              {courses.length > 1 && (
                <button
                  onClick={() => deleteCourse(activeCourse.id)}
                  style={{
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginRight: "10px"
                  }}
                >
                  🗑️ Delete Course
                </button>
              )}
            </div>
          </div>
              {/* ✅ NEW Grade scale editor - INSERTED HERE */}
    <div
      style={{
        marginBottom: "20px",
        padding: "15px",
        background: "#e9ecef",
        borderRadius: "8px",
        fontSize: "14px"
      }}
    >
      <h4 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>📐 Custom Grade Scale (%)</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "13px" }}>
        {[
            ["Aplus","A+"],
          ["A", "A"],
          ["Aminus", "A-"],
          ["Bplus", "B+"],
          ["B", "B"],
          ["Bminus", "B-"],
          ["Cplus", "C+"],
          ["C", "C"],
          ["Cminus", "C-"],
          ["D", "D"]
        ].map(([key, label]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
            {label} ≥
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={activeCourse.gradeScale?.[key] ?? getDefaultGrade(key)}
              onChange={e => updateGradeScale(activeCourse.id, key, e.target.value)}
              style={{ 
                width: "65px", 
                padding: "4px 6px", 
                border: "1px solid #ddd", 
                borderRadius: "4px",
                fontSize: "13px"
              }}
            />
            %
          </label>
        ))}
      </div>
    </div>

          <table className="table" style={{ marginBottom: "20px" }}>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Grade (%)</th>
                <th>Weight (%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeCourse.assignments.map((assignment, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={assignment.name}
                      onChange={(e) => updateAssignment(activeCourse.id, index, "name", e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={assignment.grade}
                      onChange={(e) => updateAssignment(activeCourse.id, index, "grade", e.target.value)}
                      style={{ width: "80px", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={assignment.weight}
                      onChange={(e) => updateAssignment(activeCourse.id, index, "weight", e.target.value)}
                      style={{ width: "70px", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </td>
                  <td>
                    {activeCourse.assignments.length > 2 && (
                      <button
                        onClick={() => removeAssignment(activeCourse.id, index)}
                        style={{
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          cursor: "pointer"
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={addAssignment}
              style={{
                background: "#28a745",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
                marginRight: "10px"
              }}
            >
              ➕ Add Assignment
            </button>
          </div>

          {result && (
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}>
              <h2 style={{ margin: "0 0 10px 0", fontSize: "2.5em" }}>
                {result.finalGrade.toFixed(1)}%
              </h2>
              <h3 style={{ margin: "0 0 20px 0" }}>{result.letterGrade}</h3>
              <p style={{ margin: 0, fontSize: "1.1em" }}>
                Total Weight: {result.totalWeight.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
