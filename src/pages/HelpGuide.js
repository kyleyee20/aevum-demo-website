import { useState } from "react";

export default function HelpGuide() {
    // Array of image paths in public/photos
    const images = [
        "/pictures/step1.png",
        "/pictures/step2.png",
        "/pictures/step3.png",
        "/pictures/step4.png",
        "/pictures/step5.png",
    ];

    const [current, setCurrent] = useState(0);

    // Go to next image
    const nextImage = () => setCurrent((prev) => (prev + 1) % images.length);

    // Go to previous image
    const prevImage = () =>
        setCurrent((prev) => (prev - 1 + images.length) % images.length);

    return (
        <div className="help-container">
            <h1>Help Guide</h1>

            <div className="help-card">
                <div className="help-carousel">
                    <button className="help-arrow" onClick={prevImage}>
                        ⬅
                    </button>

                    <img
                        className="help-image"
                        src={images[current]}
                        alt={`Step ${current + 1}`}
                    />

                    <button className="help-arrow" onClick={nextImage}>
                        ➡
                    </button>
                </div>

                <p className="help-step">
                    Step {current + 1} of {images.length}
                </p>
            </div>
        </div>
    );
}
