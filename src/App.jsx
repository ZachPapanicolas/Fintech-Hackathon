import { useState } from "react";
import CounselorSelect from "./components/CounselorSelect";
import ChatInterface from "./components/ChatInterface";
import "./App.css";

export default function App() {
  const [selectedCounselor, setSelectedCounselor] = useState(null);

  return (
    <div className="app">
      {selectedCounselor ? (
        <ChatInterface
          counselor={selectedCounselor}
          onBack={() => setSelectedCounselor(null)}
        />
      ) : (
        <CounselorSelect onSelect={setSelectedCounselor} />
      )}
    </div>
  );
}
