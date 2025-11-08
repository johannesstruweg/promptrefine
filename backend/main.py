from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from openai import OpenAI
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI()

app = FastAPI()

# --- CORS Configuration ---
allowed_origins = [
    "https://promptodactyl.com",
    "https://www.promptodactyl.com",
    "https://promptodactyl.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
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


# --- Routes ---
@app.get("/")
async def root():
    return {"service": "Promptodactyl API", "status": "running", "version": "1.0.0"}


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
   - If input <15 words or unclear, infer intent and state assumption.
2. Generate Optimized Prompt: include role/persona, objective, structure, constraints, context/examples, and success criteria.
   - For marketing: audience, tone, platform conventions, frameworks.
   - For technical: stack, structure, error handling, performance.
   - For business: audience level, CTA, compliance, and tone.
3. Provide Optimization Analysis:
   - Quantitative comparison: word/character counts.
   - Qualitative improvements: list 3–5 concrete changes and their benefits.
   - Reasoning summary: 1–2 sentences explaining why these changes improve results.
4. Context Gathering (optional):
   - Ask 2–3 concise questions only if necessary.
   - If skipped, clearly state assumptions.
5. Apply Optimization Principles:
   - DO preserve intent, add clarity, specificity, and domain intelligence.
   - DO anticipate model failure modes.
   - DON’T over-engineer, contradict, or generalize improvements.
6. Run Quality Checks:
   - Clarity, Specificity, Completeness, Consistency, Practicality, and Formatting.
   - Output must follow strict markdown structure defined below.
7. Output Discipline:
   - Return only valid JSON with keys: before, after, why.
   - End with “[END OF OPTIMIZATION OUTPUT]”.

OUTPUT FORMAT:
{
  "before": "original user prompt",
  "after": "optimized, production-ready prompt with role, objective, and structure",
  "why": "brief explanation of what was improved and why it enhances LLM reliability"
}
[END OF OPTIMIZATION OUTPUT]
"""

        # Context-aware hinting
        lower_text = data.text.lower()
        if "marketing" in lower_text:
            context_hint = (
                "This prompt appears related to marketing or communication. "
                "Emphasize target audience, tone, structure, and measurable outcomes."
            )
        elif "manufacturing" in lower_text:
            context_hint = (
                "This prompt appears related to manufacturing or process optimization. "
                "Emphasize efficiency metrics, quantitative reasoning, and implementation steps."
            )
        elif "strategy" in lower_text or "business" in lower_text:
            context_hint = (
                "This prompt appears related to business or strategy. "
                "Focus on actionable insights, data-driven logic, and decision clarity."
            )
        else:
            context_hint = (
                "General improvement: clarify purpose, define a clear role, and strengthen structure."
            )

        user_prompt = f"""
{context_hint}

Refine and enhance the following prompt according to your system instructions:

{data.text}

Focus on clarity, structure, and depth. Ensure the rewritten prompt defines a role, objective, and output structure.
Return only valid JSON in the defined format.
"""

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

        logger.info("Refinement successful")
        return result

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

        logger.info("Enhancing refined prompt")

        system_prompt = """
You are a senior prompt optimization specialist.
Your task is to take an already refined prompt and elevate it further using
the additional context provided. The goal is to make the final prompt maximally
precise, contextual, and aligned with the intended audience and purpose.

When enhancing:
1. Preserve the structure and clarity of the refined prompt.
2. Integrate the user’s specific outcome, audience, and constraints directly into the wording.
3. Strengthen any analytical or reasoning requirements if relevant.
4. Maintain brevity and usability — this should be a polished, ready-to-use prompt.

Return valid JSON only with:
- before: the original refined prompt
- after: the enhanced version
- why: what specific contextual adjustments were made
"""

        user_prompt = f"""
Refined prompt to improve:
{base_prompt}

Additional details:
- Desired outcome: {outcome or "not specified"}
- Intended audience: {audience or "not specified"}
- Constraints/requirements: {constraints or "not specified"}

Enhance and return valid JSON only.
"""

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

        logger.info("Enhancement successful")
        return result

    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


# --- Run Locally ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
