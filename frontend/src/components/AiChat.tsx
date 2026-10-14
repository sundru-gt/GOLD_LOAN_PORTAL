/**
 * AI Chat Interface Component
 *
 * Chat UI for the Gold Loan AI Assist Agent.
 * Sends messages to the backend agent endpoint which uses Gemini with
 * function calling. Conversation history is maintained client-side.
 */

import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api/client";
import { LoadingSpinner } from "./ui/index";
import { SendIcon, BotIcon, SparklesIcon } from "./ui/Icons";
import type { ChatMessage } from "../types";

// Suggested prompts to help users get started
const SUGGESTED_PROMPTS = [
  "What loan plans do you offer?",
  "I have 10g of 22K gold. How much can I borrow?",
  "What is the maximum LTV ratio?",
  "I want to apply for a gold loan",
];

export function AiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "👋 Hello! I'm your Gold Loan AI Assistant. I can help you:\n\n• Check available loan plans\n• Calculate your eligible loan amount\n• Submit a loan application\n\nTo get started, tell me about your gold or ask any question!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiHistory, setApiHistory] = useState<{ role: string; text: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text.trim(), apiHistory);

      const aiMessage: ChatMessage = {
        role: "model",
        text: response.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setApiHistory(response.history);
    } catch (err: unknown) {
      const errorText =
        err instanceof Error && "response" in err
          ? "Service unavailable. Please check that GEMINI_API_KEY is configured."
          : "Something went wrong. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `❌ ${errorText}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Render message text with basic markdown (bold, line breaks)
  const renderText = (text: string) => {
    return text.split("\n").map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gold-500 to-amber-500 rounded-t-2xl">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-white">Gold Loan AI Assistant</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            <p className="text-xs text-gold-100">Powered by Gemini</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {msg.role === "model" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0 mt-1">
                <BotIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <div
                className={
                  msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                }
              >
                <p className="text-sm leading-relaxed">{renderText(msg.text)}</p>
              </div>
              <p
                className={`text-[10px] text-slate-400 mt-1 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                {formatTime(msg.timestamp)}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold text-slate-600">You</span>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0">
              <BotIcon className="w-4 h-4 text-white" />
            </div>
            <div className="chat-bubble-ai">
              <div className="flex gap-1.5 items-center py-1">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts (show only initially) */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 bg-white border-t border-slate-200 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs bg-gold-50 text-gold-700 border border-gold-200 rounded-full px-3 py-1.5 hover:bg-gold-100 transition-colors font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white border-t border-slate-200 rounded-b-2xl flex gap-2"
      >
        <input
          ref={inputRef}
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about gold loans..."
          className="flex-1 form-input py-2"
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          type="submit"
          id="btn-send-chat"
          disabled={!input.trim() || isLoading}
          className="btn-primary py-2 px-4"
          aria-label="Send message"
        >
          <SendIcon className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
