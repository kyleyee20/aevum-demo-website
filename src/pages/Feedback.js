import { useState } from "react";

export default function Feedback() {
    const [feedback, setFeedback] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // In the future, store feedback in a database
        console.log(feedback);
        setFeedback("");
    };

    return (
        <div className="container">
            <h1>Feedback</h1>
            <form className="feedback-form" onSubmit={handleSubmit}>
                <textarea
                    placeholder="Please send me an email at bvinh@ucsd.edu"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                />
                <button type="submit" className="submit-button">Submit</button>
            </form>
        </div>
    );
}
