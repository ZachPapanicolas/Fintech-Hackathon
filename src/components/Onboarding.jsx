import { useState, useRef, useEffect } from "react";
import { saveProfile } from "../lib/profile";
import { counselors } from "../counselors";
import { renderBold } from "../lib/renderBold";
import TypingIndicator from "./TypingIndicator";
import "./Onboarding.css";

// Based on the CFPB Financial Well-Being Scale (consumerfinance.gov)
const QUESTIONS = [
  {
    key: "name",
    speaker: "Noah",
    message: "Hey hey hey!! Welcome to The Counsel — we are SO glad you're here. I'm Noah, the enthusiastic one. That skeptical raccoon is Wilson, and the zen capybara is Sword. Before we get into it... what should we call you?",
    placeholder: "Type your name...",
    getReaction: (name) => `Love that name, ${name}! Let's go!`,
    showAllCounselors: true,
  },
  {
    key: "unexpected_expense",
    speaker: "wilson",
    messageTemplate: (p) => `${p.name}. Wilson here. There's a new laptop you've had your eye on — it's on sale TODAY for $500. If you bought it right now, where would that leave you?`,
    options: ["Barely noticed it", "I could swing it, barely", "That's a hard no"],
    reactions: {
      "Barely noticed it":      "That's the dream. 💪",
      "I could swing it, barely": "Honest. Respect.",
      "That's a hard no":       "Real. We'll change that.",
    },
  },
  {
    key: "financial_control",
    speaker: "sword",
    messageTemplate: (p) => `Hey ${p.name}, I'm Sword. It's the first of the month. You open your banking app. What's the vibe?`,
    options: ["Calm — I know what's in there", "A little nervous, honestly", "I'm not opening that app"],
    reactions: {
      "Calm — I know what's in there": "That's the energy. 🎯",
      "A little nervous, honestly":    "More common than you think.",
      "I'm not opening that app":      "Ha. We've all been there.",
    },
  },
  {
    key: "month_end",
    speaker: "Noah",
    messageTemplate: (p) => `Okay ${p.name} — it's the last day of the month. You check your account. What do you see?`,
    options: ["Still got money to spare", "Running on fumes", "Already dipped into next month"],
    reactions: {
      "Still got money to spare":       "Okay, look at you! 👀",
      "Running on fumes":               "We'll fix that. Promise.",
      "Already dipped into next month": "No judgment. Let's build a plan.",
    },
  },
  {
    key: "future_security",
    speaker: "sword",
    message: "Picture yourself 30 years from now. How's future you doing?",
    options: ["Retired and thriving", "Still working on it", "Honestly? I try not to think about it", "No idea yet"],
    reactions: {
      "Retired and thriving":                  "That's the plan! 🌴",
      "Still working on it":                   "Progress is progress.",
      "Honestly? I try not to think about it": "We'll make it less scary.",
      "No idea yet":                           "That's what we're here for.",
    },
  },
  {
    key: "debt_situation",
    speaker: "wilson",
    message: "Real talk — if your debt was a weather forecast, what would it say?",
    options: ["Clear skies, no debt", "Light clouds, manageable", "Overcast and stormy", "Full hurricane season"],
    reactions: {
      "Clear skies, no debt":    "Living the dream. ☀️",
      "Light clouds, manageable": "Smart to stay on top of it.",
      "Overcast and stormy":     "We'll get through it together.",
      "Full hurricane season":   "Okay, we've got work to do.",
    },
  },
  {
    key: "financial_goals",
    speaker: "Noah",
    messageTemplate: (p) => `Last one ${p.name}! If we could wave a magic wand and fix ONE money thing for you — what would it be?`,
    options: [
      "Escape my debt",
      "Actually start saving",
      "Stop living paycheck to paycheck",
      "Build an emergency fund",
      "Start investing",
      "Something else...",
    ],
    reactions: {
      "Escape my debt":                    "That's a powerful goal.",
      "Actually start saving":             "Best time to start is now.",
      "Stop living paycheck to paycheck":  "We hear you. Let's fix that.",
      "Build an emergency fund":           "Smart. That's your safety net.",
      "Start investing":                   "Future you will thank you.",
      "Something else...":                 "Got it. Tell us more soon.",
    },
  },
];

function typingDelay(message) {
  return Math.min(500 + message.length * 15, 2200);
}

