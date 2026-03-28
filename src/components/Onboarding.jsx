import { useState, useRef, useEffect } from "react";
import { saveProfile } from "../lib/profile";
import { counselors } from "../counselors";
import TypingIndicator from "./TypingIndicator";
import "./Onboarding.css";

// Based on the CFPB Financial Well-Being Scale (consumerfinance.gov)
const QUESTIONS = [
  {
    key: "name",
    speaker: "denathor",
    message: "Hey!! Welcome to The Counsel. We're so glad you're here. I'm Denathor — that no-nonsense raccoon is Wilson, and the calm one is Sword. We just want to get to know you a little first. What's your name?",
    placeholder: "Type your name...",
  },
  {
    key: "unexpected_expense",
    speaker: "wilson",
    messageTemplate: (p) => `${p.name}, I'm Wilson. Let's get real — if an unexpected expense hit you right now, like a $500 car repair or medical bill, could you handle it without going into debt?`,
    placeholder: "Yes / No / It'd be tough...",
  },
  {
    key: "financial_control",
    speaker: "sword",
    messageTemplate: (p) => `Hey ${p.name}, I'm Sword. This one's important — do you feel like your finances control your life, or do you feel in control of them?`,
    placeholder: "Finances control me / I'm in control / Somewhere in between...",
  },
  {
    key: "month_end",
    speaker: "denathor",
    messageTemplate: (p) => `Okay ${p.name} — at the end of the month, do you usually have money left over, break even, or come up short?`,
    placeholder: "Money left over / Break even / Come up short...",
  },
  {
    key: "future_security",
    speaker: "sword",
    message: "Are you on track for your future — saving for retirement, building an emergency fund, anything like that? Or does that feel out of reach right now?",
    placeholder: "On track / Working on it / Not yet / Not sure...",
  },
  {
    key: "debt_situation",
    speaker: "wilson",
    message: "Are you currently behind on any bills or carrying debt that feels hard to get out of?",
    placeholder: "No debt / Some manageable debt / Behind on things / Overwhelmed...",
  },
  {
    key: "financial_goals",
    speaker: "denathor",
    messageTemplate: (p) => `Last one ${p.name} — what's the one financial thing you most want to change or achieve? This is what we'll actually help you work toward.`,
    placeholder: "e.g. get out of debt, start saving, stop living paycheck to paycheck...",
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
      .replace(/^(hey\s+there|hi\s+there|hello\s+there|hey|hi|hello|yo|sup|hiya)[,!\s]*/i, "")
      .replace(/^(it'?s|i'?m|my name is|the name'?s|call me|i am)\s*/i, "")
      .replace(/\s*\bhere\b\s*$/i, "")
      .replace(/[.,!?]+$/, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
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
              <img className="ob-avatar" src={m.counselor.image} alt={m.counselor.name} />
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
            <img className="ob-avatar" src={typingCounselor.image} alt={typingCounselor.name} />
            <div className="ob-body">
              <div className="ob-name">{typingCounselor.name}</div>
              <TypingIndicator />
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
