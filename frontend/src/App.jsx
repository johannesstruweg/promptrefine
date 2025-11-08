import { useState, useRef } from "react";
import axios from "axios";

export default function App() {
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
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
    setError(null);
    setCopied(false);

    try {
      const response = await axios.post(`${API_URL}/refine`, { text: trimmed });
      setRes(response.data);
      
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const message = err.response?.data?.detail || "Something went wrong. Please try again.";
      setError(message);
      console.error("Refinement error:", err);
    } finally {
      setLoading(false);
    }
  };

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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
            Promptodactyl!
          </h1>
          <p className="text-gray-600 text-lg">
            Clarity is power. Refine your prompt.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
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
              {charCount} / 2000 characters {charCount > 0 && charCount < 10 && "(minimum 10)"}
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
              "✨ Refine Prompt"
            )}
          </button>
        </div>

        {res && (
          <div ref={resultRef} className="mt-8 space-y-6 animate-fade-in">
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
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
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
          </div>
        )}

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by GPT-4 • Prompt magic by Stratagentic.ai 🇳🇴</p>
        </div>
      </div>
    </main>
  );
}