function getCounselor(id) {
  return counselors.find((c) => c.id === id);
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({});
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [reaction, setReaction] = useState(null);
  const [done, setDone] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const msg = QUESTIONS[0].message;
    setTimeout(() => {
      setIsTyping(false);
      setCurrentMessage(msg);
    }, typingDelay(msg));
  }, []);

  useEffect(() => {
    if (!isTyping && !done && !reaction) {
      const q = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];
      if (!q?.options || showOtherInput) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [isTyping, step, reaction]);

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

  function advanceToNext(newProfile, nextStep) {
    setReaction(null);
    setStep(nextStep);
    setSlideKey((k) => k + 1);
    setCurrentMessage(null);
    setIsTyping(true);

    if (nextStep >= QUESTIONS.length) {
      const closingMsg = `${newProfile.name}, we've got you. Thank you for sharing — now we can actually help you, not just give generic advice. Whenever you're ready, come talk to any of us.`;
      saveProfile({ ...newProfile, onboarded: true });
      setTimeout(() => {
        setIsTyping(false);
        setCurrentMessage(closingMsg);
        setDone(true);
      }, typingDelay(closingMsg));
    } else {
      const nextQ = QUESTIONS[nextStep];
      const message = nextQ.messageTemplate ? nextQ.messageTemplate(newProfile) : nextQ.message;
      setTimeout(() => {
        setIsTyping(false);
        setCurrentMessage(message);
      }, typingDelay(message));
    }
  }

  function submitValue(rawValue) {
    if (isTyping || reaction) return;
    const currentQ = QUESTIONS[step];
    const value = currentQ.key === "name" ? extractName(rawValue) || rawValue : rawValue;
    const newProfile = { ...profile, [currentQ.key]: value };
    setProfile(newProfile);
    setInput("");
    setShowOtherInput(false);

    const reactionText = currentQ.getReaction
      ? currentQ.getReaction(value)
      : currentQ.reactions?.[rawValue] ?? null;

    if (reactionText) {
      setReaction(reactionText);
      setTimeout(() => advanceToNext(newProfile, step + 1), 2400);
    } else {
      advanceToNext(newProfile, step + 1);
    }
  }

  function handleOptionClick(option) {
    if (option === "Something else...") {
      setShowOtherInput(true);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    submitValue(option);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) submitValue(input.trim());
    }
  }

  const currentQ = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];
  const speakerId = step >= QUESTIONS.length ? "Noah" : currentQ.speaker;
  const currentCounselor = getCounselor(speakerId);
  const showOptions = !done && !isTyping && currentMessage && currentQ?.options && !showOtherInput && !reaction;
  const showTextInput = !done && !isTyping && currentMessage && (!currentQ?.options || showOtherInput) && !reaction;
  const progress = Math.round((step / QUESTIONS.length) * 100);

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <h1 className="onboarding-title">The Counsel</h1>
      </div>

      <div className="ob-progress-track">
        <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div key={slideKey} className="ob-slide">
        {currentQ?.showAllCounselors ? (
          <div className="ob-slide-group">
            {counselors.map((c) => (
              <div key={c.id} className="ob-slide-group-member" style={{ "--accent": c.color }}>
                <img className="ob-slide-avatar ob-slide-avatar--group" src={c.image} alt={c.name} />
                <div className="ob-slide-name">{c.name}</div>
              </div>
            ))}
          </div>
        ) : currentCounselor && (
          <div className="ob-slide-counselor" style={{ "--accent": currentCounselor.color }}>
            <img className="ob-slide-avatar" src={currentCounselor.image} alt={currentCounselor.name} />
            <div className="ob-slide-name">{currentCounselor.name}</div>
          </div>
        )}

        <div className="ob-slide-message">
          {isTyping ? (
            <div className="ob-slide-typing"><TypingIndicator /></div>
          ) : (
            <p className="ob-slide-text">{renderBold(currentMessage)}</p>
          )}
        </div>

        {reaction && (
          <div className="ob-reaction">{reaction}</div>
        )}

        {showOptions && (
          <div className="ob-options">
            {currentQ.options.map((opt) => (
              <button key={opt} className="ob-option-btn" onClick={() => handleOptionClick(opt)}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {showTextInput && (
          <div className="ob-text-row">
            <textarea
              ref={inputRef}
              className="ob-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={showOtherInput ? "Type your answer..." : currentQ.placeholder}
              rows={1}
              disabled={isTyping}
            />
            <button
              className="ob-send-btn"
              onClick={() => input.trim() && submitValue(input.trim())}
              disabled={!input.trim() || isTyping}
            >
              →
            </button>
          </div>
        )}

        {done && !isTyping && (
          <button className="ob-done-btn" onClick={onComplete}>
            Meet The Counsel →
          </button>
        )}
      </div>
    </div>
  );
}
