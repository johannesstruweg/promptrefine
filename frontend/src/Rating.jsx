import { useState, useEffect } from "react";
import axios from "axios";

export default function Rating({ promptId, API_URL }) {
  const [rating, setRating] = useState(null);
  const [promptAvg, setPromptAvg] = useState(0);
  const [globalAvg, setGlobalAvg] = useState(0);
  const [globalCount, setGlobalCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  console.log("RATING COMPONENT promptId =", promptId);

  // Load global average + prompt average + detect previous vote
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

    // Optionally still load prompt-specific average for comparison
    axios
      .get(`${API_URL}/feedback/avg?prompt_id=${promptId}`)
      .then((r) => {
        setPromptAvg(r.data.avg || 0);
        console.log("Loaded prompt average:", r.data);
      })
      .catch((err) => {
        console.error("Failed to load prompt average:", err);
        setPromptAvg(0);
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
      setPromptAvg(response.data.avg || 0);
      
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

  // Render stars based on global average
  const renderStars = (avg) => {
    return [1, 2, 3, 4, 5].map((n) => {
      const filled = n <= Math.round(avg);
      return (
        <span
          key={n}
          style={{
            color: filled ? "#f5b301" : "#ccc",
            userSelect: "none"
          }}
        >
          ★
        </span>
      );
    });
  };

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {/* Global Rating Display (for everyone to see) */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
          Overall App Rating
        </div>
        <span style={{ fontSize: "1.5rem" }}>
          {renderStars(globalAvg)}
        </span>
        <span style={{ marginLeft: 8, fontSize: "1.1rem", color: "#666", fontWeight: "500" }}>
          {globalAvg > 0 ? globalAvg.toFixed(1) : "0.0"}
        </span>
        <span style={{ marginLeft: 4, fontSize: "0.9rem", color: "#999" }}>
          ({globalCount} rating{globalCount !== 1 ? "s" : ""})
        </span>
      </div>

      {/* User's Rating Interface */}
      <div>
        <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
          {hasVoted ? "Your Rating" : "Rate improvement"}
        </div>
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

        {/* Loading indicator */}
        {loading && (
          <span style={{ marginLeft: 8, fontSize: "0.875rem", color: "#999" }}>
            Submitting...
          </span>
        )}
      </div>
    </div>
  );
}
