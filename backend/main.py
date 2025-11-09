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
    """Validate required environment variables on startup"""
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not found in environment variables")
    logger.info(f"Using model: {MODEL_NAME}")
    logger.info(f"API timeout set to: {API_TIMEOUT}s")


# --- Utility ---
def safe_text(value):
    """Convert various types to safe text strings"""
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return " ".join(str(v) for v in value)
    return str(value)


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
    improvement_notes: str = ""  # <–– NEW: captures “why” or contextual hints from /refine


# --- Root Routes ---
@app.get("/")
async def root():
    return {"service": "Promptodactyl API", "status": "running", "version": "1.2.0"}


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
Refine and improve the following user input into a clear, structured, high-quality prompt.
Return valid JSON with: before, after, why.
"""

        # Domain detection
        lower_text = data.text.lower()
        if "marketing" in lower_text:
            category = "marketing"
            context_hint = "Marketing or communication prompt. Focus on tone, conversion, and measurable outcomes."
        elif "strategy" in lower_text or "business" in lower_text:
            category = "business"
            context_hint = "Business or strategy prompt. Focus on clarity, structure, and actionable insights."
        elif "code" in lower_text or "api" in lower_text or "function" in lower_text:
            category = "code"
            context_hint = "Technical prompt. Focus on precision, inputs, and implementation clarity."
        elif "design" in lower_text or "visual" in lower_text:
            category = "design"
            context_hint = "Design or creative prompt. Focus on visual clarity and intent."
        elif "teach" in lower_text or "learn" in lower_text:
            category = "education"
            context_hint = "Educational prompt. Focus on clarity, examples, and depth."
        else:
            category = "general"
            context_hint = "General prompt. Focus on purpose, structure, and readability."

        user_prompt = f"""
{context_hint}

User input:
{data.text}

Refine and improve this into a professional, structured, production-ready prompt.
"""

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.4,
            timeout=API_TIMEOUT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        required_keys = ["before", "after", "why"]
        if not all(k in result for k in required_keys):
            raise ValueError("Missing keys in AI response")

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
            "category": category,
        }

    except Exception as e:
        logger.error(f"Refinement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Refinement failed")


# --- Enhancement Endpoint ---
@app.post("/enhance")
async def enhance_prompt(data: EnhanceRequest):
    """
    Enhance a refined prompt using added context and insights from the refinement phase.
    The 'improvement_notes' field (from the 'why' section of /refine) strengthens context alignment.
    """
    try:
        logger.info(f"Enhancing prompt of length: {len(data.refined)}")

        system_prompt = """
You are **Promptodactyl**, an expert Prompt Architect.
Take a refined prompt and elevate it further using the provided improvement notes and contextual inputs.
Return valid JSON with: before, after, why.
"""

        # --- Construct dynamic context for enhancement ---
        enhancement_context = f"""
Refined prompt:
{data.refined}

Improvement notes from previous refinement:
{data.improvement_notes or "none provided"}

Audience: {data.audience or "not specified"}
Desired outcome: {data.outcome or "not specified"}
Constraints: {data.constraints or "none"}

Using the above, produce a more context-aware, purpose-driven version.
Preserve clarity and structure, but enhance tone, role, and domain precision.
"""

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.55,
            timeout=API_TIMEOUT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": enhancement_context},
            ],
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        required_keys = ["before", "after", "why"]
        if not all(k in result for k in required_keys):
            raise ValueError("Missing keys in AI response")

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
        }

    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Enhancement failed")


# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
