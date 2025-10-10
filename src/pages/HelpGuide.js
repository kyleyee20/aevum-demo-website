import { useState } from "react";
import step1 from "../pages/photos/step1.png";
import step2 from "../pages/photos/step2.png";
import step3 from "../pages/photos/step3.png";
import step4 from "../pages/photos/step4.png";
import step5 from "../pages/photos/step5.png";

export default function HelpGuide() {
    const images = [step1, step2, step3, step4, step5];
    const [current, setCurrent] = useState(0);

    const nextImage = () => setCurrent((prev) => (prev + 1) % images.length);
    const prevImage = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

    return (
        <div className="help-container">
            <h1>Help Guide</h1>
            <div className="help-card">
                <div className="help-carousel">
                    <button className="help-arrow" onClick={prevImage}>⬅</button>
                    <img className="help-image" src={images[current]} alt={`Step ${current + 1}`} />
                    <button className="help-arrow" onClick={nextImage}>➡</button>
                </div>
                <p className="help-step">Step {current + 1} of {images.length}</p>
            </div>
        </div>
    );
}
