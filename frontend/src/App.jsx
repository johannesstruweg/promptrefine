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

  // --- Placeholder Logic ---
  const getEnhancePlaceholders = (context) => {
    const lower = context.toLowerCase();
    if (lower.includes("code")) return ["Language or framework?", "Target behavior/output?", "Performance or readability?"];
    if (lower.includes("business")) return ["Target audience?", "Desired outcome?", "Constraints (budget/time)?"];
    if (lower.includes("marketing")) return ["Target audience?", "Desired action?", "Tone or brand voice?"];
    if (lower.includes("design")) return ["Style or mood?", "Platform or medium?", "Brand guidelines?"];
    if (lower.includes("education")) return ["Learner type?", "Goal or level?", "Examples or depth?"];
    return ["Who’s this for?", "What result are you hoping for?", "Anything else to consider?"];
  };

  useEffect(() => {
    if (res?.category) {
      setPlaceholders(getEnhancePlaceholders(res.category));
    }
  }, [res]);

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

    try {
      const response = await axios.post(`${API_URL}/refine`, { text: trimmed });
      setRes(response.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
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

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-start p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <img src="/Promptodactyl_logo.png" alt="Promptodactyl Logo" className="mx-auto mb-4 w-56 h-auto" />
        <p className="text-gray-600 text-lg">Prompts that take flight.</p>
      </div>

      {/* Input */}
      <section className="w-full max-w-3xl">
        <textarea
          rows={8}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 resize-none"
          placeholder="Enter your prompt"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          disabled={loading}
        />
        <div className="text-sm text-right text-gray-500 mt-1">{text.length} / 2000</div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <div className="flex justify-end mt-3">
          <button
            onClick={handleRefine}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:bg-gray-300"
          >
            {loading ? "Refining..." : "Refine"}
          </button>
        </div>
      </section>

      {/* Output */}
      {res && (
        <div ref={resultRef} className="mt-10 w-full max-w-3xl space-y-10">
          <section>
            <h2
              className="text-sm font-semibold text-blue-700 uppercase mb-2 cursor-pointer hover:underline"
              onClick={handleCopy}
            >
              Refined Prompt – click/tap to copy
            </h2>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed cursor-pointer select-text" onClick={handleCopy}>
              {res.after}
            </p>
            {copied && <span className="text-xs text-green-600">(Copied!)</span>}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Why It’s Better</h3>
              <p className="text-gray-600 leading-relaxed">{res.why}</p>
            </div>
          </section>

          {/* Enhancement Inputs */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase">Enhance</h2>
            {[audience, outcome, constraints].map((val, i) => (
              <input
                key={i}
                type="text"
                placeholder={placeholders[i]}
                value={val}
                onChange={(e) => [setAudience, setOutcome, setConstraints][i](e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-500"
              />
            ))}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:bg-gray-300"
              >
                {enhancing ? "Enhancing..." : "Enhance"}
              </button>
            </div>
          </section>

          {/* Enhanced Output */}
          {enhanced && (
            <section>
              <h2
                className="text-sm font-semibold text-blue-700 uppercase mb-2 cursor-pointer hover:underline"
                onClick={handleCopyEnhanced}
              >
                Enhanced Prompt – click/tap to copy
              </h2>
              <p
                className="text-gray-800 whitespace-pre-wrap leading-relaxed cursor-pointer select-text"
                onClick={handleCopyEnhanced}
              >
                {enhanced.after}
              </p>
              {copiedEnhanced && <span className="text-xs text-green-600">(Copied!)</span>}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Why It’s Improved</h3>
                <p className="text-gray-600 leading-relaxed">{enhanced.why}</p>
              </div>
            </section>
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
