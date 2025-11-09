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

# --- Configuration ---
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
API_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT", "30.0"))

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


# --- Startup Event ---
@app.on_event("startup")
async def startup_event():
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not found in environment variables")
    logger.info(f"Using model: {MODEL_NAME}")
    logger.info(f"API timeout set to: {API_TIMEOUT}s")


# --- Utility ---
def safe_text(value):
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return " ".join(str(v) for v in value)
    return str(value)


def ensure_str(value):
    """Guarantee a string output even if model returns dict or list"""
    if isinstance(value, str):
        return value.strip()
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


def format_json_readable(value):
    """Detect JSON-like content and format it into a human-readable Markdown code block."""
    try:
        if isinstance(value, (dict, list)):
            obj = value
        else:
            obj = json.loads(value)
        pretty = json.dumps(obj, indent=2, ensure_ascii=False)
        return {
            "raw": obj,
            "pretty": f"```json\n{pretty}\n```"
        }
    except Exception:
        return {
            "raw": value,
            "pretty": value
        }


# --- Data Models ---
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


class EnhanceRequest(BaseModel):
    refined: str
    outcome: str = ""
    audience: str = ""
    constraints: str = ""
    category: str = ""
    hint: str = ""

    @validator("refined")
    def validate_refined(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Refined prompt must be at least 10 characters")
        return v


# --- Category Hint Helper ---
def get_category_hint(text: str, category: str = "") -> str:
    t = text.lower()
    if category == "marketing" or any(k in t for k in ["marketing", "campaign", "ad", "sales"]):
        return "Marketing context. Focus on persuasion, tone, and measurable outcomes."
    if category == "business" or any(k in t for k in ["strategy", "plan", "analysis", "business"]):
        return "Strategic or business context. Emphasize clarity, structure, and actionable reasoning."
    if category == "code" or any(k in t for k in ["code", "api", "function", "script"]):
        return "Technical context. Ensure precision, input/output clarity, and concise logic."
    if category == "design" or any(k in t for k in ["design", "visual", "style", "aesthetic"]):
        return "Design context. Highlight creative direction, clarity, and intent."
    if category == "education" or any(k in t for k in ["teach", "lesson", "students", "learn"]):
        return "Educational context. Emphasize clarity, structure, and learning outcomes."
    if category == "presentation" or any(k in t for k in ["presentation", "slides", "deck"]):
        return "Presentation context. Focus on logical flow, engagement, and visual pacing."
    return "General context. Prioritize clarity, relevance, and structural balance."


# --- Root Routes ---
@app.get("/")
async def root():
    return {"service": "Promptodactyl API", "status": "running", "version": "1.3.2"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# --- Core Refinement Endpoint ---
@app.post("/refine")
async def refine_prompt(data: Prompt):
    try:
        logger.info(f"Refining prompt of length: {len(data.text)}")

        system_prompt = """
You are **Promptodactyl**, an expert Prompt Engineer and Communication Designer.
Your mission is to transform any user’s rough, incomplete, or unclear input into a refined, context-aware, and visually superior prompt that demonstrates clarity, precision, and purpose.

Your refined output must not only function better but **look distinctly clearer** — elegantly structured, well-formatted, and unmistakably professional.
"""

        lower_text = data.text.lower()
        if "marketing" in lower_text:
            category = "marketing"
        elif "strategy" in lower_text or "business" in lower_text:
            category = "business"
        elif "code" in lower_text or "api" in lower_text or "function" in lower_text:
            category = "code"
        elif "design" in lower_text or "visual" in lower_text:
            category = "design"
        elif "teach" in lower_text or "learn" in lower_text:
            category = "education"
        elif "presentation" in lower_text or "slides" in lower_text or "deck" in lower_text:
            category = "presentation"
        else:
            category = "general"

        category_hint = get_category_hint(data.text, category)

        context_hint = f"""
Detected category: {category.upper()}  
{category_hint}

Show a visibly improved version of the user's input.
Demonstrate how structure, tone, and specificity can turn a vague prompt into a professional, production-ready one.
"""

        user_prompt = f"""
{context_hint}

User input:
{data.text}

Refine this into a structured, ready-to-run prompt that preserves intent while improving tone, role, and precision.
Return valid JSON with 'before', 'after', and 'why'.
"""

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.45,
            timeout=API_TIMEOUT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        for k in ["before", "after", "why"]:
            if k not in result:
                raise ValueError(f"Missing key in AI output: {k}")
            result[k] = ensure_str(result[k])
            if not result[k]:
                raise ValueError(f"Empty value for key: {k}")

        formatted_after = format_json_readable(result["after"])

        return {
            "before": safe_text(result["before"]),
            "after_raw": formatted_after["raw"],
            "after_pretty": formatted_after["pretty"],
            "why": safe_text(result["why"]),
            "category": category,
            "hint": category_hint,
        }

    except Exception as e:
        logger.error(f"Refinement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Refinement failed")


# --- Enhancement Endpoint ---
@app.post("/enhance")
async def enhance_prompt(data: EnhanceRequest):
    try:
        logger.info(f"Enhancing prompt of length: {len(data.refined)}")

        system_prompt = """
You are **Promptodactyl**, an expert-level Prompt Architect.
Your mission is to take an *already refined prompt* and elevate it further — aligning it precisely with the user’s provided **audience**, **desired outcome**, and **constraints**.
Your adjustments must sound deliberate, precise, and human-grade in intent.
"""

        active_hint = data.hint or get_category_hint(data.refined, data.category)

        user_prompt = f"""
Refined prompt:
{data.refined}

Context:
- Audience: {data.audience or "not specified"}
- Desired outcome: {data.outcome or "not specified"}
- Constraints: {data.constraints or "none"}
- Category hint: {active_hint}

Enhance this refined prompt by aligning it perfectly with audience, outcome, and constraints.
Keep structure intact but increase specificity, tone alignment, and professionalism.
Return valid JSON with 'before', 'after', and 'why'.
"""

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.55,
            timeout=API_TIMEOUT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        for k in ["before", "after", "why"]:
            if k not in result:
                raise ValueError(f"Missing key in AI output: {k}")
            result[k] = ensure_str(result[k])
            if not result[k]:
                raise ValueError(f"Empty value for key: {k}")

        formatted_after = format_json_readable(result["after"])

        return {
            "before": safe_text(result["before"]),
            "after_raw": formatted_after["raw"],
            "after_pretty": formatted_after["pretty"],
            "why": safe_text(result["why"]),
        }

    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Enhancement failed")


# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
