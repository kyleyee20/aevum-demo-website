import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import HelpGuide from "./pages/HelpGuide";
import PriorityList from "./pages/PriorityList";
import Account from "./pages/Account";
import Feedback from "./pages/Feedback";

import "./App.css";

function App() {
  return (
    <Router>
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">My Website</h2>
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/priority">Priority List</Link>
          </li>
          <li>
            <Link to="/help">Help Guide</Link>
          </li>
          <li>
            <Link to="/account">Account</Link>
          </li>
        </ul>
      </nav>

      {/* Page Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/priority" element={<PriorityList />} />
        <Route path="/help" element={<HelpGuide />} />
        <Route path="/account" element={<Account />} />
        <Route path="/feedback" element={<Feedback />} />
      </Routes>
    </Router>
  );
}

export default App;
