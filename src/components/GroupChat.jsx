import { useState, useRef, useEffect } from "react";
import { counselors } from "../counselors";
import { getProfile, getNotes, saveProfile, addNotes, buildProfileContext } from "../lib/profile";
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
    const notes = getNotes();
    const profileContext = buildProfileContext(profile, notes);
    const prompt = `Someone asked: "${text}"\n\nGive your honest take in 2-3 sentences max. Be direct, stay in character, don't hedge.`;

    // Stagger each counselor appearing with typing dots
    setTakes([]);
    const finalTakes = [];
    const STAGGER = 1200; // ms between each counselor appearing

    await Promise.all(
      counselors.map(async (c, idx) => {
        // Wait before showing this counselor's typing indicator
        await new Promise((r) => setTimeout(r, idx * STAGGER));
        setTakes((prev) => [...prev, { counselor: c, content: null }]);

        try {
          const typingStart = Date.now();
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
          // Show typing for at least 2s so it doesn't flash
          const elapsed = Date.now() - typingStart;
          if (elapsed < 2000) await new Promise((r) => setTimeout(r, 2000 - elapsed));
          finalTakes[idx] = { counselor: c, content: reply };
          setTakes((prev) =>
            prev.map((t, i) =>
              t.counselor.id === c.id ? { counselor: c, content: reply } : t
            )
          );
        } catch {
          finalTakes[idx] = { counselor: c, content: "(no response)" };
          setTakes((prev) =>
            prev.map((t) =>
              t.counselor.id === c.id ? { counselor: c, content: "(no response)" } : t
            )
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
      if (data.facts && Object.keys(data.facts).length > 0) saveProfile(data.facts);
      if (data.notes && data.notes.length > 0) addNotes(data.notes);
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
            <img key={c.id} className="group-avatar"
              src={c.image} alt={c.name}
              style={{ "--accent": c.color }}
              title={c.name}
            />
          ))}
        </div>
        <div className="group-header-title">Quick Takes</div>

      </div>

      <div className="group-messages">
        {!question && !asking && (
          <div className="system-msg">Ask anything — see where each of them stands.</div>
        )}

        {question && <div className="topic-pill">"{question}"</div>}

        {takes.map(({ counselor, content }, i) => (
          <div key={i} className="chat-msg"
            style={{ "--accent": counselor.color, "--light": counselor.lightColor }}>
            <img className="msg-avatar" src={counselor.image} alt={counselor.name} />
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

      {/* David floating bubble */}
      {(summaryLoading || summary) && (
        <div className={`david-bubble ${showSummary ? "open" : ""}`}>
          <button className="david-bubble-toggle" onClick={() => setShowSummary((s) => !s)}>
            <div className="david-avatar" />
            {!showSummary && <span className="david-ping" />}
          </button>
          {showSummary && (
            <div className="david-popup">
              <div className="david-popup-header">
                <div className="david-avatar large" />
                <div>
                  <div className="david-name">David</div>
                  <div className="david-title">Scribe Mouse</div>
                </div>
                <button className="david-close" onClick={() => setShowSummary(false)}>✕</button>
              </div>
              {summaryLoading ? <TypingIndicator /> : <div className="david-summary">{summary}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
