import { useState, useEffect } from "react";
import axios from "axios";

export default function Rating({ promptId, API_URL }) {
  const [rating, setRating] = useState(null);
  const [avg, setAvg] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

console.log("RATING COMPONENT promptId =", promptId);


  // Load average + detect previous vote
  useEffect(() => {
    // Check if this user already voted for this prompt
    const voted = localStorage.getItem(`rated_${promptId}`);
    if (voted) {
      setHasVoted(true);
    }

    // Load existing average
    axios
      .get(`${API_URL}/feedback/avg?prompt_id=${promptId}`)
      .then((r) => setAvg(r.data.avg))
      .catch(() => setAvg(0));
  }, [promptId]);


  // Voting handler
  const handleRate = async (value) => {
    if (hasVoted) return; // block double votes

    try {
      const response = await axios.post(`${API_URL}/feedback`, {
        prompt_id: promptId,
        rating: value
      });

      setRating(value);
      setAvg(response.data.avg);
      setHasVoted(true);

      // Persist the user's vote locally
      localStorage.setItem(`rated_${promptId}`, "true");

    } catch (err) {
      console.error("Rating failed:", err);
    }
  };


  return (
    <div style={{ marginTop: "0.5rem" }}>
      {/* Bigger stars */}
      <span style={{ fontSize: "1.8rem" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            onClick={() => !hasVoted && handleRate(n)}
            style={{
              cursor: hasVoted ? "default" : "pointer",
              opacity: hasVoted ? 0.4 : 1,
              color: n <= rating ? "#f5b301" : "#ccc",
              userSelect: "none"
            }}
          >
            ★
          </span>
        ))}
      </span>

      {/* Smaller average display */}
      {avg !== null && (
        <span style={{ marginLeft: 6, fontSize: "1.2rem", color: "#666" }}>
          ({avg})
        </span>
      )}
    </div>
  );
}
