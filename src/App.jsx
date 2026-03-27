import { useState } from "react";
import { getProfile } from "./lib/profile";
import Onboarding from "./components/Onboarding";
import CounselorSelect from "./components/CounselorSelect";
import ChatInterface from "./components/ChatInterface";
import GroupChat from "./components/GroupChat";
import "./App.css";

export default function App() {
  const profile = getProfile();
  const [view, setView] = useState(profile.onboarded ? "select" : "onboarding");
  const [selectedCounselor, setSelectedCounselor] = useState(null);

  function openChat(counselor) {
    setSelectedCounselor(counselor);
    setView("chat");
  }

  return (
    <div className="app">
      {view === "onboarding" && (
        <Onboarding onComplete={() => setView("select")} />
      )}
      {view === "select" && (
        <CounselorSelect onSelect={openChat} onGroupChat={() => setView("group")} />
      )}
      {view === "chat" && (
        <ChatInterface counselor={selectedCounselor} onBack={() => setView("select")} />
      )}
      {view === "group" && (
        <GroupChat onBack={() => setView("select")} />
      )}
    </div>
  );
}
