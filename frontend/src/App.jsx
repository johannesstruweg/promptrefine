import { useState, useRef } from "react";
import axios from "axios";
import { Globe } from "./components/Globe"; // ensure this file exists

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

  // --- Copy output (tap-to-copy) ---
  const handleCopy = async () => {
    if (!res?.after) return;
    try {
      await navigator.clipboard.writeText(res.after);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
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

      {/* Globe Background */}
      <div className="fixed top-[-120px] left-0 w-full flex justify-center pointer-events-none opacity-50 z-0">
        <div className="w-[480px] h-[480px] sm:w-[600px] sm:h-[600px]">
          <Globe maxWidth={600} maxHeight={600} />
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <img
          src="/Promptodactyl_logo.png"
          alt="Promptodactyl Logo"
          className="mx-auto mb-4 w-48 sm:w-56 md:w-64 h-auto transition-transform hover:scale-105"
        />
        <p className="text-gray-600 text-lg">Clarity is power. Refine your prompt.</p>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-3xl bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-6 relative z-10">
        <textarea
          rows={8}
          className={`w-full p-4 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 ${
            error ? "border-red-300" : "border-gray-200"
          }`}
          placeholder="Paste your prompt here..."
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
          className={`text-sm mt-2 flex justify-between ${
            !isValid && charCount > 0 ? "text-red-500" : "text-gray-500"
          }`}
        >
          <span>{charCount} / 2000 characters</span>
          <button
            onClick={handleRefine}
            disabled={loading || !isValid}
            className="text-sm bg-blue-600 text-white rounded-full px-5 py-1.5 hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "Refining..." : "Refine"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Output */}
      {res && (
        <div ref={resultRef} className="mt-12 w-full max-w-3xl mx-auto relative z-10 space-y-10">

          {/* NEW (was After) */}
          <section>
            <h2
              className="text-sm font-semibold text-blue-600 uppercase mb-2 cursor-pointer select-none hover:underline"
              onClick={handleCopy}
            >
              NEW – tap to copy
            </h2>
            <p
              className="text-gray-800 leading-relaxed font-medium cursor-pointer select-text"
              onClick={handleCopy}
            >
              {res.after}
            </p>
            {copied && (
              <span className="text-xs text-green-600">(Copied!)</span>
            )}
          </section>

          {/* Original (was Before) */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">
              Original
            </h2>
            <p className="text-gray-700 leading-relaxed">{res.before}</p>
          </section>

          {/* Why it's better */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">
              Why it's better
            </h2>
            <p className="text-gray-700 leading-relaxed">{res.why}</p>
          </section>

          {/* Enhance */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">
              Enhance
            </h2>
            <input
              type="text"
              placeholder="Who’s this for?"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              placeholder="What result are you hoping for?"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              placeholder="Anything else to consider?"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="text-right">
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="text-sm bg-blue-600 text-white rounded-full px-5 py-1.5 hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {enhancing ? "Enhancing..." : "Enhance"}
              </button>
            </div>
          </section>

          {/* Enhanced Version */}
          {enhanced && (
            <section>
              <h2 className="text-sm font-semibold text-blue-700 uppercase mb-2">
                Enhanced Version
              </h2>
              <p className="text-gray-800 leading-relaxed font-medium">
                {enhanced.after}
              </p>
              <p className="text-sm text-gray-500 mt-2">{enhanced.why}</p>
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="text-center mt-16 mb-8 text-gray-500 text-sm relative z-10">
        <p>Powered by GPT-4 • © 2025 Promptodactyl by stratagentic.ai 🇳🇴</p>
      </footer>
    </main>
  );
}
