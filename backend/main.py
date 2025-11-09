from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from openai import OpenAI
import os
import json
import logging

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- OpenAI Client ---
client = OpenAI()

# --- FastAPI App ---
app = FastAPI()

# --- CORS Configuration ---
allowed_origins = [
    "https://promptodactyl.com",
    "https://www.promptodactyl.com",
    "https://promptodactyl.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

if os.getenv("ALLOWED_ORIGINS"):
    allowed_origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Model ---
class Prompt(BaseModel):
    text: str

    @validator("text")
    def validate_text(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Prompt must be at least 10 characters")
        if len(v) > 2000:
            raise ValueError("Prompt must be less than 2000 characters")
        return v

# --- Root Routes ---
@app.get("/")
async def root():
    return {"service": "Promptodactyl API", "status": "running", "version": "1.0.1"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# --- Core Refinement Endpoint ---
@app.post("/refine")
async def refine_prompt(data: Prompt):
    try:
        logger.info(f"Refining prompt of length: {len(data.text)}")

        system_prompt = """
You are an expert prompt engineer specializing in transforming user inputs into high-quality, production-ready prompts optimized for large language models (LLMs).
Your purpose is to create clear, specific, domain-intelligent prompts that reliably yield superior outputs.

PROCESS:
1. Analyze Context: identify task type, domain, platform, and implicit requirements.
2. Generate Optimized Prompt: include role/persona, objective, structure, constraints, context/examples, and success criteria.
3. Provide Optimization Analysis with clear reasoning.
4. Output valid JSON only with: before, after, why.
"""

        # --- Context Hint ---
        lower_text = data.text.lower()
        if "marketing" in lower_text:
            context_hint = "This prompt appears related to marketing or communication. Focus on audience, tone, and measurable outcomes."
        elif "manufacturing" in lower_text:
            context_hint = "This prompt appears related to manufacturing or process optimization. Focus on efficiency, implementation, and quantitative reasoning."
        elif "strategy" in lower_text or "business" in lower_text:
            context_hint = "This prompt appears related to business or strategy. Focus on actionable insights and data-driven clarity."
        else:
            context_hint = "General improvement: clarify purpose, define a clear role, and strengthen structure."

        user_prompt = f"""
{context_hint}

Refine and enhance the following prompt according to your system instructions:

{data.text}

Focus on clarity, structure, and depth. Ensure the rewritten prompt defines a role, objective, and output structure.
Return only valid JSON in the defined format.
"""

        # --- OpenAI Call ---
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        if not all(k in result for k in ["before", "after", "why"]):
            raise ValueError("Invalid response structure from AI")

        # --- Create Formatted Versions ---
        formatted_markdown = f"""
### Original Prompt
{result["before"]}

### Optimized Prompt
{result["after"]}

### Why It’s Better
{result["why"]}
""".strip()

        formatted_html = f"""
<div style='font-family:monospace;background:#0b0d10;color:#eaeaea;padding:20px;border-radius:10px;'>
  <h3 style='color:#5da8ff;'>Original Prompt</h3>
  <pre style='white-space:pre-wrap;background:#121417;padding:10px;border-radius:6px;'>{result["before"]}</pre>

  <h3 style='color:#5da8ff;'>Optimized Prompt</h3>
  <pre style='white-space:pre-wrap;background:#121417;padding:10px;border-radius:6px;'>{result["after"]}</pre>

  <h3 style='color:#5da8ff;'>Why It’s Better</h3>
  <p style='color:#bfc5ce;font-size:0.95rem;line-height:1.5;'>{result["why"]}</p>
</div>
""".strip()

        # --- Final Structured Response ---
        final_response = {
            "before": result["before"].strip(),
            "after": result["after"].strip(),
            "why": result["why"].strip(),
            "formatted": {
                "markdown": formatted_markdown,
                "html": formatted_html,
            },
        }

        logger.info("Refinement successful")
        return final_response

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Refinement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")

# --- Enhancement Endpoint (Second-Stage Refinement) ---
@app.post("/enhance")
async def enhance_prompt(data: dict):
    """
    Accepts a refined prompt and optional context details for deeper optimization.
    Expected keys: 'refined', 'outcome', 'audience', 'constraints'
    """
    try:
        base_prompt = data.get("refined", "")
        outcome = data.get("outcome", "")
        audience = data.get("audience", "")
        constraints = data.get("constraints", "")

        logger.info("Enhancing refined prompt with contextual intelligence")

        # --- Advanced Contextual System Prompt ---
        system_prompt = """
You are an expert-level Prompt Architect.
Your mission is to transform a refined prompt into an elite, context-optimized version
using specific real-world parameters provided by the user (audience, outcome, constraints).

Follow this process:
1. **Interpret Context:**
   - Analyze audience type (executives, developers, marketers, students, etc.) and adjust vocabulary, tone, and depth accordingly.
   - Align with desired outcome (insight, decision, explanation, content generation, analysis, etc.) and optimize for that goal.
   - Apply constraints precisely — e.g., brevity, tone, formality, style, or domain limits.

2. **Enhance with Purpose:**
   - Retain logical structure and clarity from the refined version.
   - Integrate the provided audience, outcome, and constraints naturally within the wording.
   - Strengthen reasoning depth, contextual precision, and usability.
   - Make the prompt sound purpose-built for this exact use case.

3. **Balance and Style:**
   - Be assertive in your transformation but preserve the core intent.
   - Prefer concise, high-performance wording over verbosity.
   - You may restructure or reframe slightly if it increases clarity or alignment.

Common domain mappings:
- Business → clarity, brevity, actionability
- Technical → precision, validation, structure
- Marketing → persuasive tone, audience focus, measurable results
- Education → clarity, empathy, scaffolding
- Creative → vividness, stylistic coherence, imagination

Return valid JSON only with:
{
  "before": "...original refined prompt...",
  "after": "...contextually enhanced version...",
  "why": "...explanation of how audience, outcome, and constraints influenced the prompt..."
}
"""

        # --- Context-Aware User Prompt ---
        user_prompt = f"""
You are enhancing a refined prompt. Integrate and adapt it based on the following context.

---
Refined prompt:
{base_prompt}

User context:
- Audience: {audience or "not specified"}
- Desired outcome: {outcome or "not specified"}
- Constraints: {constraints or "none"}
---

Guidelines:
- Adjust tone, focus, and structure for the specified audience and purpose.
- Explicitly reflect any constraints in how the task is described or limited.
- The enhanced prompt should sound like it was designed *only* for this situation.
- Do not add commentary or meta text — return valid JSON only.
"""

        # --- OpenAI Call ---
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.6,  # slightly higher for creativity and contextual nuance
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        if not all(k in result for k in ["before", "after", "why"]):
            raise ValueError("Invalid response structure from AI")

        logger.info("Contextual enhancement successful")
        return {
            "before": result["before"].strip(),
            "after": result["after"].strip(),
            "why": result["why"].strip(),
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
