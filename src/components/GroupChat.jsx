import { useState, useRef, useEffect } from "react";
import { counselors } from "../counselors";
import { getProfile, saveProfile, buildProfileContext } from "../lib/profile";
import TypingIndicator from "./TypingIndicator";
import "./GroupChat.css";

const TURNS = 5;

export default function GroupChat({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showSummary]);

  async function startConversation() {
    const text = input.trim();
    if (!text || loading) return;

    setTopic(text);
    setInput("");
    setLoading(true);
    setMessages([]);
    setSummary(null);
    setShowSummary(false);

    const profile = getProfile();
    const profileContext = buildProfileContext(profile);
    const conversationHistory = [];
    const order = [...counselors].sort(() => Math.random() - 0.5);

    for (let i = 0; i < TURNS; i++) {
      const speaker = order[i % order.length];
      const historyText = conversationHistory.map((m) => `${m.name}: ${m.content}`).join("\n");
      const userMessage = conversationHistory.length === 0
        ? `Someone asked the group: "${text}"\n\nYou go first. What do you think?`
        : `Here's the conversation so far:\n\n${historyText}\n\nNow it's your turn to respond.`;

      try {
        const res = await fetch("http://localhost:3001/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt: speaker.groupSystemPrompt + profileContext,
            messages: [{ role: "user", content: userMessage }],
          }),
        });
        const data = await res.json();
        conversationHistory.push({ name: speaker.name, content: data.reply });
        setMessages((prev) => [...prev, { counselor: speaker, content: data.reply }]);
      } catch {
        conversationHistory.push({ name: speaker.name, content: "..." });
        setMessages((prev) => [...prev, { counselor: speaker, content: "..." }]);
      }
    }

    setLoading(false);

    // Auto-generate David's summary
    const convoText = conversationHistory.map((m) => `${m.name}: ${m.content}`).join("\n");
    generateSummary(convoText);

    // Extract profile in background
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
      setSummary("Couldn't conjure a summary this time. Sorry!");
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
    } catch {
      // silent
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startConversation();
    }
  }

  const davidReady = !loading && (summary || summaryLoading) && messages.length > 0;

  return (
    <div className="group-page">
      <div className="group-header">
        <button className="back-btn" onClick={onBack}>← The Counsel</button>
        <div className="group-header-avatars">
          {counselors.map((c) => (
            <div
              key={c.id}
              className="group-avatar"
              style={{ backgroundPosition: c.imagePosition, "--accent": c.color }}
              title={c.name}
            />
          ))}
        </div>
        <div className="group-header-title">The Counsel — Group Chat</div>

        {/* David button */}
        {davidReady && (
          <button
            className={`david-btn ${showSummary ? "active" : ""}`}
            onClick={() => setShowSummary((s) => !s)}
            title="David's Summary"
          >
            <div className="david-avatar" />
            <span>David</span>
          </button>
        )}
        {(loading || summaryLoading) && messages.length > 0 && (
          <div className="david-btn muted" title="David is writing...">
            <div className="david-avatar" />
            <span>...</span>
          </div>
        )}
      </div>

      {/* David's summary panel */}
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
        {messages.length === 0 && !loading && (
          <div className="system-msg">
            Throw out a topic and let them hash it out. They don't always agree.
          </div>
        )}

        {topic && <div className="topic-pill">"{topic}"</div>}

        {messages.map((m, i) => (
          <div
            key={i}
            className="chat-msg"
            style={{ "--accent": m.counselor.color, "--light": m.counselor.lightColor }}
          >
            <div className="msg-avatar" style={{ backgroundPosition: m.counselor.imagePosition }} />
            <div className="msg-body">
              <div className="msg-name">{m.counselor.name}</div>
              <div className="msg-bubble">{m.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="typing-row">
            <TypingIndicator />
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
          placeholder={loading ? "They're talking..." : "Give them a topic to discuss..."}
          rows={1}
          disabled={loading}
        />
        <button className="send-btn" onClick={startConversation} disabled={!input.trim() || loading}>
          Start
        </button>
      </div>
    </div>
  );
}
