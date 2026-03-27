import { useState, useRef, useEffect } from "react";
import { counselors } from "../counselors";
import "./GroupChat.css";

export default function GroupChat({ onBack }) {
  const [messages, setMessages] = useState([
    {
      type: "system",
      content: "Ask a question and see what each of them thinks. Same question, three very different takes.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function askAll() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { type: "user", content: text }]);
    setInput("");
    setLoading(true);

    // Ask all three counselors in parallel
    const replies = await Promise.all(
      counselors.map(async (c) => {
        try {
          const res = await fetch("http://localhost:3001/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemPrompt: c.systemPrompt,
              messages: [{ role: "user", content: text }],
            }),
          });
          const data = await res.json();
          return { counselor: c, content: data.reply };
        } catch {
          return { counselor: c, content: "...couldn't get a response." };
        }
      })
    );

    setMessages((prev) => [...prev, { type: "panel", replies }]);
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAll();
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
        <div className="group-header-title">Ask The Counsel</div>
      </div>

      <div className="group-messages">
        {messages.map((m, i) => {
          if (m.type === "system") {
            return <div key={i} className="system-msg">{m.content}</div>;
          }
          if (m.type === "user") {
            return (
              <div key={i} className="user-msg">
                <div className="user-bubble">{m.content}</div>
              </div>
            );
          }
          if (m.type === "panel") {
            return (
              <div key={i} className="panel-replies">
                {m.replies.map(({ counselor, content }) => (
                  <div
                    key={counselor.id}
                    className="panel-reply"
                    style={{ "--accent": counselor.color, "--light": counselor.lightColor }}
                  >
                    <div className="panel-reply-header">
                      <div
                        className="panel-avatar"
                        style={{ backgroundPosition: counselor.imagePosition }}
                      />
                      <div>
                        <div className="panel-name">{counselor.name}</div>
                        <div className="panel-topic">{counselor.topic}</div>
                      </div>
                    </div>
                    <p className="panel-content">{content}</p>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}

        {loading && (
          <div className="panel-replies loading">
            {counselors.map((c) => (
              <div
                key={c.id}
                className="panel-reply"
                style={{ "--accent": c.color, "--light": c.lightColor }}
              >
                <div className="panel-reply-header">
                  <div className="panel-avatar" style={{ backgroundPosition: c.imagePosition }} />
                  <div>
                    <div className="panel-name">{c.name}</div>
                    <div className="panel-topic">{c.topic}</div>
                  </div>
                </div>
                <div className="typing">
                  <span /><span /><span />
                </div>
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
          placeholder="Ask all three of them something..."
          rows={1}
        />
        <button className="send-btn" onClick={askAll} disabled={!input.trim() || loading}>
          Ask All
        </button>
      </div>
    </div>
  );
}
