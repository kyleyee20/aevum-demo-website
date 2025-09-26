import { useState, useEffect } from "react";

export default function Account() {
    const [form, setForm] = useState({
        picture: null,
        name: "",
        school: "",
        email: "",
    });
    const [preview, setPreview] = useState(null);
    const [saved, setSaved] = useState(false);

    // Load saved data from localStorage when the page loads
    useEffect(() => {
        const savedProfile = JSON.parse(localStorage.getItem("profile"));
        if (savedProfile) {
            setForm(savedProfile);
            if (savedProfile.picture) {
                setPreview(savedProfile.picture);
            }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, picture: reader.result });
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        localStorage.setItem("profile", JSON.stringify(form));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000); // Reset after 2s
    };

    return (
        <div className="container">
            <h1>Account Page</h1>
            <p>Fill out your information below (demo only, saved in your browser).</p>

            <form
                style={{
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "400px",
                }}
            >
                <label>
                    Profile Picture:
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                </label>

                <label>
                    Name:
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your name"
                    />
                </label>

                <label>
                    School:
                    <input
                        type="text"
                        name="school"
                        value={form.school}
                        onChange={handleChange}
                        placeholder="Your school"
                    />
                </label>

                <label>
                    Email:
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Your email"
                    />
                </label>
            </form>

            <button onClick={handleSave} style={{ marginTop: "15px" }}>
                Save Profile
            </button>
            {saved && <p style={{ color: "green" }}>Profile saved!</p>}

            <div className="card">
                <h2>Preview</h2>
                {preview && (
                    <img
                        src={preview}
                        alt="Profile Preview"
                        style={{ width: "120px", borderRadius: "50%" }}
                    />
                )}
                <p>
                    <strong>Name:</strong> {form.name}
                </p>
                <p>
                    <strong>School:</strong> {form.school}
                </p>
                <p>
                    <strong>Email:</strong> {form.email}
                </p>
            </div>
        </div>
    );
}
