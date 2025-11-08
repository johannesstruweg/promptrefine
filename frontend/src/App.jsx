import { useState, useRef } from "react";
import axios from "axios";
import { Globe } from "./components/globe"; // make sure this file exists in /src/components

export default function App() {
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");
  const [constraints, setConstraints] = useState("");

  const resultRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Handle first refinement ---
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

    try {
      const response = await axios.post(`${API_URL}/refine`, { text: trimmed });
      setRes(response.data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const message =
        err.response?.data?.detail || "Something went wrong. Please try again.";
      setError(message);
      console.error("Refinement error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle second-stage enhancement ---
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
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      console.error("Enhancement failed:", err);
      setError("Enhancement failed. Please try again.");
    } finally {
      setEnhancing(false);
    }
  };

  // --- Copy output ---
  const handleCopy = async () => {
    if (res?.after) {
      try {
        await navigator.clipboard.writeText(res.after);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleRefine();
    }
  };

  const charCount = text.length;
  const isValid = charCount >= 10 && charCount <= 2000;

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-start overflow-hidden p-4 sm:p-6">

      {/* 🌍 Fixed Globe Background */}
      <div className="fixed top-[-120px] left-0 w-full flex justify-center pointer-events-none opacity-60 z-0">
        <div className="w-[480px] h-[480px] sm:w-[600px] sm:h-[600px]">
          <Globe maxWidth={600} maxHeight={600} />
        </div>
      </div>

      {/* Header Section */}
      <div className="relative text-center mt-24 mb-10 z-10">
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-3">
          Promptodactyl!
        </h1>
        <p className="text-gray-600 text-lg">
          Clarity is power. Refine your prompt.
        </p>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 sm:p-8 relative z-10">
        <div className="relative">
          <textarea
            rows={8}
            className={`w-full p-4 border-2 rounded-lg transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? "border-red-300" : "border-gray-200"
            }`}
            placeholder="Paste your prompt here... (Press Cmd/Ctrl + Enter to refine)"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Prompt input"
            aria-describedby="char-count"
          />
          <div
            id="char-count"
            className={`text-sm mt-2 ${
              !isValid && charCount > 0 ? "text-red-500" : "text-gray-500"
            }`}
          >
            {charCount} / 2000 characters{" "}
            {charCount > 0 && charCount < 10 && "(minimum 10)"}
          </div>
        </div>

        {error && (
          <div
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          onClick={handleRefine}
          disabled={loading || !isValid}
          className="w-full mt-4 bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          aria-label={loading ? "Refining prompt" : "Refine prompt"}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Refining...</span>
            </>
          ) : (
            "Refine Prompt"
          )}
        </button>
      </div>

      {/* Output Sections */}
      {res && (
        <div ref={resultRef} className="mt-8 space-y-6 animate-fade-in w-full max-w-3xl relative z-10">
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">
              Before
            </h2>
            <p className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 leading-relaxed">
              {res.before}
            </p>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-blue-600 uppercase tracking-wide">
                After
              </h2>
              <button
                onClick={handleCopy}
                className="text-sm px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors flex items-center gap-1"
                aria-label="Copy refined prompt"
              >
                {copied ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>
            <p className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg text-gray-800 leading-relaxed font-medium">
              {res.after}
            </p>
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">
              Why it's better
            </h2>
            <p className="p-4 bg-green-50 border border-green-200 rounded-lg text-gray-700 leading-relaxed">
              {res.why}
            </p>
          </section>

          {/* Inline Enhancement Section */}
          <section className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-500 mb-4">
              Add more detail to improve even further
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Who’s this for?"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="What result are you hoping for?"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Anything else I should consider?"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleEnhance}
              disabled={enhancing}
              className="w-full mt-4 bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {enhancing ? "⏳ Enhancing..." : "Enhance Prompt"}
            </button>
          </section>

          {enhanced && (
            <section className="bg-blue-50 rounded-xl shadow-lg p-6">
              <h2 className="font-semibold text-blue-700 text-sm uppercase mb-2">
                Enhanced Version
              </h2>
              <p className="p-4 bg-white border border-blue-200 rounded-lg text-gray-800 leading-relaxed font-medium">
                {enhanced.after}
              </p>
              <p className="text-sm text-gray-500 mt-2">{enhanced.why}</p>
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 text-gray-500 text-sm relative z-10">
        <p>Powered by GPT-4 • © 2025 Promptodactyl by stratagentic.ai 🇳🇴</p>
      </div>
    </main>
  );
}
