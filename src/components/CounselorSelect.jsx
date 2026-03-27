import { counselors } from "../counselors";
import "./CounselorSelect.css";

export default function CounselorSelect({ onSelect, onGroupChat }) {
  return (
    <div className="select-page">
      <div className="select-header">
        <h1 className="select-title">The Counsel</h1>
        <p className="select-subtitle">
          Your personal finance crew — pick who you want to talk to, or ask them all at once.
        </p>
        <button className="group-chat-btn" onClick={onGroupChat}>
          Ask The Counsel →
        </button>
      </div>

      <div className="counselor-grid">
        {counselors.map((c) => (
          <button
            key={c.id}
            className="counselor-card"
            style={{ "--accent": c.color, "--light": c.lightColor }}
            onClick={() => onSelect(c)}
          >
            <div className="card-avatar">
              <div
                className="avatar-crop"
                style={{ backgroundPosition: c.imagePosition }}
              />
            </div>
            <div className="card-body">
              <div className="card-name">{c.name}</div>
              <div className="card-animal">{c.animal}</div>
              <div className="card-topic">{c.topic}</div>
              <div className="card-tagline">"{c.tagline}"</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
