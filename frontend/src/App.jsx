
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

function App() {
  const [messages, setMessages] = useState([]);

  const sendMessage = (text, role = "user") => {
    setMessages((prev) => [
      ...prev,
      {
        role: role,
        content: text,
      },
    ]);
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      <Sidebar onNewChat={() => setMessages([])} />

      <ChatWindow
        messages={messages}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

export default App;
