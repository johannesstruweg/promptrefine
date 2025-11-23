import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { inject, track } from "@vercel/analytics";
inject();
import Rating from "./Rating";
import History from "./History";
import SuggestionCards from "./SuggestionCards";


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
  const [showHistory, setShowHistory] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [enterToSubmit, setEnterToSubmit] = useState(true);

  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [placeholders, setPlaceholders] = useState({
    audience: "Who's this for?",
    outcome: "What result are you hoping for?",
    constraints: "Anything else to consider?",
  });

  const handleSuggestionInsert = (text) => {
  setText(text);
  window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resultRef = useRef(null);
  const refineControllerRef = useRef(null);
  const enhanceControllerRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Strip Markdown Formatting ---
  const stripMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
      .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
      .replace(/#{1,6}\s?(.+)/g, '$1')  // Remove headers
      .replace(/`(.+?)`/g, '$1');       // Remove code blocks
  };

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
  if (res?.context_questions?.length >= 3) {
    // Use backend-inferred context questions
    setPlaceholders({
      audience: res.context_questions[0],
      outcome: res.context_questions[1],
      constraints: res.context_questions[2],
    });
  } else if (res?.category) {
    // Fallback to static local mapping if no context questions
    setPlaceholders(getEnhancePlaceholders(res.category));
  }
}, [res]);

   // --- History ---
  const handleReinsert = (text) => {
  setText(text);
  setShowHistory(false);
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
};


 // --- Refinement ---
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

  const handleRefine = async () => {
  track("Prompt Refined");

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    setRefineError("Please enter at least 10 characters");
    return;
  }
  if (trimmed.length > 5000) {
    setRefineError("Max 5000 characters");
    return;
  }

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
   // Save to local history (max 5)
