import React, { useState, useEffect } from "react";

export default function Account() {
  const [courseProfiles, setCourseProfiles] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [schoolVocab, setSchoolVocab] = useState({});
  const availableSchools = ["UCSD", "UCI"];
  const [newCategory, setNewCategory] = useState("");
  const [newStrength, setNewStrength] = useState(5);
  const [newNotes, setNewNotes] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = () => {
      const googleToken = localStorage.getItem("google_access_token");
      setIsSignedIn(!!googleToken);

      const savedProfiles = localStorage.getItem("courseProfiles");
      const savedSchool = localStorage.getItem("selectedSchool");
      const savedVocab = localStorage.getItem("schoolVocab");

      if (savedProfiles) {
        try {
          setCourseProfiles(JSON.parse(savedProfiles));
        } catch {
          console.error("Failed to parse saved profiles");
        }
      }

      if (savedSchool) {
        setSelectedSchool(savedSchool);
        if (googleToken) loadSchoolVocab(savedSchool);
      }

      if (savedVocab) {
        
        try {
          setSchoolVocab(JSON.parse(savedVocab));
        } catch {
          console.error("Failed to parse saved vocab");
        }
      }
    };

    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      localStorage.setItem("courseProfiles", JSON.stringify(courseProfiles));
      localStorage.setItem("selectedSchool", selectedSchool);
      localStorage.setItem("schoolVocab", JSON.stringify(schoolVocab));
    }
  }, [courseProfiles, selectedSchool, schoolVocab, isSignedIn]);

  const loadSchoolVocab = async (school) => {
    try {
      const res = await fetch(`/schools/${school.toLowerCase()}_courses.json`);
      const data = await res.json();
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

      setSchoolVocab(vocab);

          // 👇 ADD THIS ONE LINE:
    localStorage.setItem("schoolVocab", JSON.stringify(vocab));
    } catch (err) {
      console.error(`Failed to load ${school} vocab:`, err);
    }
  };

  const handleSchoolChange = (e) => {
    const school = e.target.value;
    setSelectedSchool(school);
    if (school && isSignedIn) loadSchoolVocab(school);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!isSignedIn || !newCategory.trim()) return;

    const newProfile = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      category: newCategory.trim(),
      strength: Number(newStrength),
      notes: newNotes.trim(),
    };

    setCourseProfiles((prev) => [...prev, newProfile]);
    setNewCategory("");
    setNewStrength(5);
    setNewNotes("");
  };

  const handleDeleteCategory = (id) => {
    if (!isSignedIn) return;
    setCourseProfiles((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateStrength = (id, value) => {
    if (!isSignedIn) return;
    setCourseProfiles((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, strength: Number(value) } : c
      )
    );
  };

  const handleUpdateNotes = (id, value) => {
    if (!isSignedIn) return;
    setCourseProfiles((prev) =>
      prev.map((c) => (c.id === id ? { ...c, notes: value } : c))
    );
  };

  if (!isSignedIn) {
    return (
      <div className="container">
        <h1>Learning Profile</h1>
        <div
          style={{
            background: "#ffeeee",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h2>🔒 Please sign in with Google</h2>
          <p>Your general strengths and weaknesses will appear here once you're signed in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>📊 General Strengths & Weaknesses</h1>
      <div
        style={{
          background: "#e9ffea",
          padding: "10px",
          marginBottom: "20px",
          borderRadius: "5px",
        }}
      >
        <strong>✅ Signed in — You can customize your strengths and weaknesses!</strong>
      </div>

      <div
        style={{
          marginBottom: "20px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h2>Select Your School</h2>
        <select
          value={selectedSchool}
          onChange={handleSchoolChange}
          style={{ padding: "8px", fontSize: "16px", width: "300px" }}
        >
          <option value="">Choose your school...</option>
          {availableSchools.map((school) => (
            <option key={school} value={school}>
              {school}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ Changed this: free-text input for category */}
      <form onSubmit={handleAddCategory} style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "15px", alignItems: "end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="categoryName"><strong>Category Name:</strong></label>
            <input
              id="categoryName"
              type="text"
              placeholder="Enter subject or skill (e.g., Statistics, Art History)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ padding: "8px", width: "250px" }}
              required
            />
          </div>

          <label style={{ display: "flex", alignItems: "center" }}>
            Strength (0=strong, 10=weak):
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)}
              style={{ width: "200px", marginLeft: "10px" }}
            />
            <span style={{ width: "30px", textAlign: "center", fontWeight: "bold" }}>
              {newStrength}
            </span>
          </label>

          <textarea
            placeholder="Add notes about this subject"
            rows={2}
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            style={{ width: "300px", padding: "8px" }}
          />

          <button type="submit" style={{ padding: "10px 20px" }}>
            Add Category
          </button>
        </div>
      </form>

      <div>
        <h2>Your Strengths ({courseProfiles.length})</h2>
        {courseProfiles.length === 0 ? (
          <p>Add your first category above! Ex: Math = 3, Programming = 9, Writing = 6.</p>
        ) : (
          courseProfiles.map((profile) => (
            <div
              key={profile.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "15px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {profile.category}{" "}
                  <span style={{ color: "#555" }}>
                    ({profile.strength}/10)
                  </span>
                </h3>
                <button
                  onClick={() => handleDeleteCategory(profile.id)}
                  style={{
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    padding: "8px 15px",
                    borderRadius: "4px",
                  }}
                >
                  Remove
                </button>
              </div>

              <label>
                Strength:
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={profile.strength}
                  onChange={(e) => handleUpdateStrength(profile.id, e.target.value)}
                  style={{ width: "250px", marginLeft: "10px" }}
                />
                <strong style={{ marginLeft: "10px" }}>
                  {profile.strength}/10
                </strong>
              </label>

              <label style={{ display: "block", marginTop: "10px" }}>
                Notes:
                <textarea
                  rows="2"
                  value={profile.notes}
                  onChange={(e) => handleUpdateNotes(profile.id, e.target.value)}
                  style={{ width: "100%", marginTop: "5px", padding: "8px" }}
                />
              </label>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#f0f8ff",
          borderRadius: "8px",
          borderLeft: "4px solid #007bff",
        }}
      >
        <h3>💡 How PriorityList Uses This:</h3>
        <ul>
          <li>
            Each subject’s strength auto-fills when you add new tasks in PriorityList.
          </li>
          <li>
            You can override them manually for specific assignments at any time.
          </li>
          <li>
            Your profile saves automatically and syncs with PriorityList.
          </li>
        </ul>
      </div>
    </div>
  );
}
