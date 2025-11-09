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
client = OpenAI()
app = FastAPI()

# --- CORS ---
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
    improvement_notes: str = ""


# --- Root Routes ---
@app.get("/")
async def root():
    return {"service": "Promptodactyl API", "status": "running", "version": "1.4.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# --- Core Refinement Endpoint (with Dynamic Context Reflection) ---
@app.post("/refine")
async def refine_prompt(data: Prompt):
    try:
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

        system_prompt = f"""
You are Promptodactyl, an expert-level Prompt Architect.
Your mission is to transform any user's rough, incomplete, or unclear input into a refined, context-aware, and visually superior prompt that demonstrates clarity, precision, and purpose.
Your refined output must not only function better but look distinctly clearer — elegantly structured, well-formatted, and unmistakably professional.
Assume the user may compare your result with another optimizer's output: yours should always exhibit superior reasoning, organization, and polish.

IMPROVEMENT GOALS
- Clarity: Eliminate vagueness and redundancy. Make the purpose immediately obvious.
- Purpose: Define what the model must accomplish and the expected result.
- Structure: Organize information with sections, roles, or steps that guide execution.
- Context: Add helpful role, tone, or audience cues to make the prompt specific and adaptive.
- Professional Finish: Ensure the final prompt reads like a production-grade instruction — visually neat, logically ordered, and authoritative.

PROCESS
1. Identify the core intent (e.g., write, analyze, explain, summarize, plan, design).
2. Detect missing context or unclear objectives.
3. Rebuild the prompt so it appears deliberate, confident, and directly actionable.
4. Use natural, precise sentences — never filler, self-reference, or speculation.
5. Do not fabricate data, facts, or metrics unless logically implied.
6. Return only valid JSON using the schema below.

MANDATORY STRUCTURE REQUIREMENTS
Your refined prompt MUST be organized into distinct sections separated by double line breaks.

Required structure pattern:
[Opening context or role definition]

[Main task or objective statement]

[Specific requirements, constraints, or details]

[Expected output format or deliverable]

STYLE & PRESENTATION RULES
- Write as though you're refining prompts for a senior consultant, strategist, or researcher.
- Use professional, task-oriented phrasing — confident, not verbose.
- Always separate sections with blank lines to create visual breathing room.
- Keep improvements functional and context-driven, not decorative.
- Avoid arbitrary limits unless explicitly stated.
- Reflect real-world expertise in the inferred domain (e.g., business, tech, creative).
- Ensure the "after" prompt feels ready for deployment — natural, intentional, and high-performing.
- CRITICAL: Do NOT use markdown formatting symbols like asterisks, hashtags, or backticks in your output. Write in plain text only.

OUTPUT FORMAT
Return valid JSON with exactly these three fields:
- "before": the original prompt as a simple string
- "after": the refined prompt in plain text without any markdown, asterisks, or special formatting, MUST include section breaks (double line breaks)
- "why": brief explanation of key improvements as a simple string
"""

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

        # --- Dynamic context reflection: infer next-step placeholder questions ---
        try:
            reflection_prompt = f"""
You are Promptodactyl's Context Mirror.
Given the refined prompt and improvement notes below, infer what 3 short, natural follow-up questions would help clarify audience, outcome, or constraints.
The questions must sound context-aware, not generic.

Refined prompt:
{result['after']}

Improvement notes:
{result['why']}

Respond ONLY as valid JSON with:
{{"questions": ["q1", "q2", "q3"]}}
"""

            reflection = client.chat.completions.create(
                model=MODEL_NAME,
                temperature=0.6,
                timeout=10,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": reflection_prompt}],
            )

            dynamic_qs = json.loads(reflection.choices[0].message.content)["questions"]

        except Exception as sub_e:
            logger.warning(f"Context reflection failed: {str(sub_e)}")
            dynamic_qs = [
                "Who is this for?",
                "What is the main purpose?",
                "Any tone or format constraints?"
            ]

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
            "category": category,
            "context_questions": dynamic_qs,
        }

    except Exception as e:
        logger.error(f"Refinement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Refinement failed")


        # --- Core system instructions (unchanged from your version) ---
        system_prompt = f"""
You are Promptodactyl, an expert-level Prompt Architect.
Your mission is to take an already refined prompt and elevate it even further — aligning it precisely with the user's audience, desired outcome, and constraints.

You must integrate the contextual insight from the previous refinement (improvement notes or inferred domain cues) and maintain all mandatory structure requirements described below.

MANDATORY STRUCTURE REQUIREMENTS
Your enhanced prompt MUST maintain or improve the sectioned structure:
[Context/role tailored to audience]

[Main objective aligned with desired outcome]

[Specific requirements respecting constraints]

[Delivery format or success criteria]

STYLE & PRESENTATION RULES
- Write as though you're refining prompts for a senior consultant, strategist, or researcher.
- Use professional, task-oriented phrasing — confident, not verbose.
- Always separate sections with blank lines to create visual breathing room.
- Keep improvements functional and context-driven.
- Reflect real-world expertise in the inferred domain.
- CRITICAL: Do NOT use markdown formatting symbols like asterisks, hashtags, or backticks in your output.

OUTPUT FORMAT
Return valid JSON with exactly these three fields:
- "before": the refined prompt you received as input
- "after": the enhanced prompt (plain text, section breaks with \\n\\n)
- "why": brief explanation of how you adapted the prompt to the audience, outcome, and constraints
"""

              # --- Build enhancement context (using dynamic context questions if available) ---
        dynamic_qs = getattr(data, "context_questions", None)

        if dynamic_qs and isinstance(dynamic_qs, list) and len(dynamic_qs) >= 3:
            inferred_audience = dynamic_qs[0]
            inferred_outcome = dynamic_qs[1]
            inferred_constraints = dynamic_qs[2]
        else:
            inferred_audience = "Who is this for?"
            inferred_outcome = "What should this achieve?"
            inferred_constraints = "Any tone or format constraints?"

        enhancement_context = f"""
Refined prompt:
{data.refined}

Improvement notes from previous refinement:
{data.improvement_notes or "none provided"}

Audience: {data.audience or inferred_audience}
Desired outcome: {data.outcome or inferred_outcome}
Constraints: {data.constraints or inferred_constraints}

Enhance this prompt while preserving clarity, role precision, and structural consistency.
"""


        # --- Model call (unchanged) ---
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

        # --- Response mirrors first output more closely and returns placeholders ---
        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
            "context_used": {
                "domain": domain,
                "audience": data.audience or placeholder_audience,
                "outcome": data.outcome or placeholder_outcome,
                "constraints": data.constraints or placeholder_constraints,
                "improvement_notes": data.improvement_notes or "none provided",
            },
        }

    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Enhancement failed")



# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
