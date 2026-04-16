"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HomeAnalyzeForm() {
  const [input, setInput] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const looksLikeUrl = /^https?:\/\//i.test(trimmed);
    const params = new URLSearchParams({
      [looksLikeUrl ? "url" : "text"]: trimmed,
      run: "1",
    });
    router.push(`/analysis?${params.toString()}`);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste a YouTube URL, article link, or text to analyze..."
        className="w-full px-6 py-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition text-lg"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition"
        >
          Analyze Content
        </button>
      </div>
    </form>
  );
}
