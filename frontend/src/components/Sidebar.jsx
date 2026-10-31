
import { Plus, MessageSquare, Code2 } from "lucide-react";

function Sidebar({ onNewChat }) {
  return (
    <aside className="w-64 bg-[#171717] p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-8">
        GitHub Assistant
      </h1>

      <button
        onClick={onNewChat}
        className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:bg-[#303030]"
      >
        <Plus size={18} />
        New Chat
      </button>

      <div className="mt-8 text-gray-400 text-sm">
        Your Assistant
      </div>

      <div className="flex items-center gap-3 mt-4 text-sm">
       <Code2 size={18} />
        GitHub Repository Assistant
      </div>
    </aside>
  );
}

export default Sidebar;
