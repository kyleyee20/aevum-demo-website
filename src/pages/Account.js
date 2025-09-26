import { useState } from "react";

export default function Account() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [school, setSchool] = useState("");
    const [picture, setPicture] = useState(null);

    const handleSave = (e) => {
        e.preventDefault();
        // In the future, save this to a database
        console.log({ name, email, school, picture });
    };

    return (
        <div className="container">
            <h1>Account</h1>
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
                <button type="submit" className="save-button">Save</button>
            </form>
        </div>
    );
}
