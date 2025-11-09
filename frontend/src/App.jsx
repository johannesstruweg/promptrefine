import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedEnhanced, setCopiedEnhanced] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [placeholders, setPlaceholders] = useState([
    "Who’s this for?",
    "What result are you hoping for?",
    "Anything else to consider?",
  ]);

  const resultRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Contextual placeholders ---
  const getEnhancePlaceholders = (input) => {
    const lower = input.toLowerCase();
    if (lower.includes("code") || lower.includes("api") || lower.includes("function"))
      return ["What language or framework?", "Target behavior or output?", "Performance or readability priority?"];
    if (lower.includes("business") || lower.includes("strategy") || lower.includes("market"))
      return ["Target market or audience?", "Desired outcome or insight?", "Constraints (budget, time, etc.)?"];
    if (lower.includes("write") || lower.includes("story") || lower.includes("blog") || lower.includes("email"))
      return ["Who’s your reader?", "Tone or mood?", "Any key themes or constraints?"];
    if (lower.includes("design") || lower.includes("visual") || lower.includes("style"))
      return ["Feeling or aesthetic?", "Medium or platform?", "Brand or visual guidelines?"];
    if (lower.includes("learn") || lower.includes("teach") || lower.includes("explain"))
      return ["Who’s learning?", "Goal or difficulty level?", "Depth or examples needed?"];
    if (lower.includes("marketing") || lower.includes("ad") || lower.includes("sales"))
      return ["Target audience?", "Desired action or conversion?", "Tone or brand voice?"];
    return ["Who’s this for?", "What result are you hoping for?", "Anything else to consider?"];
  };

  useEffect(() => {
    setPlaceholders(getEnhancePlaceholders(text));
  }, [text]);

  // --- Refinement ---
  const handleRefine = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      setError("Please enter at least 10 characters");
      return;
    }
    if (trimmed.length > 2000) {
      setError("Prompt must be less than 2000 characters");
      return;
    }

    setLoading(true);
    setRes(null);
    setEnhanced(null);
    setError(null);
    setCopied(false);
    setCopiedEnhanced(false);

    try {
      const response = await axios.post(`${API_URL}/refine`, { text: trimmed });
      setRes(response.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      console.error("Refinement error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Enhancement ---
  const handleEnhance = async () => {
    if (!res?.after) return;
    setEnhancing(true);
    setEnhanced(null);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/enhance`, {
        refined: res.after,
        audience,
        outcome,
        constraints,
      });
      setEnhanced(response.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Enhancement failed:", err);
      setError("Enhancement failed. Please try again.");
    } finally {
      setEnhancing(false);
    }
  };

  // --- Copy Handlers ---
  const handleCopy = async () => {
    if (!res?.after) return;
    await navigator.clipboard.writeText(res.after);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyEnhanced = async () => {
    if (!enhanced?.after) return;
    await navigator.clipboard.writeText(enhanced.after);
    setCopiedEnhanced(true);
    setTimeout(() => setCopiedEnhanced(false), 1500);
  };

  // --- Key behavior ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRefine();
    }
  };

  const charCount = text.length;
  const isValid = charCount >= 10 && charCount <= 2000;

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-start overflow-hidden p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <img
          src="/Promptodactyl_logo.png"
          alt="Promptodactyl Logo"
          className="mx-auto mb-4 w-48 sm:w-56 md:w-64 h-auto transition-transform hover:scale-105"
        />
        <p className="text-gray-600 text-lg">Prompts that take flight.</p>
      </div>

      {/* Input */}
      <section className="w-full max-w-3xl relative z-10">
        <div className="relative">
          <span className="absolute top-4 left-4 text-gray-400 text-xl select-none">+</span>
          <textarea
            rows={8}
            className={`w-full pl-10 p-4 border-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 ${
              error ? "border-red-300" : "border-gray-200"
            }`}
            placeholder="Prompt anything"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Prompt input"
          />
          <button
            onClick={handleRefine}
            disabled={loading || !isValid}
            className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:bg-gray-300"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
              </svg>
            )}
          </button>
        </div>

        <div id="char-count" className={`text-sm mt-2 text-right ${!isValid && charCount > 0 ? "text-red-500" : "text-gray-500"}`}>
          {charCount} / 2000 characters
        </div>
        {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      </section>

      {/* Output */}
      {res && (
        <div ref={resultRef} className="mt-12 w-full max-w-3xl mx-auto space-y-10">
          {res.formatted?.html ? (
            <div
              className="prompt-block"
              dangerouslySetInnerHTML={{ __html: res.formatted.html }}
            />
          ) : null}

          {/* Enhancement Fields */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">Enhance</h2>
            {[
              [audience, setAudience, placeholders[0]],
              [outcome, setOutcome, placeholders[1]],
              [constraints, setConstraints, placeholders[2]],
            ].map(([val, setVal, placeholder], i) => (
              <div className="relative" key={i}>
                <span className="absolute left-4 top-2.5 text-gray-400 text-lg select-none">+</span>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="w-full p-2.5 pl-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            ))}

            <div className="flex justify-end mt-2">
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:bg-gray-300"
              >
                {enhancing ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </section>

          {/* Enhanced Output */}
          {enhanced && (
            enhanced.formatted?.html ? (
              <div
                className="prompt-block"
                dangerouslySetInnerHTML={{ __html: enhanced.formatted.html }}
              />
            ) : (
              <section>
                <h2 className="text-sm font-semibold text-blue-700 uppercase mb-2 cursor-pointer select-none hover:underline" onClick={handleCopyEnhanced}>
                  Enhanced Version – click/tap to copy
                </h2>
                <p className="text-gray-800 leading-relaxed font-medium cursor-pointer select-text" onClick={handleCopyEnhanced}>
                  {enhanced.after}
                </p>
                {copiedEnhanced && <span className="text-xs text-green-600">(Copied!)</span>}
              </section>
            )
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="text-center mt-16 mb-4 text-gray-500 text-sm">
        <p>
          Powered by GPT-5 • © 2025 Promptodactyl by{" "}
          <a href="https://stratagentic.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
            stratagentic.ai
          </a>{" "}
          🇳🇴
        </p>
      </footer>
    </main>
  );
}
