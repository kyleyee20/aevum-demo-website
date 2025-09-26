import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="container text-center">
            <h1>Home</h1>

            {/* Calendar placeholder */}
            <div className="calendar-placeholder">
                <h2>Calendar View</h2>
                <p>(Calendar coming soon...)</p>
            </div>

            {/* Feedback button at bottom */}
            <div className="feedback-container">
                <Link to="/Feedback.js" className="feedback-link">
                    Give Feedback
                </Link>
            </div>
        </div>
    );
}
