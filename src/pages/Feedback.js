import { useState } from "react";

export default function Feedback() {
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="container">
            <h1>Feedback Page</h1>
            <p>We’d love your feedback! (Demo only)</p>

            {!submitted ? (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "400px" }}>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter your feedback here..." rows="5" />
                    <button type="submit">Submit</button>
                </form>
            ) : (
                <div className="card">
                    <h2>Thank you for your feedback!</h2>
                    <p><strong>You wrote:</strong></p>
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
}
