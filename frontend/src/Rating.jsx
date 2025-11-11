import { useState, useEffect } from "react";

export default function Rating({ promptId, API_URL }) {
  const [rating, setRating] = useState(0);
  const [avg, setAvg] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/feedback/avg?prompt_id=${promptId}`)
      .then(res => res.json())
      .then(data => setAvg(data.avg));
  }, [promptId]);

  async function handleRate(value) {
    setRating(value);
    const res = await fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId, rating: value }),
    });
    const data = await res.json();
    setAvg(data.avg);
  }

  return (
    <div style={{ fontSize: "1.4rem", marginTop: "0.5rem" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => handleRate(n)}
          style={{
            cursor: "pointer",
            color: n <= rating ? "#f5b301" : "#ccc",
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
      {avg !== null && <span style={{ marginLeft: 6 }}>({avg})</span>}
    </div>
  );
}
