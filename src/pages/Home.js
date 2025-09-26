import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="container">
            <h1>Welcome to the Demo Website</h1>

            <div className="calendar-placeholder">
                <p>Calendar will appear here in the future</p>
            </div>

            <div className="feedback-container">
                <Link to="/feedback" className="feedback-link">
                    Give Feedback
                </Link>
            </div>
        </div>
    );
}
