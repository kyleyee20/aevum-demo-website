import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web";  // Import ONNX runtime for the web

export default function PriorityList() {
  const [priorityScores, setPriorityScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courseVocab, setCourseVocab] = useState({});
  const [userTitles, setUserTitles] = useState([]);
  const [userDueDates, setUserDueDates] = useState([]);
  const [userStrengthWeights, setUserStrengthWeights] = useState([]);
  const [maxDays, setMaxDays] = useState(1); // To store max number of days for normalization
  const [sortCriteria, setSortCriteria] = useState("recommendedDueDate"); // Sorting criteria state

  // Load data from localStorage when component mounts
  useEffect(() => {
    const loadLocalStorage = () => {
      const savedTitles = JSON.parse(localStorage.getItem("userTitles") || "[]");
      const savedDueDates = JSON.parse(localStorage.getItem("userDueDates") || "[]");
      const savedStrengthWeights = JSON.parse(localStorage.getItem("userStrengthWeights") || "[]");
      const savedPriorityScores = JSON.parse(localStorage.getItem("priorityScores") || "[]");

      console.log("Loaded from localStorage:");
      console.log("Titles:", savedTitles);
      console.log("Due Dates:", savedDueDates);
      console.log("Strength Weights:", savedStrengthWeights);
      console.log("Priority Scores:", savedPriorityScores);

      if (savedTitles.length > 0 && savedDueDates.length > 0 && savedStrengthWeights.length > 0) {
        setUserTitles(savedTitles);
        setUserDueDates(savedDueDates);
        setUserStrengthWeights(savedStrengthWeights);
        if (savedPriorityScores.length > 0) {
          setPriorityScores(savedPriorityScores);
        }
      } else {
        console.log("No previous data in localStorage. Initializing with default values.");
        setUserTitles([""]);
        setUserDueDates([""]);
        setUserStrengthWeights([0]);
      }
    };

    loadLocalStorage();

    // Fetch the course vocabulary and maxDays
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

  // Save state to localStorage when any of the values change
  useEffect(() => {
    if (userTitles.length === 0 || userDueDates.length === 0 || userStrengthWeights.length === 0) {
      return; // Don't save empty data or the default values
    }
    console.log("Saving to localStorage...");
    console.log("User Titles:", userTitles);
    console.log("User Due Dates:", userDueDates);
    console.log("User Strength Weights:", userStrengthWeights);
    console.log("Priority Scores:", priorityScores);

    localStorage.setItem("userTitles", JSON.stringify(userTitles));
    localStorage.setItem("userDueDates", JSON.stringify(userDueDates));
    localStorage.setItem("userStrengthWeights", JSON.stringify(userStrengthWeights));
    localStorage.setItem("priorityScores", JSON.stringify(priorityScores)); // Save priorityScores
  }, [userTitles, userDueDates, userStrengthWeights, priorityScores]);

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
    updatedStrengthWeights[index] = parseFloat(value);
    setUserStrengthWeights(updatedStrengthWeights);
  };

  const addNewAssignment = () => {
    setUserTitles((prevTitles) => [...prevTitles, ""]);
    setUserDueDates((prevDueDates) => [...prevDueDates, ""]);
    setUserStrengthWeights((prevStrengthWeights) => [...prevStrengthWeights, 0]);
  };

  const resetData = () => {
    // Reset the state values
    setUserTitles([""]);
    setUserDueDates([""]);
    setUserStrengthWeights([0]);
    setPriorityScores([]);

    // Clear calendar events from localStorage
    localStorage.removeItem("calendarEvents");

    // Optionally, clear other relevant localStorage data like user data
    localStorage.removeItem("userTitles");
    localStorage.removeItem("userDueDates");
    localStorage.removeItem("userStrengthWeights");
    localStorage.removeItem("priorityScores");
  };

  const preprocessData = (titles, dueDates, strengthWeights) => {
    const categoryIndexMapping = Object.keys(courseVocab).reduce(
      (acc, category, index) => {
        acc[category.toLowerCase()] = index;
        return acc;
      },
      {}
    );

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

    return {
      titleIndices,
      dueDates: dueDatesNormalized,
      strengthWeights: strengthWeightsNormalized,
    };
  };

  const runModelInference = async () => {
    setLoading(true);

    try {
      const session = await ort.InferenceSession.create(
        "/assignment_priority_gru.onnx"
      );

      const { titleIndices, dueDates, strengthWeights } = preprocessData(
        userTitles,
        userDueDates,
        userStrengthWeights
      );

      const tensorTitles = new ort.Tensor("int64", titleIndices, [
        userTitles.length,
        1,
      ]);
      const tensorDueDates = new ort.Tensor("float32", dueDates, [
        userTitles.length,
        1,
        1,
      ]);
      const tensorStrengthWeights = new ort.Tensor(
        "float32",
        strengthWeights,
        [userTitles.length, 1, 1]
      );

      const results = await session.run({
        titles: tensorTitles,
        due_dates: tensorDueDates,
        strength_weights: tensorStrengthWeights,
      });

      const predictedPriorityScores = Array.from(results.priority_score.data);
      const validPriorityScores = predictedPriorityScores.map((score) => {
        if (isNaN(score)) {
          console.warn(`NaN value detected at index`);
          return 0;
        }
        return score;
      });

      setPriorityScores(validPriorityScores);

      // Create events for calendar and save them to localStorage
      const calendarEvents = userTitles.map((title, index) => {
        const dueDate = new Date(userDueDates[index]);
        return {
          title: `${title} (Priority: ${validPriorityScores[index]?.toFixed(2)})`,
          start: dueDate,
          end: dueDate, // All-day event
          priority: validPriorityScores[index] || 0,
          allDay: true,
        };
      });

      // Save to localStorage
      localStorage.setItem("calendarEvents", JSON.stringify(calendarEvents));

    } catch (error) {
      console.error("Error during inference:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runModelInference();
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
        return data.sort((a, b) =>
          new Date(a.recommendedDueDate) - new Date(b.recommendedDueDate)
        );
      default:
        return data;
    }
  };

  const sortedData = sortData(sortedTableData);

  return (
    <div className="container text-center">
      <h1>Priority List</h1>
      <form onSubmit={handleSubmit}>
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
                    onChange={(e) =>
                      handleTitleChange(index, e.target.value)
                    }
                    placeholder="Enter Course Title"
                    required
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={userDueDates[index]}
                    onChange={(e) =>
                      handleDueDateChange(index, e.target.value)
                    }
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={userStrengthWeights[index]}
                    onChange={(e) =>
                      handleStrengthWeightChange(index, e.target.value)
                    }
                    step="1"
                    min="0"
                    max="10"
                    required
                    placeholder="0 to 10"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" onClick={addNewAssignment}>
          Add New Assignment
        </button>
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Submit"}
        </button>
        {/* Reset Button */}
        <button type="button" onClick={resetData}>
          Reset
        </button>
      </form>

      <div>
        <h2>Sort By:</h2>
        <select
          value={sortCriteria}
          onChange={(e) => setSortCriteria(e.target.value)}
        >
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
                  <td>
                    {isNaN(data.priority)
                      ? "Invalid"
                      : data.priority.toFixed(3)}
                  </td>
                  <td>
                    {isNaN(data.priority)
                      ? "Invalid"
                      : data.recommendedDueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
