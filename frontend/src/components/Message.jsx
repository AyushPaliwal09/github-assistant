
import { useState, Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  User,
  Bot,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
} from "lucide-react";

function Message({ message, onRegenerate }) {
  const isUser = message.role === "user";

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const copyMessage = async (text = message.content) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className={`w-full py-6 ${isUser ? "" : "bg-[#212121]"}`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-4">

        {/* Avatar */}
        <div
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
            isUser ? "bg-[#454545]" : "bg-purple-600"
          }`}
        >
          {isUser ? <User size={19} /> : <Bot size={19} />}
        </div>

        <div className="flex-1 min-w-0">

          {/* Name */}
          <div className="font-bold text-sm mb-3 text-white">
            {isUser ? "You" : "GitHub Assistant"}
          </div>

          {/* User Message */}
          {isUser ? (
            <div className="inline-block max-w-full bg-[#303030] rounded-2xl px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-gray-100">
                {message.content}
              </p>
            </div>
          ) : (

            /* AI Response */
            <div className="markdown-content text-gray-200 text-[15px] leading-7 break-words">

              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-extrabold text-white mt-8 mb-5">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="text-2xl font-extrabold text-white mt-8 mb-4 pb-2 border-b border-gray-700">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold text-white mt-6 mb-3">
                      {children}
                    </h3>
                  ),

                  h4: ({ children }) => (
                    <h4 className="text-base font-bold text-white mt-5 mb-2">
                      {children}
                    </h4>
                  ),

                  p: ({ children }) => (
                    <p className="mb-4 leading-7 text-gray-200">
                      {children}
                    </p>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-extrabold text-white">
                      {children}
                    </strong>
                  ),

                  em: ({ children }) => (
                    <em className="italic text-gray-300">
                      {children}
                    </em>
                  ),

                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-5 space-y-2 marker:text-purple-400">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-5 space-y-2 marker:text-purple-400">
                      {children}
                    </ol>
                  ),

                  li: ({ children }) => (
                    <li className="pl-1 text-gray-200">
                      {children}
                    </li>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-purple-500 bg-[#292929] px-4 py-3 my-5 rounded-r-lg text-gray-300">
                      {children}
                    </blockquote>
                  ),

                  hr: () => (
                    <hr className="border-gray-700 my-7" />
                  ),

                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline underline-offset-4"
                    >
                      {children}
                    </a>
                  ),

                  code: ({ children, className }) => {
                    const isBlock = Boolean(className);

                    return isBlock ? (
                      <code className="font-mono text-sm text-green-300">
                        {children}
                      </code>
                    ) : (
                      <code className="bg-[#383838] text-purple-300 px-1.5 py-0.5 rounded-md font-mono text-[13px]">
                        {children}
                      </code>
                    );
                  },

                  pre: ({ children }) => {
                    const codeText = extractCode(children);

                    return (
                      <div className="my-5 rounded-xl overflow-hidden border border-gray-700 bg-[#171717]">

                        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700 bg-[#252525]">
                          <span className="text-xs text-gray-400">
                            Code
                          </span>

                          <button
                            onClick={() => copyMessage(codeText)}
                            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
                          >
                            <Copy size={14} />
                            Copy code
                          </button>
                        </div>

                        <pre className="p-5 overflow-x-auto text-sm leading-6">
                          {children}
                        </pre>
                      </div>
                    );
                  },

                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 rounded-xl border border-gray-700">
                      <table className="w-full text-sm text-left border-collapse">
                        {children}
                      </table>
                    </div>
                  ),

                  thead: ({ children }) => (
                    <thead className="bg-[#303030] text-white">
                      {children}
                    </thead>
                  ),

                  th: ({ children }) => (
                    <th className="px-4 py-3 font-extrabold border-b border-gray-700">
                      {children}
                    </th>
                  ),

                  td: ({ children }) => (
                    <td className="px-4 py-3 border-b border-gray-700 text-gray-300">
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* AI Actions */}
          {!isUser && (
            <div className="flex items-center gap-4 mt-5 text-gray-400">

              <button
                onClick={() => copyMessage()}
                title="Copy response"
                className="hover:text-white transition"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>

              <button
                onClick={() =>
                  setFeedback(feedback === "like" ? null : "like")
                }
                title="Good response"
                className={`transition ${
                  feedback === "like"
                    ? "text-purple-400"
                    : "hover:text-white"
                }`}
              >
                <ThumbsUp size={17} />
              </button>

              <button
                onClick={() =>
                  setFeedback(feedback === "dislike" ? null : "dislike")
                }
                title="Bad response"
                className={`transition ${
                  feedback === "dislike"
                    ? "text-purple-400"
                    : "hover:text-white"
                }`}
              >
                <ThumbsDown size={17} />
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  className="hover:text-white transition"
                >
                  <RotateCw size={17} />
                </button>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* Extract code from ReactMarkdown pre element */
function extractCode(children) {
  return Children.toArray(children)
    .map((child) => {
      if (isValidElement(child)) {
        return typeof child.props.children === "string"
          ? child.props.children
          : "";
      }

      return typeof child === "string" ? child : "";
    })
    .join("");
}

export default Message;
