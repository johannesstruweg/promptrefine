import { useEffect, useState } from "react";

export default function History() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("prompt_history") || "[]");
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  if (!items.length) return null;

  return (
    <section className="max-w-3xl w-full mt-12">
      <h2 className="text-md font-bold text-gray-700 mb-3">Recent Prompts</h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
          >
            <p className="text-xs text-gray-500 mb-1">Original:</p>
            <p className="text-gray-700 mb-3 whitespace-pre-wrap">{item.before}</p>

            <p className="text-xs text-gray-500 mb-1">Refined:</p>
            <p className="text-gray-800 whitespace-pre-wrap">{item.after}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
