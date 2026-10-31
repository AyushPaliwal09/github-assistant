
import { useState } from "react";
import { Send } from "lucide-react";

function ChatInput({ onSendMessage }) {
  const [input, setInput] = useState("");

 const handleSend = () => {
  if (!input.trim()) return;

  onSendMessage(input.trim());
  setInput("");
};

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#303030] rounded-2xl p-3 flex items-center gap-3 border border-gray-700">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Ask anything about GitHub repositories..."
        rows={1}
        className="flex-1 bg-transparent outline-none resize-none px-2 py-2 text-white placeholder-gray-400"
      />

      <button
  onClick={handleSend}
  disabled={!input.trim()}
>
  <Send size={18} />
</button>
    </div>
  );
}

export default ChatInput;
