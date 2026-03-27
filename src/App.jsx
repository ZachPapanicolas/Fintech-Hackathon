import { useState } from "react";
import CounselorSelect from "./components/CounselorSelect";
import ChatInterface from "./components/ChatInterface";
import GroupChat from "./components/GroupChat";
import "./App.css";

export default function App() {
  const [view, setView] = useState("select"); // "select" | "chat" | "group"
  const [selectedCounselor, setSelectedCounselor] = useState(null);

  function openChat(counselor) {
    setSelectedCounselor(counselor);
    setView("chat");
  }

  return (
    <div className="app">
      {view === "select" && (
        <CounselorSelect
          onSelect={openChat}
          onGroupChat={() => setView("group")}
        />
      )}
      {view === "chat" && (
        <ChatInterface
          counselor={selectedCounselor}
          onBack={() => setView("select")}
        />
      )}
      {view === "group" && (
        <GroupChat onBack={() => setView("select")} />
      )}
    </div>
  );
}
