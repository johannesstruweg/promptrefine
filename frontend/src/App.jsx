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
    <section className="w-full max-w-3xl relative" aria-label="Prompt input">
      <div className="relative flex items-end bg-gray-50 border border-gray-300 rounded-2xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <textarea
          id="prompt-input"
          rows={4}
          className="flex-1 resize-none bg-transparent text-gray-800 focus:outline-none text-base leading-relaxed placeholder-gray-400 pr-12"
          placeholder="Type or paste your prompt... (Shift + Enter for newline)"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRefineError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!loading) handleRefine();
            }
          }}
          disabled={loading}
          aria-label="Prompt input"
        />

        {/* Circular Send Button */}
        <button
          onClick={handleRefine}
          disabled={loading || text.trim().length < 10}
          aria-label="Refine prompt"
          className="absolute bottom-4 right-4 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-150 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {loading ? (
            <svg
              className="w-5 h-5 animate-spin text-white"
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
                d="M4 12a8 8 0 018-8v4l5-5-5-5v4a12 12 0 00-12 12h4z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
          )}
        </button>
      </div>

      {refineError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
          {refineError}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2 text-right">
        Press <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> to refine,
        <kbd className="px-1 py-0.5 bg-gray-100 border rounded ml-1">Shift + Enter</kbd> for newline
      </div>

      <div className="text-sm text-gray-400 mt-1 text-right">
        {text.length} / 2000
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
              disabled={!res?.after_pretty}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full px-3 py-1 transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

          <div
            onClick={handleCopy}
            role="region"
            aria-label="Refined prompt text"
            className="relative group p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition hover:border-blue-300 active:ring-2 active:ring-blue-100 select-text overflow-x-auto"
            title="Click to copy refined prompt"
          >
            <pre
              className="text-gray-800 text-sm font-mono leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: res.after_pretty.replace(/```json|```/g, ""),
              }}
            ></pre>
            <span className="absolute top-2 right-3 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to copy
            </span>
            {copied && (
              <span className="absolute bottom-2 right-3 text-xs text-green-600 font-medium">
                ✓ Copied!
              </span>
            )}
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
              Why It's Better
            </h3>
            <p className="text-gray-600 leading-relaxed">{res.why}</p>
          </div>
        </section>

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
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              aria-label="Target audience"
            />
            <input
              type="text"
              placeholder={placeholders.outcome}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              disabled={enhancing}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              aria-label="Desired outcome"
            />
            <input
              type="text"
              placeholder={placeholders.constraints}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              disabled={enhancing}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              aria-label="Constraints"
            />
          </div>

          {enhanceError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              {enhanceError}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleEnhance}
              disabled={enhancing}
              aria-label="Enhance prompt"
              className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-sm hover:bg-blue-700 hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {enhancing ? (
                <svg
                  className="w-5 h-5 animate-spin text-white"
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
                    d="M4 12a8 8 0 018-8v4l5-5-5-5v4a12 12 0 00-12 12h4z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
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
                disabled={!enhanced?.after_pretty}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full px-3 py-1 transition-colors"
              >
                {copiedEnhanced ? "✓ Copied!" : "Copy"}
              </button>
            </div>

            <div
              onClick={handleCopyEnhanced}
              role="region"
              aria-label="Enhanced prompt text"
              className="relative group p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition hover:border-blue-300 active:ring-2 active:ring-blue-100 select-text overflow-x-auto"
              title="Click to copy enhanced prompt"
            >
              <pre
                className="text-gray-800 text-sm font-mono leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: enhanced.after_pretty.replace(/```json|```/g, ""),
                }}
              ></pre>
              <span className="absolute top-2 right-3 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to copy
              </span>
              {copiedEnhanced && (
                <span className="absolute bottom-2 right-3 text-xs text-green-600 font-medium">
                  ✓ Copied!
                </span>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                Why It's Improved
              </h3>
              <p className="text-gray-600 leading-relaxed">{enhanced.why}</p>
            </div>
          </section>
        )}
      </div>
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
        </a>{" "}
        🇳🇴
      </p>
    </footer>

    {/* Divider + Privacy */}
    <div className="w-full max-w-2xl mx-auto border-t border-gray-200 mt-8 mb-6"></div>
    <section className="mt-4 mb-8 text-center max-w-2xl text-xs text-gray-400 leading-relaxed px-4">
      <p>
        Your inputs and generated prompts are processed securely through OpenAI’s API.
        Promptodactyl does not store, track, or share any user content.  
        For more information, review{" "}
        <a
          href="https://openai.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline"
        >
          OpenAI’s Privacy Policy
        </a>{" "}
        or contact{" "}
        <a
          href="mailto:privacy@stratagentic.ai"
          className="text-blue-500 hover:text-blue-600 underline"
        >
          privacy@stratagentic.ai
        </a>.
      </p>
      <p className="mt-1 italic">Last updated: November 2025</p>
    </section>
  </main>
);
