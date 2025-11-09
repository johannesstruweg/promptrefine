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
            e.preventDefault();
            if (!loading) handleRefine();
          }
        }}
        disabled={loading}
        aria-describedby="char-count"
        aria-invalid={!!refineError}
      />

      <p className="text-xs text-gray-500 mt-2 text-right">
        Press <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> to refine,
        <kbd className="px-1 py-0.5 bg-gray-100 border rounded ml-1">Shift + Enter</kbd> for newline
      </p>

      <div id="char-count" className="text-sm text-right text-gray-500 mt-1">
        {text.length} / 2000
      </div>

      {refineError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
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
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

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
              >
                {copiedEnhanced ? "✓ Copied!" : "Copy"}
              </button>
            </div>

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
  </main>
);
