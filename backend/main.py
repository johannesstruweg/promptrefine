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
    """Request model for prompt refinement"""
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
    """Request model for prompt enhancement"""
    refined: str
    outcome: str = ""
    audience: str = ""
    constraints: str = ""

    @validator("refined")
    def validate_refined(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Refined prompt must be at least 10 characters")
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
    """
    Refine a user prompt into a high-quality, production-ready prompt.
    Adds adaptive context cues (persona, structure, tone) without over-assuming intent.
    """
    try:
        logger.info(f"Refining prompt of length: {len(data.text)}")

        # --- Intelligent prompt logic ---
        system_prompt = """
You are an expert Prompt Engineer and Communication Designer.
Your mission is to transform a user’s rough or incomplete input into a refined, context-aware, and visibly superior prompt that looks and reads as if crafted by a professional.

Your output should not only improve functionality but *look distinctly clearer* than any competing optimizer.  
The user will often compare your result with another tool’s output—yours must demonstrate higher precision, structure, and polish.

---

IMPROVEMENT GOALS
- **Clarity:** Eliminate vague phrasing and redundant words. Make intent obvious.
- **Purpose:** Define exactly what the model should achieve or deliver.
- **Structure:** Present information cleanly with sections, roles, or steps if they clarify execution.
- **Context:** Add helpful persona, tone, or audience cues when they enhance specificity.
- **Professional Finish:** Make the refined version read like a ready-to-use production prompt, visually neat and authoritative.

---

PROCESS
1. Detect the user’s underlying intent (e.g., write, design, analyze, explain, plan, summarize).
2. Identify missing context, structure, or objectives.
3. Rewrite the prompt so it appears deliberate, confident, and immediately usable.
4. Use natural, direct sentences—no fluff, no self-references.
5. Do **not** invent facts, counts, or data unless implied.
6. Return only valid JSON using this schema:

{
  "before": "Original user input",
  "after": "Refined, structured, and visibly improved prompt ready for LLM use",
  "why": "Educational explanation of the improvements and why this version performs better"
}

---

STYLE GUIDELINES
- Write as though you are crafting the ideal prompt for a consultant, strategist, or researcher who values clarity and precision.
- Make improvement *obvious at a glance* — layout, tone, and specificity should all signal professionalism.
- Keep the “why” section short, factual, and confident: it should read like a brief design critique.
- Every word in the “after” field must feel intentional and high-impact.
"""

        # --- Domain/context classification ---
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
        elif "presentation" in lower_text or "slides" in lower_text or "deck" in lower_text:
            category = "presentation"
            context_hint = "Presentation-related prompt. Focus on logical flow, sections, and audience engagement."
        else:
            category = "general"
            context_hint = "General prompt. Focus on purpose, structure, and readability."

        # --- UX improvement hint ---
        context_hint = f"""
{context_hint}

Show a visibly improved version of the user's input.
Make the difference clear and educational — demonstrate how structure, tone, and specificity
can turn a vague prompt into a professional, ready-to-run one.
"""

        # --- Construct model prompt ---
        user_prompt = f"""
{context_hint}

User input:
{data.text}

Refine and enhance this into a visibly improved, production-ready prompt
that preserves the user’s intent but adds clarity, role, structure, and tone.
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

        # --- Logging + response handling ---
        if hasattr(response, "usage") and response.usage:
            logger.info(
                f"Token usage - Prompt: {response.usage.prompt_tokens}, "
                f"Completion: {response.usage.completion_tokens}, "
                f"Total: {response.usage.total_tokens}"
            )

        content = response.choices[0].message.content
        result = json.loads(content)

        required_keys = ["before", "after", "why"]
        if not all(k in result for k in required_keys):
            raise ValueError(f"Invalid AI response keys: {list(result.keys())}")

        for key in required_keys:
            if not isinstance(result[key], str) or not result[key].strip():
                raise ValueError(f"Empty or invalid {key} field in AI response")

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
            "category": category,
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Refinement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Refinement failed")


# --- Enhancement Endpoint ---
@app.post("/enhance")
async def enhance_prompt(data: EnhanceRequest):
    """
    Enhance a refined prompt with additional context.
    Adds tone, depth, and purpose alignment based on user inputs and inferred domain.
    """
    try:
        logger.info(f"Enhancing prompt of length: {len(data.refined)}")

        system_prompt = """
You are an expert-level Prompt Architect.
Your task is to take an already refined prompt and elevate it by aligning
it precisely to the provided audience, desired outcome, and constraints.

PROCESS:
1. Analyze the refined prompt and infer its domain (technical, business, marketing, educational, presentation, creative, etc.).
2. Interpret context:
   - AUDIENCE → adjust tone, formality, and language complexity.
   - OUTCOME → tailor structure, reasoning depth, or format to achieve it.
   - CONSTRAINTS → apply limits or stylistic guidance faithfully.
3. Enhance with purpose:
   - Preserve structure and clarity of the refined prompt.
   - Insert contextual cues (role, tone, objective) naturally.
   - Strengthen clarity, alignment, and domain accuracy.
4. Keep it lean and pragmatic — do not add decorative filler.
5. Return valid JSON only with:
   {
     "before": "...",
     "after": "...",
     "why": "..."
   }

STYLE GUIDELINES:
- Prefer professional, task-oriented phrasing.
- Do not over-specify slide counts, word limits, or arbitrary numbers.
- Reflect real-world expertise appropriate to the inferred domain.
"""

        # --- Category-sensitive hinting ---
        hint = ""
        lowered = data.refined.lower()
        if any(k in lowered for k in ["presentation", "slides", "deck"]):
            hint = "The prompt involves a presentation. Ensure logical flow and audience engagement."
        elif any(k in lowered for k in ["code", "api", "function", "script"]):
            hint = "The prompt is technical. Ensure clarity, precision, and explicit inputs/outputs."
        elif any(k in lowered for k in ["marketing", "campaign", "ad", "sales"]):
            hint = "The prompt is marketing-focused. Optimize for persuasion, tone, and measurable outcomes."
        elif any(k in lowered for k in ["teach", "lesson", "course", "students"]):
            hint = "The prompt is educational. Emphasize clarity, structure, and learning goals."
        elif any(k in lowered for k in ["design", "visual", "style", "aesthetic"]):
            hint = "The prompt is design-related. Align tone with creativity and clarity of direction."
        elif any(k in lowered for k in ["strategy", "plan", "business", "analysis"]):
            hint = "The prompt is strategic. Focus on clarity, structure, and decision-oriented reasoning."
        else:
            hint = "General-purpose prompt. Prioritize clarity, context, and actionable structure."

        user_prompt = f"""
Refined prompt:
{data.refined}

Context:
- Audience: {data.audience or "not specified"}
- Desired outcome: {data.outcome or "not specified"}
- Constraints: {data.constraints or "none"}

Additional hint: {hint}

Enhance this refined prompt by aligning it to the audience, outcome, and constraints.
Maintain structure but make it sound tailored, purposeful, and professional.
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

        if hasattr(response, "usage") and response.usage:
            logger.info(
                f"Token usage - Prompt: {response.usage.prompt_tokens}, "
                f"Completion: {response.usage.completion_tokens}, "
                f"Total: {response.usage.total_tokens}"
            )

        content = response.choices[0].message.content
        result = json.loads(content)

        required_keys = ["before", "after", "why"]
        if not all(k in result for k in required_keys):
            raise ValueError(f"Invalid AI response keys: {list(result.keys())}")

        for key in required_keys:
            if not isinstance(result[key], str) or not result[key].strip():
                raise ValueError(f"Empty or invalid {key} field in AI response")

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Enhancement failed")


# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
