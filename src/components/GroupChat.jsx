import { useState, useRef, useEffect } from "react";
import { counselors } from "../counselors";
import { getProfile, saveProfile, buildProfileContext } from "../lib/profile";
import TypingIndicator from "./TypingIndicator";
import "./GroupChat.css";

export default function GroupChat({ onBack }) {
  const [question, setQuestion] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [takes, setTakes] = useState([]); // { counselor, content }[]
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [takes, loading]);

  async function ask() {
    const text = input.trim();
    if (!text || loading) return;

    setQuestion(text);
    setInput("");
    setLoading(true);
    setTakes([]);
    setSummary(null);
    setShowSummary(false);

    const profile = getProfile();
    const profileContext = buildProfileContext(profile);

    const prompt = `Someone asked: "${text}"\n\nGive your honest take in 2-3 sentences max. Be direct, stay in character, and don't hedge.`;

    // Ask all three in parallel
    const results = await Promise.all(
      counselors.map(async (c) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          const res = await fetch("http://localhost:3001/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              systemPrompt: c.groupSystemPrompt + profileContext,
              messages: [{ role: "user", content: prompt }],
            }),
          });
          clearTimeout(timeout);
          const data = await res.json();
          return { counselor: c, content: data.reply || "..." };
        } catch {
          return { counselor: c, content: "..." };
        }
      })
    );

    setTakes(results);
    setLoading(false);

    const convoText = results.map((r) => `${r.counselor.name}: ${r.content}`).join("\n");
    generateSummary(convoText);
    extractProfile(convoText);
  }

  async function generateSummary(convoText) {
    setSummaryLoading(true);
    try {
      const res = await fetch("http://localhost:3001/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: convoText }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummary("Couldn't conjure a summary this time.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function extractProfile(convoText) {
    try {
      const res = await fetch("http://localhost:3001/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: convoText }),
      });
      const data = await res.json();
      if (Object.keys(data).length > 0) saveProfile(data);
    } catch {}
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  }

  const davidReady = !loading && !summaryLoading && summary && takes.length > 0;

  return (
    <div className="group-page">
      <div className="group-header">
        <button className="back-btn" onClick={onBack}>← The Counsel</button>
        <div className="group-header-avatars">
          {counselors.map((c) => (
            <div key={c.id} className="group-avatar"
              style={{ backgroundPosition: c.imagePosition, "--accent": c.color }}
              title={c.name}
            />
          ))}
        </div>
        <div className="group-header-title">Quick Takes</div>

        {davidReady && (
          <button className={`david-btn ${showSummary ? "active" : ""}`}
            onClick={() => setShowSummary((s) => !s)} title="David's Summary">
            <div className="david-avatar" />
            <span>David</span>
          </button>
        )}
        {(loading || summaryLoading) && takes.length > 0 && (
          <div className="david-btn muted">
            <div className="david-avatar" />
            <span>...</span>
          </div>
        )}
      </div>

      {showSummary && summary && (
        <div className="david-panel">
          <div className="david-panel-header">
            <div className="david-avatar large" />
            <div>
              <div className="david-name">David</div>
              <div className="david-title">Magical Scribe Mouse</div>
            </div>
          </div>
          <div className="david-summary">{summary}</div>
        </div>
      )}

      <div className="group-messages">
        {!question && !loading && (
          <div className="system-msg">
            Ask anything — see where each of them stands.
          </div>
        )}

        {question && <div className="topic-pill">"{question}"</div>}

        {loading && (
          <div className="takes-grid loading">
            {counselors.map((c) => (
              <div key={c.id} className="take-card"
                style={{ "--accent": c.color, "--light": c.lightColor }}>
                <div className="take-header">
                  <div className="msg-avatar" style={{ backgroundPosition: c.imagePosition }} />
                  <div>
                    <div className="msg-name">{c.name}</div>
                    <div className="take-topic">{c.topic}</div>
                  </div>
                </div>
                <TypingIndicator />
              </div>
            ))}
          </div>
        )}

        {takes.length > 0 && (
          <div className="takes-grid">
            {takes.map(({ counselor, content }) => (
              <div key={counselor.id} className="take-card"
                style={{ "--accent": counselor.color, "--light": counselor.lightColor }}>
                <div className="take-header">
                  <div className="msg-avatar" style={{ backgroundPosition: counselor.imagePosition }} />
                  <div>
                    <div className="msg-name">{counselor.name}</div>
                    <div className="take-topic">{counselor.topic}</div>
                  </div>
                </div>
                <p className="take-content">{content}</p>
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="group-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Getting their takes..." : "Ask The Counsel anything..."}
          rows={1}
          disabled={loading}
        />
        <button className="send-btn" onClick={ask} disabled={!input.trim() || loading}>
          Ask
        </button>
      </div>
    </div>
  );
}
