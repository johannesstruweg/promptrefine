import { motion, AnimatePresence } from "framer-motion";

export default function PrivacyPolicy({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white text-gray-800 rounded-t-2xl shadow-lg w-full max-w-2xl p-6 relative overflow-y-auto max-h-[80vh]"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-semibold"
            aria-label="Close Privacy Policy"
          >
            ×
          </button>

          {/* Handle Bar */}
          <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

          {/* Title */}
          <h2 className="text-lg font-semibold mb-3 text-center">Privacy Policy</h2>
          <p className="text-sm text-center text-gray-500 mb-6">Last updated: 11.2025</p>

          {/* Content */}
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              Promptodactyl is designed to work without collecting personal information. Your prompts and creative flow belong entirely to you.
            </p>

            <p>
              We don’t collect email addresses, names, logins, cookies, browsing history, or analytics data. No prompt content is ever stored on our servers.
            </p>

            <p>
              Your optimization history lives in your browser using localStorage. It never leaves your device. You can clear it anytime from your browser or the History page.
            </p>

            <p>
              We only retain minimal anonymized metrics for performance and abuse prevention, such as prompt length, success rates, and hashed IPs that auto-expire. Nothing is personally identifiable.
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
              If this policy changes, updates will appear here with the revised date. Questions? Contact{" "}
              <a
                href="mailto:privacy@stratagentic.ai"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                privacy@stratagentic.ai
              </a>.
            </p>

            <p className="font-medium text-center">Your data. Your words. Your control.</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
