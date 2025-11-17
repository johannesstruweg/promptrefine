import { useState, useEffect } from "react";
import axios from "axios";

export default function Rating({ promptId, API_URL }) {
  const [rating, setRating] = useState(null);
  const [globalAvg, setGlobalAvg] = useState(0);
  const [globalCount, setGlobalCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  console.log("RATING COMPONENT promptId =", promptId);

  // Load global average + detect previous vote
  useEffect(() => {
    if (!promptId || promptId === "default") return;

    // Check if this user already voted for this prompt
    const voted = localStorage.getItem(`rated_${promptId}`);
    if (voted) {
      setHasVoted(true);
      const savedRating = localStorage.getItem(`rating_${promptId}`);
      if (savedRating) {
        setRating(parseInt(savedRating));
      }
    }

    // Load GLOBAL average (all prompts combined)
    axios
      .get(`${API_URL}/feedback/global-avg`)
      .then((r) => {
        setGlobalAvg(r.data.avg || 0);
        setGlobalCount(r.data.total_ratings || 0);
        console.log("Loaded global average:", r.data);
      })
      .catch((err) => {
        console.error("Failed to load global average:", err);
        setGlobalAvg(0);
        setGlobalCount(0);
      });
  }, [promptId, API_URL]);

  // Voting handler
  const handleRate = async (value) => {
    if (hasVoted || loading) return;
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/feedback`, {
        prompt_id: promptId,
        rating: value
      });

      setRating(value);
      
      // Update global stats from response
      if (response.data.global_avg !== undefined) {
        setGlobalAvg(response.data.global_avg);
        setGlobalCount(response.data.global_total || globalCount + 1);
      }
      
      setHasVoted(true);

      // Persist the user's vote locally
      localStorage.setItem(`rated_${promptId}`, "true");
      localStorage.setItem(`rating_${promptId}`, value.toString());

      console.log("Rating submitted successfully:", response.data);
    } catch (err) {
      console.error("Rating failed:", err);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {/* Interactive stars for voting */}
      <span style={{ fontSize: "1.8rem" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            onClick={() => !hasVoted && !loading && handleRate(n)}
            style={{
              cursor: hasVoted || loading ? "default" : "pointer",
              opacity: hasVoted ? 0.4 : loading ? 0.6 : 1,
              color: n <= (rating || 0) ? "#f5b301" : "#ccc",
              userSelect: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!hasVoted && !loading) {
                e.target.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
            }}
          >
            ★
          </span>
        ))}
      </span>
      
      {/* Global average display */}
      {globalCount > 0 && (
        <span style={{ marginLeft: 6, fontSize: "1.2rem", color: "#666" }}>
          ({globalAvg.toFixed(1)})
        </span>
      )}

      {/* Loading indicator */}
      {loading && (
        <span style={{ marginLeft: 8, fontSize: "0.875rem", color: "#999" }}>
          Submitting...
        </span>
      )}
    </div>
  );
}
