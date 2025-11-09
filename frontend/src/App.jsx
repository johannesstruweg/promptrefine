import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [refineError, setRefineError] = useState(null);
  const [enhanceError, setEnhanceError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedEnhanced, setCopiedEnhanced] = useState(false);

  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [placeholders, setPlaceholders] = useState({
    audience: "Who's this for?",
    outcome: "What result are you hoping for?",
    constraints: "Anything else to consider?",
  });

  const resultRef = useRef(null);
  const refineControllerRef = useRef(null);
  const enhanceControllerRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Placeholder Logic ---
  const getEnhancePlaceholders = (context) => {
    const lower = context.toLowerCase();
    if (lower.includes("code")) {
      return {
        audience: "Language or framework?",
        outcome: "Target behavior/output?",
        constraints: "Performance or readability?",
      };
    }
    if (lower.includes("business")) {
      return {
        audience: "Target audience?",
        outcome: "Desired outcome?",
        constraints: "Constraints (budget/time)?",
      };
    }
    if (lower.includes("marketing")) {
      return {
        audience: "Target audience?",
        outcome: "Desired action?",
        constraints: "Tone or brand voice?",
      };
    }
    if (lower.includes("design")) {
      return {
        audience: "Style or mood?",
        outcome: "Platform or medium?",
        constraints: "Brand guidelines?",
      };
    }
    if (lower.includes("education")) {
      return {
        audience: "Learner type?",
        outcome: "Goal or level?",
        constraints: "Examples or depth?",
      };
    }
    return {
      audience: "Who's this for?",
      outcome: "What result are you hoping for?",
      constraints: "Anything else to consider?",
    };
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
      setRefineError("Please enter at least 10 characters");
      return;
    }
    if (trimmed.length > 2000) {
      setRefineError("Prompt must be less than 2000 characters");
      return;
    }

    // Cancel previous request if exists
    if (refineControllerRef.current) {
      refineControllerRef.current.abort();
    }
    refineControllerRef.current = new AbortController();

    setLoading(true);
    setRes(null);
    setEnhanced(null);
    setRefineError(null);
    setEnhanceError(null);

    try {
      const response = await axios.post(
        `${API_URL}/refine`,
        { text: trimmed },
        { signal: refineControllerRef.current.signal }
      );
      setRes(response.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      if (err.name === "CanceledError") return;
      setRefineError(err.response?.data?.detail || "Something went wrong. Please try again.");
      console.error("Refinement error:", err);
    } finally {
      setLoading(false);
      refineControllerRef.current = null;
    }
  };

  // --- Enhancement ---
  const handleEnhance = async () => {
    if (!res?.after) return;

    // Cancel previous request if exists
    if (enhanceControllerRef.current) {
      enhanceControllerRef.current.abort();
    }
    enhanceControllerRef.current = new AbortController();

    setEnhancing(true);
    setEnhanced(null);
    setEnhanceError(null);

    try {
      const response = await axios.post(
        `${API_URL}/enhance`,
        {
          refined: res.after,
          audience: audience.trim(),
          outcome: outcome.trim(),
          constraints: constraints.trim(),
        },
        { signal: enhanceControllerRef.current.signal }
      );
      setEnhanced(response.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      if (err.name === "CanceledError") return;
      console.error("Enhancement failed:", err);
      setEnhanceError(err.response?.data?.detail || "Enhancement failed. Please try again.");
    } finally {
      setEnhancing(false);
      enhanceControllerRef.current = null;
    }
  };

  // --- Copy Handlers ---
  const handleCopy = async () => {
    if (!res?.after) return;
    try {
      await navigator.clipboard.writeText(res.after);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCopyEnhanced = async () => {
    if (!enhanced?.after) return;
    try {
      await navigator.clipboard.writeText(enhanced.after);
      setCopiedEnhanced(true);
      setTimeout(() => setCopiedEnhanced(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // --- Keyboard Support ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleRefine();
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-start p-6">
      {/* Header */}
      <header className="text-center mb-8">
        <img 
          src="/Promptodactyl_logo.png" 
          alt="Promptodactyl Logo" 
          className="mx-auto mb-4 w-56 h-auto" 
        />
        <p className="text-gray-600 text-lg">Prompts that take flight.</p>
      </header>

     {/* Input Section */}
<section className="w-full max-w-3xl" aria-label="Prompt input">
  <label htmlFor="prompt-input" className="sr-only">
    Enter your prompt
  </label>

  <textarea
    id="prompt-input"
    rows={8}
    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 resize-none"
    placeholder="Enter your prompt (Press Enter to refine, Shift+Enter for newline)"
    value={text}
    onChange={(e) => {
      setText(e.target.value);
      setRefineError(null);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Stop new line
        if (!loading) handleRefine(); // Trigger refinement
      }
    }}
    disabled={loading}
    aria-describedby="char-count"
    aria-invalid={!!refineError}
  />

  {/* Optional discoverability hint */}
  <p className="text-xs text-gray-500 mt-2 text-right">
    Press <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> to refine,
    <kbd className="px-1 py-0.5 bg-gray-100 border rounded ml-1">Shift + Enter</kbd> for newline
  </p>
</section>

        <div id="char-count" className="text-sm text-right text-gray-500 mt-1">
          {text.length} / 2000
        </div>
        
        {refineError && (
          <div 
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            role="alert"
          >
            {refineError}
          </div>
        )}
        
        <div className="flex justify-end mt-3">
          <button
            onClick={handleRefine}
            disabled={loading || text.trim().length < 10}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Refine prompt"
          >
            {loading ? "Refining..." : "Refine"}
          </button>
        </div>
      </section>

     {/* Results Section */}
{res && (
  <div ref={resultRef} className="mt-10 w-full max-w-3xl space-y-10">
    {/* Refined Output */}
    <section aria-label="Refined prompt result" className="relative group">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-blue-700 uppercase">
          Refined Prompt
        </h2>
        <button
          onClick={handleCopy}
          disabled={!res?.after}
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
          aria-label="Copy refined prompt to clipboard"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>

      {/* Clickable output area */}
      <div
        onClick={handleCopy}
        role="region"
        aria-label="Refined prompt text"
        className="relative p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition hover:border-blue-300 active:ring-2 active:ring-blue-100 select-text"
        title="Click to copy refined prompt"
      >
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {res.after}
        </p>
        {copied && (
          <span className="absolute bottom-2 right-3 text-xs text-green-600">
            Copied!
          </span>
        )}
      </div>

      {/* Why it's better */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
          Why It's Better
        </h3>
        <p className="text-gray-600 leading-relaxed">{res.why}</p>
      </div>
    </section>

    {/* Enhanced Output */}
    {enhanced && (
      <section aria-label="Enhanced prompt result" className="relative group">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-blue-700 uppercase">
            Enhanced Prompt
          </h2>
          <button
            onClick={handleCopyEnhanced}
            disabled={!enhanced?.after}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
            aria-label="Copy enhanced prompt to clipboard"
          >
            {copiedEnhanced ? "✓ Copied!" : "Copy"}
          </button>
        </div>


          {/* Enhancement Inputs */}
          <section className="space-y-4" aria-label="Enhancement options">
            <h2 className="text-sm font-semibold text-gray-700 uppercase">
              Enhance Further (Optional)
            </h2>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder={placeholders.audience}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                disabled={enhancing}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                aria-label="Target audience"
              />
              
              <input
                type="text"
                placeholder={placeholders.outcome}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                disabled={enhancing}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                aria-label="Desired outcome"
              />
              
              <input
                type="text"
                placeholder={placeholders.constraints}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                disabled={enhancing}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                aria-label="Constraints"
              />
            </div>

            {enhanceError && (
              <div 
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                role="alert"
              >
                {enhanceError}
              </div>
            )}
            
            <div className="flex justify-end mt-2">
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Enhance prompt"
              >
                {enhancing ? "Enhancing..." : "Enhance"}
              </button>
            </div>
          </section>

         {/* Enhanced Output */}
{enhanced && (
  <section aria-label="Enhanced prompt result" className="relative group">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-semibold text-blue-700 uppercase">
        Enhanced Prompt
      </h2>
      <button
        onClick={handleCopyEnhanced}
        disabled={!enhanced?.after}
        className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
        aria-label="Copy enhanced prompt to clipboard"
      >
        {copiedEnhanced ? "✓ Copied!" : "Copy"}
      </button>
    </div>

    {/* Clickable output area */}
    <div
      onClick={handleCopyEnhanced}
      role="region"
      aria-label="Enhanced prompt text"
      className="relative p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition hover:border-blue-300 active:ring-2 active:ring-blue-100 select-text"
      title="Click to copy enhanced prompt"
    >
      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
        {enhanced.after}
      </p>

      {copiedEnhanced && (
        <span className="absolute bottom-2 right-3 text-xs text-green-600">
          Copied!
        </span>
      )}
    </div>

    {/* Why section */}
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
        Why It's Improved
      </h3>
      <p className="text-gray-600 leading-relaxed">{enhanced.why}</p>
    </div>
  </section>
)}


      {/* Footer */}
      <footer className="text-center mt-16 mb-4 text-gray-500 text-sm">
        <p>
          Powered by OpenAI • © 2025 Promptodactyl by{" "}
          <a 
            href="https://stratagentic.ai" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            stratagentic.ai
          </a>
          {" "}🇳🇴
        </p>
      </footer>
    </main>
  );
}
