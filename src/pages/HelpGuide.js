import { useState } from "react";

export default function HelpGuide() {
    const images = [
        "/public/photos/step1.png",
        "/public/photos/step2.png",
        "/public/photos/step3.png",
        "/public/photos/step4.png",
        "/public/photos/step5.png",
    ];

    const [current, setCurrent] = useState(0);

    const nextImage = () => setCurrent((prev) => (prev + 1) % images.length);
    const prevImage = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

    return (
        <div className="help-container">
            <h1>Help Guide</h1>
            <div className="help-card">
                <div className="help-carousel">
                    <button className="help-arrow" onClick={prevImage}>⬅</button>
                    <img
                        className="help-image"
                        src={images[current]}
                        alt={`Step ${current + 1}`}
                    />
                    <button className="help-arrow" onClick={nextImage}>➡</button>
                </div>
                <p>Step {current + 1} of {images.length}</p>
            </div>
        </div>
    );
}
