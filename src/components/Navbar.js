import { Link } from "react-router-dom";

export default function Navbar() {
    return (
<nav className="navbar">
  <h2 className="logo">My Website</h2>   {/* This goes left */}
  <ul className="nav-links">
    <li><Link to="/">Home</Link></li>
    <li><Link to="/priority">Priority List</Link></li>
    <li><Link to="/help">Help Guide</Link></li>
    <li><Link to="/account">Account</Link></li>
  </ul>
</nav>

    );
}
