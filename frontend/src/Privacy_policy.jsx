// src/components/PrivacyPolicy.jsx
export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-gray-800 rounded-lg shadow-lg w-full max-w-2xl p-6 relative overflow-y-auto max-h-[80vh]">
        <button
          onClick={onClose}
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
        <p className="mt-4 font-medium">Your data. Your words. Your control.</p>
      </div>
    </div>
  );
}