try {
  const prev = JSON.parse(localStorage.getItem("prompt_history") || "[]");

  const entry = {
    id: Date.now(),
    before: trimmed,
    after: response.data.after,
    ts: Date.now()
  };

  const updated = [entry, ...prev].slice(0, 5);
  localStorage.setItem("prompt_history", JSON.stringify(updated));
} catch (err) {
  console.error("History save failed:", err);
}

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
  track("Prompt Enhanced");

  if (!res?.after) return;

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
    improvement_notes: res.why || "",
    context_questions: res.context_questions || [],
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
  if (enterToSubmit && e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();  // stops newline
    handleRefine();      // runs the refine
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
        <p className="text-gray-600 text-lg">Prompts that take flight</p>
      </header>

      {/* Input Section */}
      <section className="w-full max-w-3xl pt-4" aria-label="Prompt input">
        <div className="flex justify-between mb-2">
  {/* Envelope suggestions button */}
 <button
  onClick={() => {
    window.location.href = "mailto:hello@promptodactyl.com";
  }}
  className="p-2 rounded hover:bg-gray-100 transition"
  aria-label="Email Promptodactyl"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-gray-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4h16v16H4V4zm16 2l-8 6-8-6"
    />
  </svg>
</button>

  {/* Existing history button */}
  <button
    onClick={() => setShowHistory(true)}
    className="p-2 rounded hover:bg-gray-100 transition"
    aria-label="Show history"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12a9 9 0 1118 0M3 12h3m-3 0l2-2m-2 2l2 2m7-6v6l3 3"
      />
    </svg>
  </button>
</div>


        <label htmlFor="prompt-input" className="sr-only">
          Enter your prompt
        </label>
        <textarea
          id="prompt-input"
          rows={8}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 resize-none"
          placeholder="Enter your idea/prompt"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRefineError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-describedby="char-count"
          aria-invalid={!!refineError}
        />
        <div id="char-count" className="text-sm text-right text-gray-500 mt-1">
          {text.length}
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
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Refine prompt"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </button>
        </div>

        {!res && (
          <div className="mt-6">
          <SuggestionCards onSelect={handleSuggestionInsert} />
          </div>
        )}

      </section>

      {/* Results Section */}
      {res && (
        <div ref={resultRef} className="mt-10 w-full max-w-3xl space-y-10">
          {/* Refined Output */}
          <section aria-label="Refined prompt result">
            <h2 
              className="text-sm font-semibold text-blue-700 uppercase mb-2 cursor-pointer hover:underline"
              onClick={handleCopy}
            >
              REFINED PROMPT - {copied ? "✓ copied!" : "click to copy"}
            </h2>
            
            <div 
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              role="region"
              aria-label="Refined prompt text"
              onClick={handleCopy}
            >
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed select-text">
                {stripMarkdown(res.after)}
              </p>
            </div>
            {/* --- Rating stars appear here --- */}
<Rating promptId={res.prompt_id || "default"} API_URL={API_URL} />

            
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                Why It's Better
              </h3>
              <p className="text-gray-600 leading-relaxed">{stripMarkdown(res.why)}</p>
            </div>
          </section>

          {/* Enhancement Inputs */}
          <section className="space-y-4" aria-label="Enhancement options">
            <h2 className="text-sm font-semibold text-gray-700 uppercase">
              Enhance Further?
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
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-label="Enhance prompt"
              >
                {enhancing ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </button>
            </div>
          </section>

          {/* Enhanced Output */}
          {enhanced && (
            <section aria-label="Enhanced prompt result">
              <h2 
                className="text-sm font-semibold text-blue-700 uppercase mb-2 cursor-pointer hover:underline"
                onClick={handleCopyEnhanced}
              >
                ENHANCED PROMPT - {copiedEnhanced ? "✓ copied!" : "click to copy"}
              </h2>
              
              <div 
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                role="region"
                aria-label="Enhanced prompt text"
                onClick={handleCopyEnhanced}
              >
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed select-text">
                  {stripMarkdown(enhanced.after)}
                </p>
              </div>
              
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                  Why It's Improved
                </h3>
                <p className="text-gray-600 leading-relaxed">{stripMarkdown(enhanced.why)}</p>
              </div>
            </section>
          )}
        </div>
      )}
<History
  open={showHistory}
  onClose={() => setShowHistory(false)}
  onReinsert={handleReinsert}
/>

      {/* Footer */}
<footer className="text-center mt-16 mb-2 text-gray-500 text-sm relative z-10">
  <p>
    Powered by ChatGPT <br /> © 2025 Promptodactyl by{" "}
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

  <div className="mt-2">
    <button
      onClick={() => setShowPolicy(true)}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
    >
      Privacy Policy
    </button>
  </div>
</footer>

      {/* Privacy Policy Popup */}
      {showPolicy && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
          onClick={() => setShowPolicy(false)}
        >
          <div
            className="bg-white text-gray-800 rounded-t-2xl shadow-lg w-full max-w-2xl p-6 relative overflow-y-auto max-h-[80vh] transform transition-transform duration-300 translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPolicy(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-semibold"
              aria-label="Close Privacy Policy"
            >
              ×
            </button>

            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

            <h2 className="text-lg font-semibold mb-3">Privacy Policy</h2>
            <p className="space-y-4 text-sm text-gray-500 mb-6">Updated Nov 2025</p>

            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                Promptodactyl works without collecting personal information. Your prompts and iterations belong entirely to you.
              </p>
              <p>
                We don’t collect email addresses, names, logins, cookies, or browsing history. No prompt content is ever stored on our servers.
              </p>
              <p>
                Activity history is stored in your browser using localStorage, never leaving your device. You can clear it anytime from your browser or the History page.
              </p>
              <p>
                We retain anonymized metrics for performance and abuse prevention, such as prompt length, success rates, and hashed IPs that auto-expire. Nothing is personally identifiable.
              </p>
              <p>
                When you refine or enhance a prompt, it’s sent securely to OpenAI’s API, processed, and returned to you. No content is stored by Promptodactyl. For OpenAI’s practices, visit their Privacy Policy.
              </p>
              <p>
                You have full control over your data. Clear history, use private browsing, or disable local storage at any time.
              </p>
              <p>
                We use only essential third-party services, such as the OpenAI API. We do not sell or share data with any advertisers or analytics platforms.
              </p>
              <p>
                If this policy changes, updates will appear here with the revised date. 
              </p>
              <p>
                Questions? Contact{" "}
                <a
                  href="mailto:hello@promptodactyl.com"
                  className="text-blue-600 hover:text-blue-700"
                >
                  hello@promptodactyl.com
                </a>
              </p>
              <p className="font-medium text">The Promptodactyl Team</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
