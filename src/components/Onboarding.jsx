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
    type: "text",
  },
  {
    key: "financial_feeling",
    speaker: "wilson",
    messageTemplate: (profile) => `Nice to meet you, ${profile.name}. I'm Wilson. I'll be straight with you — how are you feeling about your finances right now, honestly? Stressed? Okay? Totally lost?`,
    placeholder: "Be honest, no judgment...",
    type: "text",
  },
  {
    key: "income",
    speaker: "sword",
    messageTemplate: (profile) => `Hey ${profile.name}. I'm Sword. Take your time. Roughly what's your monthly take-home income? Doesn't have to be exact.`,
    placeholder: "e.g. $3,000/month, or 'not sure'...",
    type: "text",
  },
  {
    key: "debt",
    speaker: "wilson",
    message: "Got it. Do you have any debt right now? Credit cards, student loans, car payments, anything like that?",
    placeholder: "e.g. $8k in credit card debt, student loans, none...",
    type: "text",
  },
  {
    key: "savings",
    speaker: "sword",
    message: "Do you have any savings or an emergency fund? Even a little counts.",
    placeholder: "e.g. $500 in savings, nothing yet, 3 months expenses...",
    type: "text",
  },
  {
    key: "financial_goals",
    speaker: "denathor",
    messageTemplate: (profile) => `Okay ${profile.name}, this is my favorite question — what's your biggest financial goal right now? Dream a little.`,
    placeholder: "e.g. pay off debt, buy a house, just stop living paycheck to paycheck...",
    type: "text",
  },
  {
    key: "biggest_stress",
    speaker: "wilson",
    message: "Last one. What's the one money thing that stresses you out the most?",
    placeholder: "Whatever's on your mind...",
    type: "text",
  },
];

function getCounselor(id) {
  return counselors.find((c) => c.id === id);
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({});
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Show first question on mount
  useEffect(() => {
    const q = QUESTIONS[0];
    const speaker = getCounselor(q.speaker);
    setChatLog([{ counselor: speaker, content: q.message }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  }, [chatLog]);

  function submit() {
    const text = input.trim();
    if (!text) return;

    const currentQ = QUESTIONS[step];
    const newProfile = { ...profile, [currentQ.key]: text };
    setProfile(newProfile);
    setInput("");

    // Add user message
    const newLog = [...chatLog, { user: true, content: text }];

    const nextStep = step + 1;

    if (nextStep >= QUESTIONS.length) {
      // Done — show closing message from all three
      const closing = [
        {
          counselor: getCounselor("denathor"),
          content: `${newProfile.name}, we've got you. Seriously, thank you for sharing all that — it means we can actually help you, not just give you generic advice. Whenever you're ready, come talk to any of us.`,
        },
      ];
      setChatLog([...newLog, ...closing]);
      setDone(true);
      saveProfile({ ...newProfile, onboarded: true });
    } else {
      const nextQ = QUESTIONS[nextStep];
      const speaker = getCounselor(nextQ.speaker);
      const message = nextQ.messageTemplate
        ? nextQ.messageTemplate(newProfile)
        : nextQ.message;
      setChatLog([...newLog, { counselor: speaker, content: message }]);
      setStep(nextStep);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const currentQ = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];

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
              <div
                className="ob-avatar"
                style={{ backgroundPosition: m.counselor.imagePosition }}
              />
              <div className="ob-body">
                <div className="ob-name">{m.counselor.name}</div>
                <div className="ob-bubble">{m.content}</div>
              </div>
            </div>
          );
        })}
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
            placeholder={currentQ.placeholder}
            rows={1}
          />
          <button className="ob-send-btn" onClick={submit} disabled={!input.trim()}>
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
