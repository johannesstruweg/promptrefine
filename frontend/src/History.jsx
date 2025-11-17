import { useState, useEffect } from "react";

export default function History({ open, onClose, onReinsert }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open) return;

    try {
      const data = JSON.parse(localStorage.getItem("prompt_history") || "[]");
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [open]);

  const deleteItem = (id) => {
    const filtered = items.filter((i) => i.id !== id);
    setItems(filtered);
    localStorage.setItem("prompt_history", JSON.stringify(filtered));
  };

  const clearAll = () => {
    setItems([]);
    localStorage.removeItem("prompt_history");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-xl p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Recent Prompts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Clear All */}
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-red-600 hover:text-red-800 underline mb-4"
          >
            Clear all
          </button>
        )}

        {/* Entries */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
            >
              <p className="text-xs text-gray-400 mb-2">
                {new Date(item.ts).toLocaleString()}
              </p>

              <p className="text-xs text-gray-500 mb-1">Original:</p>
              <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                {item.before}
              </p>

              <p className="text-xs text-gray-500 mb-1">Refined:</p>
              <p
