import { useEffect, useState } from "react";
import { SUGGESTIONS } from "./suggestions";

export default function SuggestionCards({ onSelect }) {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    // Shuffle and pick 3 suggestions on first load
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
    setCards(shuffled.slice(0, 3));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {cards.map((prompt, i) => (
        <div
          key={i}
          onClick={() => onSelect(prompt)}
          className="cursor-pointer p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition shadow-sm"
        >
          <p className="text-gray-700 text-sm">{prompt}</p>
        </div>
      ))}
    </div>
  );
}
