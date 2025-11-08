import { useState, useRef } from "react";
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

  const resultRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  const handleCopyEnhanced = async () => {
    if (!enhanced?.after) return;
    try {
      await navigator.clipboard.writeText(enhanced.after);
      setCopiedEnhanced(true);
      setTimeout(() => setCopiedEnhanced(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

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

      {/* Input Section */}
      <section className="w-full max-w-3xl relative z-10">
        <div className="relative">
          <span className="absolute top-4 left-4 text-gray-400 text-xl select-none">+</span>
          <textarea
            rows={8}
            className={`w-full pl-10 p-4 border-2 rounded-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 ${
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
            aria-describedby="char-count"
          />
          <button
            onClick={handleRefine}
            disabled={loading || !isValid}
            className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            aria-label="Run refine"
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14m0 0l-6-6m6 6l-6 6"
                />
              </svg>
            )}
          </button>
        </div>

        <div
          id="char-count"
          className={`text-sm mt-2 text-right ${
            !isValid && charCount > 0 ? "text-red-500" : "text-gray-500"
          }`}
        >
          {charCount} / 2000 characters
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </section>

      {/* Output */}
      {res && (
        <div ref={resultRef} className="mt-12 w-full max-w-3xl mx-auto relative z-10 space-y-10">

          {/* NEW */}
          <section>
            <h2
              className="text-sm font-semibold text-blue-600 uppercase mb-2 cursor-pointer select-none hover:underline"
              onClick={handleCopy}
            >
              NEW – click/tap to copy
            </h2>
            <p
              className="text-gray-800 leading-relaxed font-medium cursor-pointer select-text"
              onClick={handleCopy}
            >
              {res.after}
            </p>
            {copied && <span className="text-xs text-green-600">(Copied!)</span>}
          </section>

          {/* Original */}
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
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">
              Enhance
            </h2>

            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-400 text-lg select-none">+</span>
              <input
                type="text"
                placeholder="Who’s this for?"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full p-2.5 pl-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-400 text-lg select-none">+</span>
              <input
                type="text"
                placeholder="What result are you hoping for?"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full p-2.5 pl-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-400 text-lg select-none">+</span>
              <input
                type="text"
                placeholder="Anything else to consider?"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full p-2.5 pl-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex justify-end mt-2">
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Run enhance"
              >
                {enhancing ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </section>

          {/* Enhanced Version */}
          {enhanced && (
            <section>
              <h2
                className="text-sm font-semibold text-blue-700 uppercase mb-2 cursor-pointer select-none hover:underline"
                onClick={handleCopyEnhanced}
              >
                Enhanced Version – click/tap to copy
              </h2>
              <p
                className="text-gray-800 leading-relaxed font-medium cursor-pointer select-text"
                onClick={handleCopyEnhanced}
              >
                {enhanced.after}
              </p>
              {copiedEnhanced && <span className="text-xs text-green-600">(Copied!)</span>}
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="text-center mt-16 mb-4 text-gray-500 text-sm relative z-10">
        <p>
          Powered by GPT-5 • © 2025 Promptodactyl by{" "}
          <a
            href="https://stratagentic.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            stratagentic.ai
          </a>{" "}
          🇳🇴
        </p>
        <button
          onClick={() => setShowPolicy(true)}
          className="mt-2 text-gray-400 "
        >
          Privacy Policy
        </button>
      </footer>

      {/* Privacy Policy Popup */}
      {showPolicy && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-gray-800 rounded-lg shadow-lg w-full max-w-2xl p-6 relative overflow-y-auto max-h-[80vh]">
            <button
              onClick={() => setShowPolicy(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-semibold"
              aria-label="Close Privacy Policy"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold mb-3">Privacy Policy</h2>
            <p>Last updated: 11.2025</p>
            <p className="mt-4">
              Promptodactyl is designed to work without collecting personal information. Your prompts and creative flow belong entirely to you.
            </p>
            <p className="mt-4">
              We don’t collect email addresses, names, logins, cookies, browsing history, or analytics data. No prompt content is ever stored on our servers.
            </p>
            <p className="mt-4">
              Your optimization history lives in your browser using localStorage. It never leaves your device. You can clear it anytime from your browser or the History page.
            </p>
            <p className="mt-4">
              We only retain minimal anonymized metrics for performance and abuse prevention, such as prompt length, success rates, and hashed IPs that auto-expire. Nothing is personally identifiable.
            </p>
            <p className="mt-4">
              When you refine or enhance a prompt, it’s sent securely to OpenAI’s API, processed, and returned to you. No content is stored by Promptodactyl. For OpenAI’s practices, visit their Privacy Policy.
            </p>
            <p className="mt-4">
              You have full control over your data. Clear history, use private browsing, or disable local storage at any time.
            </p>
            <p className="mt-4">
              We use only essential third-party services, such as the OpenAI API. We do not sell or share data with any advertisers or analytics platforms.
            </p>
            <p className="mt-4">
              If this policy changes, updates will appear here with the revised date. Questions? Contact privacy@stratagentic.ai.
            </p>
            <p className="mt-4">Your data. Your words. Your control.</p>
          </div>
        </div>
      )}
    </main>  
  );
}
