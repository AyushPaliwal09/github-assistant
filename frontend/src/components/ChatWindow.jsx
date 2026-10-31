
import { useState } from "react";
import { Loader2, Bot } from "lucide-react";
import ChatInput from "./ChatInput";
import Message from "./Message";

function ChatWindow({ messages, onSendMessage }) {
  const [loading, setLoading] = useState(false);

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;

    onSendMessage(text, "user");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      onSendMessage(data.reply, "assistant");

    } catch (error) {
      onSendMessage(`Error: ${error.message}`, "assistant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[#212121]">

      <header className="h-14 border-b border-gray-700 flex items-center justify-center font-semibold">
        GitHub Assistant
      </header>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Bot size={42} className="mb-4 text-purple-400" />
            <h2 className="text-2xl font-semibold">
              What can I help you with?
            </h2>
            <p className="text-gray-400 mt-2">
              Analyze GitHub repositories, commits, issues and code.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message key={index} message={message} />
          ))
        )}

        {loading && (
          <div className="max-w-3xl mx-auto px-4 py-5 flex gap-3 text-gray-400">
            <Bot size={22} />
            <Loader2 className="animate-spin" size={20} />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <ChatInput onSendMessage={handleSend} />
      </div>

    </main>
  );
}

export default ChatWindow;
