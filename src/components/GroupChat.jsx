import { useState, useRef, useEffect } from "react";
import { counselors } from "../counselors";
import "./GroupChat.css";

const TURNS = 5; // how many messages in the back-and-forth per topic

export default function GroupChat({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function startConversation() {
    const text = input.trim();
    if (!text || loading) return;

    setTopic(text);
    setInput("");
    setLoading(true);
    setMessages([]);

    const conversationHistory = []; // { name, content }[]

    // Randomize who goes first, then cycle
    const order = [...counselors].sort(() => Math.random() - 0.5);

    for (let i = 0; i < TURNS; i++) {
      const speaker = order[i % order.length];

      // Build the message history for this speaker
      const historyText = conversationHistory
        .map((m) => `${m.name}: ${m.content}`)
        .join("\n");

      const userMessage = conversationHistory.length === 0
        ? `Someone asked the group: "${text}"\n\nYou go first. What do you think?`
        : `Here's the conversation so far:\n\n${historyText}\n\nNow it's your turn to respond.`;

      try {
        const res = await fetch("http://localhost:3001/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt: speaker.groupSystemPrompt,
            messages: [{ role: "user", content: userMessage }],
          }),
        });
        const data = await res.json();
        const reply = data.reply;

        conversationHistory.push({ name: speaker.name, content: reply });

        setMessages((prev) => [
          ...prev,
          { counselor: speaker, content: reply },
        ]);
      } catch {
        conversationHistory.push({ name: speaker.name, content: "..." });
        setMessages((prev) => [
          ...prev,
          { counselor: speaker, content: "..." },
        ]);
      }
    }

    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startConversation();
    }
  }

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
      </div>

      <div className="group-messages">
        {messages.length === 0 && !loading && (
          <div className="system-msg">
            Throw out a topic and let them hash it out. They don't always agree.
          </div>
        )}

        {topic && (
          <div className="topic-pill">"{topic}"</div>
        )}

        {messages.map((m, i) => {
          const { counselor, content } = m;
          return (
            <div
              key={i}
              className="chat-msg"
              style={{ "--accent": counselor.color, "--light": counselor.lightColor }}
            >
              <div
                className="msg-avatar"
                style={{ backgroundPosition: counselor.imagePosition }}
              />
              <div className="msg-body">
                <div className="msg-name">{counselor.name}</div>
                <div className="msg-bubble">{content}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="typing-row">
            <div className="typing">
              <span /><span /><span />
            </div>
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
