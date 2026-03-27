import { useState, useRef, useEffect } from "react";
import { saveProfile } from "../lib/profile";
import { counselors } from "../counselors";
import "./Onboarding.css";

const QUESTIONS = [
  {
    key: "name",
    speaker: "denathor",
    message: "Hey!! Welcome to The Counsel. We're so glad you're here. I'm Denathor — that grumpy raccoon is Wilson, and the calm one is Sword. Before we get into it... what's your name?",
    placeholder: "Type your name...",
  },
  {
    key: "financial_feeling",
    speaker: "wilson",
    messageTemplate: (p) => `Nice to meet you, ${p.name}. I'm Wilson. I'll be straight with you — how are you feeling about your finances right now, honestly? Stressed? Okay? Totally lost?`,
    placeholder: "Be honest, no judgment...",
  },
  {
    key: "income",
    speaker: "sword",
    messageTemplate: (p) => `Hey ${p.name}. I'm Sword. Take your time. Roughly what's your monthly take-home income? Doesn't have to be exact.`,
    placeholder: "e.g. $3,000/month, or 'not sure'...",
  },
  {
    key: "debt",
    speaker: "wilson",
    message: "Got it. Do you have any debt right now? Credit cards, student loans, car payments, anything like that?",
    placeholder: "e.g. $8k in credit card debt, student loans, none...",
  },
  {
    key: "savings",
    speaker: "sword",
    message: "Do you have any savings or an emergency fund? Even a little counts.",
    placeholder: "e.g. $500 in savings, nothing yet, 3 months expenses...",
  },
  {
    key: "financial_goals",
    speaker: "denathor",
    messageTemplate: (p) => `Okay ${p.name}, this is my favorite question — what's your biggest financial goal right now? Dream a little.`,
    placeholder: "e.g. pay off debt, buy a house, just stop living paycheck to paycheck...",
  },
  {
    key: "biggest_stress",
    speaker: "wilson",
    message: "Last one. What's the one money thing that stresses you out the most?",
    placeholder: "Whatever's on your mind...",
  },
];

// ms to "type" — scales loosely with message length
function typingDelay(message) {
  return Math.min(600 + message.length * 18, 2800);
}

function getCounselor(id) {
  return counselors.find((c) => c.id === id);
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({});
  const [input, setInput] = useState("");
  // chatLog entries: { user, content } | { counselor, content } | { typing: counselor }
  const [chatLog, setChatLog] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Show first message with typing delay on mount
    showWithDelay(getCounselor("denathor"), QUESTIONS[0].message, []);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isTyping]);

  useEffect(() => {
    if (!isTyping) inputRef.current?.focus();
  }, [isTyping]);

  function showWithDelay(counselor, message, currentLog) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatLog([...currentLog, { counselor, content: message }]);
    }, typingDelay(message));
  }

  function extractName(raw) {
    return raw
      .replace(/^(hey|hi|hello|yo|sup|hiya)[,!\s]*/i, "")
      .replace(/^(it'?s|i'?m|my name is|the name'?s|call me|i am)\s*/i, "")
      .replace(/[.,!?]+$/, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2) // first + last name max
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  function submit() {
    const text = input.trim();
    if (!text || isTyping) return;

    const currentQ = QUESTIONS[step];
    const value = currentQ.key === "name" ? extractName(text) || text : text;
    const newProfile = { ...profile, [currentQ.key]: value };
    setProfile(newProfile);
    setInput("");

    const newLog = [...chatLog, { user: true, content: text }];
    setChatLog(newLog);

    const nextStep = step + 1;
    setStep(nextStep);

    if (nextStep >= QUESTIONS.length) {
      const closingMsg = `${newProfile.name}, we've got you. Seriously, thank you for sharing all that — it means we can actually help you, not just give you generic advice. Whenever you're ready, come talk to any of us.`;
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setChatLog([...newLog, { counselor: getCounselor("denathor"), content: closingMsg }]);
        setDone(true);
        saveProfile({ ...newProfile, onboarded: true });
      }, typingDelay(closingMsg));
    } else {
      const nextQ = QUESTIONS[nextStep];
      const speaker = getCounselor(nextQ.speaker);
      const message = nextQ.messageTemplate ? nextQ.messageTemplate(newProfile) : nextQ.message;
      showWithDelay(speaker, message, newLog);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const currentQ = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];
  // figure out who's "typing" for the indicator
  const typingCounselor = isTyping
    ? getCounselor(QUESTIONS[Math.min(step, QUESTIONS.length - 1)].speaker)
    : null;

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <h1 className="onboarding-title">The Counsel</h1>
        <p className="onboarding-sub">Let's get to know you first.</p>
      </div>

      <div className="onboarding-chat">
        {chatLog.map((m, i) => {
          if (m.user) {
            return (
              <div key={i} className="ob-user-msg">
                <div className="ob-user-bubble">{m.content}</div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="ob-counselor-msg"
              style={{ "--accent": m.counselor.color, "--light": m.counselor.lightColor }}
            >
              <div className="ob-avatar" style={{ backgroundPosition: m.counselor.imagePosition }} />
              <div className="ob-body">
                <div className="ob-name">{m.counselor.name}</div>
                <div className="ob-bubble">{m.content}</div>
              </div>
            </div>
          );
        })}

        {isTyping && typingCounselor && (
          <div
            className="ob-counselor-msg"
            style={{ "--accent": typingCounselor.color, "--light": typingCounselor.lightColor }}
          >
            <div className="ob-avatar" style={{ backgroundPosition: typingCounselor.imagePosition }} />
            <div className="ob-body">
              <div className="ob-name">{typingCounselor.name}</div>
              <div className="ob-bubble ob-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!done ? (
        <div className="onboarding-input-area">
          <textarea
            ref={inputRef}
            className="ob-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTyping ? "" : currentQ.placeholder}
            rows={1}
            disabled={isTyping}
          />
          <button className="ob-send-btn" onClick={submit} disabled={!input.trim() || isTyping}>
            →
          </button>
        </div>
      ) : (
        <div className="onboarding-done-area">
          <button className="ob-done-btn" onClick={onComplete}>
            Meet The Counsel →
          </button>
        </div>
      )}
    </div>
  );
}
