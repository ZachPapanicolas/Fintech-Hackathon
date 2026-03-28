import { useState, useRef, useEffect } from "react";
import { counselors } from "../counselors";
import { getProfile, saveProfile, buildProfileContext } from "../lib/profile";
import TypingIndicator from "./TypingIndicator";
import "./GroupChat.css";

export default function GroupChat({ onBack }) {
  const [question, setQuestion] = useState(null);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  // takes: { counselor, content: string | null (null = still typing) }[]
  const [takes, setTakes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [takes, asking]);

  async function ask() {
    const text = input.trim();
    if (!text || asking) return;

    setQuestion(text);
    setInput("");
    setAsking(true);
    setSummary(null);
    setShowSummary(false);

    const profile = getProfile();
    const profileContext = buildProfileContext(profile);
    const prompt = `Someone asked: "${text}"\n\nGive your honest take in 2-3 sentences max. Be direct, stay in character, don't hedge.`;

    // Seed all three as typing immediately
    setTakes(counselors.map((c) => ({ counselor: c, content: null })));

    const finalTakes = [];

    // Fire all three in parallel, update each as it arrives
    await Promise.all(
      counselors.map(async (c, idx) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          const res = await fetch("http://localhost:3001/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              systemPrompt: c.groupSystemPrompt + profileContext,
              provider: c.provider,
              messages: [{ role: "user", content: prompt }],
            }),
          });
          clearTimeout(timeout);
          const data = await res.json();
          const reply = data.reply || "...";
          finalTakes[idx] = { counselor: c, content: reply };
          setTakes((prev) =>
            prev.map((t, i) => (i === idx ? { counselor: c, content: reply } : t))
          );
        } catch {
          finalTakes[idx] = { counselor: c, content: null };
          setTakes((prev) =>
            prev.map((t, i) => (i === idx ? { counselor: c, content: "(no response)" } : t))
          );
        }
      })
    );

    setAsking(false);

    const convoText = finalTakes
      .filter((t) => t?.content)
      .map((t) => `${t.counselor.name}: ${t.content}`)
      .join("\n");
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

  const allDone = takes.length > 0 && takes.every((t) => t.content !== null);
  const davidReady = allDone && !summaryLoading && summary;

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
            onClick={() => setShowSummary((s) => !s)}>
            <div className="david-avatar" />
            <span>David</span>
          </button>
        )}
        {(asking || summaryLoading) && takes.length > 0 && (
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
        {!question && !asking && (
          <div className="system-msg">Ask anything — see where each of them stands.</div>
        )}

        {question && <div className="topic-pill">"{question}"</div>}

        {takes.map(({ counselor, content }, i) => (
          <div key={i} className="chat-msg"
            style={{ "--accent": counselor.color, "--light": counselor.lightColor }}>
            <div className="msg-avatar" style={{ backgroundPosition: counselor.imagePosition }} />
            <div className="msg-body">
              <div className="msg-name">{counselor.name}</div>
              {content === null ? (
                <TypingIndicator />
              ) : (
                <div className="msg-bubble msg-bubble--appear">{content}</div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="group-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={asking ? "Waiting on them..." : "Ask The Counsel anything..."}
          rows={1}
          disabled={asking}
        />
        <button className="send-btn" onClick={ask} disabled={!input.trim() || asking}>
          Ask
        </button>
      </div>
    </div>
  );
}
