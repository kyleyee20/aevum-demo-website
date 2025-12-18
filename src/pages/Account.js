import React, { useState, useEffect } from "react";

export default function Account() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [picture, setPicture] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSchool, setLoginSchool] = useState("");
  const [createAccountMode, setCreateAccountMode] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    const savedEmail = localStorage.getItem("email");
    const savedSchool = localStorage.getItem("school");
    const savedPicture = localStorage.getItem("picture");
    const savedLoginStatus = localStorage.getItem("isLoggedIn");

    if (savedLoginStatus === "true") {
      setIsLoggedIn(true);
      setName(savedName);
      setEmail(savedEmail);
      setSchool(savedSchool);
      if (savedPicture) {
        setPicture(savedPicture);
      }
      // Log the logged-in user info
      console.log("Logged in user info:", { savedName, savedEmail, savedSchool, savedPicture });
    }

    // Log the data saved in localStorage for debugging
    console.log("LocalStorage data:", {
      savedName,
      savedEmail,
      savedSchool,
      savedPicture,
      savedLoginStatus,
    });
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("name", name.trim());
    localStorage.setItem("email", email.trim());
    localStorage.setItem("school", school.trim());
    if (picture) {
      const pictureURL = URL.createObjectURL(picture);
      localStorage.setItem("picture", pictureURL);
    }
    // Log the saved account info
    console.log("Account saved:", { name, email, school, picture });
  };

  const handleLogin = () => {
    // Retrieve data from localStorage
    const savedName = localStorage.getItem("name");
    const savedEmail = localStorage.getItem("email");
    const savedSchool = localStorage.getItem("school");

    // Trim input values to avoid spaces causing login to fail
    const loginNameTrimmed = loginName.trim();
    const loginEmailTrimmed = loginEmail.trim();
    const loginSchoolTrimmed = loginSchool.trim();

    // Log data for debugging
    console.log("Login check:", { savedName, savedEmail, savedSchool, loginNameTrimmed, loginEmailTrimmed, loginSchoolTrimmed });

    // Check if entered login credentials match stored ones
    if (
      loginNameTrimmed === savedName?.trim() &&
      loginEmailTrimmed === savedEmail?.trim() &&
      loginSchoolTrimmed === savedSchool?.trim()
    ) {
      setIsLoggedIn(true); // Set to true if login is successful
      localStorage.setItem("isLoggedIn", "true"); // Store login status in localStorage
      console.log("Login successful! User info:", { savedName, savedEmail, savedSchool });

      setName(savedName);
      setEmail(savedEmail);
      setSchool(savedSchool);
    } else {
      alert("Incorrect details. Please try again.");
    }
  };

  const handleLogout = () => {
    // Remove user data and reset login status in localStorage
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("school");
    localStorage.removeItem("picture");
    localStorage.removeItem("calendarEvents");
    localStorage.removeItem("priorityScores");

    // Reset state variables to reflect logged-out state
    setName("");
    setEmail("");
    setSchool("");
    setPicture(null);
    setIsLoggedIn(false); // Set login state to false
    console.log("Logged out!");
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();

    // Check if the user already has an account (based on email or name)
    const savedName = localStorage.getItem("name");
    const savedEmail = localStorage.getItem("email");
    const savedSchool = localStorage.getItem("school");

    // Log the current saved info for debugging
    console.log("Checking if account already exists:", {
      savedName,
      savedEmail,
      savedSchool,
      loginName,
      loginEmail,
      loginSchool
    });

    // Check if account already exists based on saved localStorage data
    if (savedName && savedEmail && savedSchool) {
      alert("Account already exists. Please log in.");
      return;
    }

    // Save new account info in localStorage and log the user in
    localStorage.setItem("name", loginName.trim());
    localStorage.setItem("email", loginEmail.trim());
    localStorage.setItem("school", loginSchool.trim());
    localStorage.setItem("isLoggedIn", "true");

    setIsLoggedIn(true);
    console.log("Account created successfully! Account info:", { loginName, loginEmail, loginSchool });

    // Automatically log the user in after creating the account
    setName(loginName.trim());
    setEmail(loginEmail.trim());
    setSchool(loginSchool.trim());
  };

  return (
    <div className="container">
      <h1>Account</h1>

      {isLoggedIn ? (
        // If logged in, show account form
        <div>
          <form className="account-form" onSubmit={handleSave}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="School"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
            <input
              type="file"
              onChange={(e) => setPicture(e.target.files[0])}
            />
            <button type="submit" className="save-button">
              Save
            </button>
          </form>

          <div className="profile-info">
            <h2>Profile Info</h2>
            {name && <p>Name: {name}</p>}
            {email && <p>Email: {email}</p>}
            {school && <p>School: {school}</p>}
            {picture && (
              <img
                src={picture}
                alt="Profile"
                style={{ width: "100px", height: "100px" }}
              />
            )}
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        // If not logged in, show login or create account form
        <div>
          <h2>{createAccountMode ? "Create Account" : "Login"}</h2>

          {createAccountMode ? (
            <div>
              <input
                type="text"
                placeholder="Name"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="School"
                value={loginSchool}
                onChange={(e) => setLoginSchool(e.target.value)}
              />
              <button type="button" onClick={handleCreateAccount}>
                Create Account
              </button>
              <p>
                Already have an account?{" "}
                <button type="button" onClick={() => setCreateAccountMode(false)}>
                  Login
                </button>
              </p>
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Name"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="School"
                value={loginSchool}
                onChange={(e) => setLoginSchool(e.target.value)}
              />
              <button type="button" onClick={handleLogin}>
                Login
              </button>
              <p>
                Don't have an account?{" "}
                <button type="button" onClick={() => setCreateAccountMode(true)}>
                  Create Account
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
