import { useState, useRef, useEffect } from "react";
import { getProfile, getNotes, saveProfile, addNotes, buildProfileContext } from "../lib/profile";
import TypingIndicator from "./TypingIndicator";
import "./ChatInterface.css";

export default function ChatInterface({ counselor, onBack }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: getGreeting(counselor) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function extractAndSaveProfile(allMessages) {
    try {
      const convo = allMessages
        .map((m) => `${m.role === "user" ? "User" : counselor.name}: ${m.content}`)
        .join("\n");
      const res = await fetch("http://localhost:3001/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: convo }),
      });
      const data = await res.json();
      if (data.facts && Object.keys(data.facts).length > 0) saveProfile(data.facts);
      if (data.notes && data.notes.length > 0) addNotes(data.notes);
    } catch {
      // silent
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const profile = getProfile();
    const notes = getNotes();
    const systemPrompt = counselor.systemPrompt + buildProfileContext(profile, notes);

    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, messages: newMessages, provider: counselor.provider }),
      });

      const data = await response.json();
      const finalMessages = [...newMessages, { role: "assistant", content: data.reply }];
      setMessages(finalMessages);
      extractAndSaveProfile(finalMessages);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Hmm, something went wrong on my end. Try again?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="chat-page" style={{ "--accent": counselor.color, "--light": counselor.lightColor }}>
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>← The Counsel</button>
        <div className="chat-header-info">
          <img className="chat-avatar" src={counselor.image} alt={counselor.name} />
          <div>
            <div className="chat-name">{counselor.name}</div>
            <div className="chat-topic">{counselor.topic}</div>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.role === "assistant" && (
              <img className="message-avatar" src={counselor.image} alt={counselor.name} />
            )}
            <div className="message-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <img className="message-avatar" src={counselor.image} alt={counselor.name} />
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${counselor.name} anything...`}
          rows={1}
        />
        <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading}>
          Send
        </button>
      </div>
    </div>
  );
}

function getGreeting(counselor) {
  const greetings = {
    denathor: "Hey hey hey! I'm Denathor! Money stuff can feel super overwhelming, but I promise — it doesn't have to be. Ask me anything, no judgment, no jargon. What do you wanna learn today?",
    wilson: "Wilson here. I'm not gonna sugarcoat things — but I'm also not here to make you feel bad. Tell me what's going on with your money and let's build a real plan.",
    sword: "...Hey. I'm Sword. Finances don't have to be stressful. Slow down, breathe. Whether you're just starting to save or thinking about investing — we'll figure it out together.",
  };
  return greetings[counselor.id];
}
