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

# --- Utility ---
def safe_text(value):
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return " ".join(str(v) for v in value)
    return str(value)


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
    return {"service": "Promptodactyl API", "status": "running", "version": "1.1.0"}


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
Return valid JSON only with: before, after, why.
"""

        lower_text = data.text.lower()
        if "marketing" in lower_text:
            category = "marketing"
            context_hint = "Marketing or communication prompt. Focus on tone, conversion, and measurable outcomes."
        elif "strategy" in lower_text or "business" in lower_text:
            category = "business"
            context_hint = "Business or strategy prompt. Focus on clarity, structure, and actionable insights."
        elif "code" in lower_text or "api" in lower_text or "function" in lower_text:
            category = "code"
            context_hint = "Technical prompt. Focus on precision, language, and implementation clarity."
        elif "design" in lower_text or "visual" in lower_text:
            category = "design"
            context_hint = "Design or creative prompt. Focus on aesthetic direction and stylistic clarity."
        elif "teach" in lower_text or "learn" in lower_text:
            category = "education"
            context_hint = "Educational prompt. Focus on clarity, examples, and depth."
        else:
            category = "general"
            context_hint = "General prompt. Focus on purpose, structure, and readability."

        user_prompt = f"""
{context_hint}

Refine and enhance the following prompt:

{data.text}

Be concise, clear, and structured.
Return valid JSON with 'before', 'after', and 'why'.
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

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
            "category": category,
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Refinement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")


# --- Enhancement Endpoint ---
@app.post("/enhance")
async def enhance_prompt(data: dict):
    try:
        base_prompt = data.get("refined", "")
        outcome = data.get("outcome", "")
        audience = data.get("audience", "")
        constraints = data.get("constraints", "")

        system_prompt = """
You are an expert-level Prompt Architect.
Transform a refined prompt into a contextually enhanced version based on audience, outcome, and constraints.
Return valid JSON only with: before, after, why.
"""

        user_prompt = f"""
Refined prompt:
{base_prompt}

Audience: {audience or "not specified"}
Desired outcome: {outcome or "not specified"}
Constraints: {constraints or "none"}

Enhance the tone, focus, and clarity to suit this exact situation.
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.6,
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

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
