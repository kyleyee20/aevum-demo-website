import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar">
            <Link to="/">Home</Link>
            <Link to="/account">Account</Link>
            <Link to="/help">Help Guide</Link>
            <Link to="/feedback">Feedback</Link>
        </nav>
    );
}
