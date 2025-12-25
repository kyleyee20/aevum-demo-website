import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web";

export default function PriorityList({ priorityEvents, addPriorityEvent, removePriorityEvent }) {
  const [priorityScores, setPriorityScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courseVocab, setCourseVocab] = useState({});
  const [userTitles, setUserTitles] = useState([]);
  const [userDueDates, setUserDueDates] = useState([]);
  const [userStrengthWeights, setUserStrengthWeights] = useState([]);
  const [maxDays, setMaxDays] = useState(1);
  const [sortCriteria, setSortCriteria] = useState("recommendedDueDate");

useEffect(() => {
  const checkTokenAndLoad = () => {
    const googleToken = localStorage.getItem('google_access_token');
    
    if (!googleToken) {
      console.log("🔴 No token - clearing UI state only");
      setUserTitles([""]);
      setUserDueDates([""]);
      setUserStrengthWeights([0]);
      setPriorityScores([]);
      return;
    }
    
    console.log("🟢 Token found - loading form data");
    
    // DEBUG: Log RAW localStorage data
    const rawTitles = localStorage.getItem("userTitles");
    const rawDueDates = localStorage.getItem("userDueDates");
    const rawStrengths = localStorage.getItem("userStrengthWeights");
    const rawScores = localStorage.getItem("priorityScores");
    
    console.log("📦 RAW localStorage:");
    console.log("Titles:", rawTitles);
    console.log("DueDates:", rawDueDates);
    console.log("Strengths:", rawStrengths);
    console.log("Scores:", rawScores);
    
    const savedTitles = JSON.parse(rawTitles || "[]");
    const savedDueDates = JSON.parse(rawDueDates || "[]");
    const savedStrengthWeights = JSON.parse(rawStrengths || "[]");
    const savedPriorityScores = JSON.parse(rawScores || "[]");

    console.log("🔍 PARSED data:");
    console.log("savedTitles:", savedTitles);
    console.log("savedDueDates:", savedDueDates);
    console.log("savedStrengthWeights:", savedStrengthWeights);
    console.log("savedPriorityScores:", savedPriorityScores);

    console.log("📊 Length check:", {
      titlesLen: savedTitles.length,
      dueDatesLen: savedDueDates.length,
      strengthsLen: savedStrengthWeights.length
    });

    if (savedTitles.length > 0 && savedDueDates.length > 0 && savedStrengthWeights.length > 0) {
      console.log("✅ SETTING STATE with data...");
      setUserTitles(savedTitles);
      setUserDueDates(savedDueDates);
      setUserStrengthWeights(savedStrengthWeights);
      setPriorityScores(savedPriorityScores);
      
      // Force re-render
      setSortCriteria("recommendedDueDate");
      
      // DEBUG: Log CURRENT state (after setState - async so might be delayed)
      setTimeout(() => {
        console.log("🎯 CURRENT STATE after set:");
        console.log("userTitles state:", JSON.parse(localStorage.getItem("userTitles") || "[]"));
        console.log("userTitles.length:", JSON.parse(localStorage.getItem("userTitles") || "[]").length);
      }, 100);
      
      console.log(`✅ Restored ${savedTitles.length} assignments to UI!`);
    } else {
      console.log("❌ No valid data - setting defaults");
      setUserTitles([""]);
      setUserDueDates([""]);
      setUserStrengthWeights([0]);
    }
  };

  const tokenInterval = setInterval(checkTokenAndLoad, 1000);
  return () => clearInterval(tokenInterval);
}, []);



  // Fetch course vocab
  useEffect(() => {
    fetch("/ucsd_courses.json")
      .then((response) => response.json())
      .then((data) => {
        const vocab = {};
        let currentCategory = null;

        data.forEach((item) => {
          const category = item["Table 1"];
          const course = item["Unnamed: 1"];

          if (category && category.trim()) {
            currentCategory = category.trim();
          }

          if (course && course.trim()) {
            if (!vocab[currentCategory]) {
              vocab[currentCategory] = [];
            }
            vocab[currentCategory].push(course.trim());
          }
        });

        setCourseVocab(vocab);
      })
      .catch((error) => {
        console.error("Error loading course vocab JSON:", error);
      });

    setMaxDays(365);
  }, []);

  // Save data only when logged in
  useEffect(() => {
    const googleToken = localStorage.getItem('google_access_token');
    if (!googleToken || userTitles.length === 0 || userDueDates.length === 0 || userStrengthWeights.length === 0) {
      return;
    }
    
    localStorage.setItem("userTitles", JSON.stringify(userTitles));
    localStorage.setItem("userDueDates", JSON.stringify(userDueDates));
    localStorage.setItem("userStrengthWeights", JSON.stringify(userStrengthWeights));
    localStorage.setItem("priorityScores", JSON.stringify(priorityScores));
  }, [userTitles, userDueDates, userStrengthWeights, priorityScores]);

  const runModelInference = async () => {
    const googleToken = localStorage.getItem('google_access_token');
    if (!googleToken) {
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

      const tensorTitles = new ort.Tensor("int64", titleIndices, [userTitles.length, 1]);
      const tensorDueDates = new ort.Tensor("float32", dueDates, [userTitles.length, 1, 1]);
      const tensorStrengthWeights = new ort.Tensor("float32", strengthWeights, [userTitles.length, 1, 1]);

      const results = await session.run({
        titles: tensorTitles,
        due_dates: tensorDueDates,
        strength_weights: tensorStrengthWeights,
      });

      const predictedPriorityScores = Array.from(results.priority_score.data);
      const validPriorityScores = predictedPriorityScores.map((score) => (isNaN(score) ? 0 : score));
      setPriorityScores(validPriorityScores);

      // Add to calendar with unique IDs
      validPriorityScores.forEach((score, index) => {
        if (userTitles[index] && userDueDates[index]) {
          const event = {
            id: `priority_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            title: `${userTitles[index]} (Priority: ${score.toFixed(2)})`,
            start: new Date(userDueDates[index]),
            end: new Date(userDueDates[index]),
            priority: score,
            allDay: true,
            isPriority: true,
          };
          addPriorityEvent(event);
        }
      });
    } catch (error) {
      console.error("Error during inference:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (index, value) => {
    const updatedTitles = [...userTitles];
    updatedTitles[index] = value;
    setUserTitles(updatedTitles);
  };

  const handleDueDateChange = (index, value) => {
    const updatedDueDates = [...userDueDates];
    updatedDueDates[index] = value;
    setUserDueDates(updatedDueDates);
  };

  const handleStrengthWeightChange = (index, value) => {
    const updatedStrengthWeights = [...userStrengthWeights];
    updatedStrengthWeights[index] = parseFloat(value) || 0;
    setUserStrengthWeights(updatedStrengthWeights);
  };

  const addNewAssignment = () => {
    setUserTitles((prevTitles) => [...prevTitles, ""]);
    setUserDueDates((prevDueDates) => [...prevDueDates, new Date().toISOString().split('T')[0]]);
    setUserStrengthWeights((prevStrengthWeights) => [...prevStrengthWeights, 0]);
  };

  const resetData = () => {
    setUserTitles([""]);
    setUserDueDates([""]);
    setUserStrengthWeights([0]);
    setPriorityScores([]);
    localStorage.removeItem("userTitles");
    localStorage.removeItem("userDueDates");
    localStorage.removeItem("userStrengthWeights");
    localStorage.removeItem("priorityScores");
  };

  const preprocessData = (titles, dueDates, strengthWeights) => {
    const categoryIndexMapping = Object.keys(courseVocab).reduce((acc, category, index) => {
      acc[category.toLowerCase()] = index;
      return acc;
    }, {});

    const titleIndices = titles.map((title) => {
      const titleLower = title.toLowerCase().replace(/[^\w\s]/g, "").trim();
      let categoryIndex = -1;

      Object.keys(courseVocab).forEach((category) => {
        const courseTitlesLower = courseVocab[category].map((course) =>
          course.toLowerCase().replace(/[^\w\s]/g, "").trim()
        );
        if (courseTitlesLower.includes(titleLower)) {
          categoryIndex = categoryIndexMapping[category.toLowerCase()];
        }
      });

      return categoryIndex !== -1 ? categoryIndex : 0;
    });

    const dueDatesNormalized = dueDates.map((date) => {
      const today = new Date();
      const dueDate = new Date(date);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 3600 * 24));
      return diffDays / maxDays;
    });

    const strengthWeightsNormalized = strengthWeights.map((weight) => weight / 10);

    return { titleIndices, dueDates: dueDatesNormalized, strengthWeights: strengthWeightsNormalized };
  };

  const getRecommendedDueDate = (priority, dueDate) => {
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    const adjustment = (1 - priority) * 7;

    const recommendedDueDate = new Date(dueDateObj);
    recommendedDueDate.setDate(dueDateObj.getDate() - adjustment);

    if (recommendedDueDate < today) {
      recommendedDueDate.setTime(today.getTime());
    }

    if (recommendedDueDate > dueDateObj) {
      recommendedDueDate.setTime(dueDateObj.getTime());
    }

    return recommendedDueDate.toISOString().split("T")[0];
  };

  const sortedTableData = priorityScores.map((score, index) => {
    const recommendedDueDate = getRecommendedDueDate(score, userDueDates[index]);
    return {
      title: userTitles[index],
      dueDate: userDueDates[index],
      priority: score,
      recommendedDueDate,
    };
  });

  const sortData = (data) => {
    switch (sortCriteria) {
      case "priority":
        return data.sort((a, b) => b.priority - a.priority);
      case "dueDate":
        return data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case "recommendedDueDate":
        return data.sort((a, b) => new Date(a.recommendedDueDate) - new Date(b.recommendedDueDate));
      default:
        return data;
    }
  };

  const sortedData = sortData(sortedTableData);

  return (
    <div className="container text-center">
      <h1>Priority List</h1>
      
      {/* Show login status */}
      {!localStorage.getItem('google_access_token') && (
        <div style={{ background: '#ffeeee', padding: '10px', marginBottom: '20px', borderRadius: '5px' }}>
          <strong>Please sign in with Google to use Priority List</strong>
        </div>
      )}
      
      {/* Priority Events on Calendar */}
      {priorityEvents && priorityEvents.length > 0 && (
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <h3>Priority Events on Calendar:</h3>
          <ul>
            {priorityEvents.map((event) => (
              <li key={event.id}>
                {event.title} - {new Date(event.start).toLocaleDateString()}
                <button 
                  onClick={() => removePriorityEvent(event.id)}
                  style={{ marginLeft: '10px', background: '#ff4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}
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
            {userTitles.map((title, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                    placeholder="Enter Course Title"
                    required
                    disabled={!localStorage.getItem('google_access_token')}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={userDueDates[index]}
                    onChange={(e) => handleDueDateChange(index, e.target.value)}
                    required
                    disabled={!localStorage.getItem('google_access_token')}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={userStrengthWeights[index]}
                    onChange={(e) => handleStrengthWeightChange(index, e.target.value)}
                    step="1"
                    min="0"
                    max="10"
                    required
                    placeholder="0 to 10"
                    disabled={!localStorage.getItem('google_access_token')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" onClick={addNewAssignment} disabled={!localStorage.getItem('google_access_token')}>
          Add New Assignment
        </button>
        <button type="submit" disabled={loading || !localStorage.getItem('google_access_token')}>
          {loading ? "Loading..." : "Analyze & Add to Calendar"}
        </button>
        <button type="button" onClick={resetData}>
          Reset
        </button>
      </form>

      <div>
        <h2>Sort By:</h2>
        <select value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)} disabled={!localStorage.getItem('google_access_token')}>
          <option value="recommendedDueDate">Recommended Due Date</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
        </select>
      </div>

      {priorityScores.length > 0 && !loading && (
        <div>
          <h2>Predicted Priority List</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Course Title</th>
                <th>Due Date</th>
                <th>Priority Score</th>
                <th>Recommended Due Date</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((data, index) => (
                <tr key={index}>
                  <td>{data.title}</td>
                  <td>{data.dueDate}</td>
                  <td>{isNaN(data.priority) ? "Invalid" : data.priority.toFixed(3)}</td>
                  <td>{isNaN(data.priority) ? "Invalid" : data.recommendedDueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
