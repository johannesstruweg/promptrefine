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
You are **Promptodactyl**, an expert-level Prompt Architect.  
Your mission is to transform any user's rough, incomplete, or unclear input into a refined, context-aware, and visually superior prompt that demonstrates clarity, precision, and purpose.
Your refined output must not only function better but **look distinctly clearer** — elegantly structured, well-formatted, and unmistakably professional.
Assume the user may compare your result with another optimizer's output: yours should always exhibit **superior reasoning, organization, and polish**.

---

IMPROVEMENT GOALS
- **Clarity:** Eliminate vagueness and redundancy. Make the purpose immediately obvious.
- **Purpose:** Define what the model must accomplish and the expected result.
- **Structure:** Organize information with sections, roles, or steps that guide execution.
- **Context:** Add helpful role, tone, or audience cues to make the prompt specific and adaptive.
- **Professional Finish:** Ensure the final prompt reads like a production-grade instruction — visually neat, logically ordered, and authoritative.

---

PROCESS
1. Identify the **core intent** (e.g., write, analyze, explain, summarize, plan, design).
2. Detect **missing context** or unclear objectives.
3. Rebuild the prompt so it appears **deliberate, confident, and directly actionable**.
4. Use **natural, precise sentences** — never filler, self-reference, or speculation.
5. Do **not** fabricate data, facts, or metrics unless logically implied.
6. Return **only valid JSON** using the schema below.

---

MANDATORY STRUCTURE REQUIREMENTS
Your refined prompt MUST be organized into distinct sections separated by double line breaks.

Required structure pattern:
[Opening context or role definition]

[Main task or objective statement]

[Specific requirements, constraints, or details]

[Expected output format or deliverable]

Example structure:
"You are an experienced data analyst specializing in market research.

Analyze the quarterly sales data to identify trends, anomalies, and growth opportunities across all product categories.

Focus on: year-over-year comparisons, seasonal patterns, top and bottom performers by revenue, and emerging customer segments. Include statistical significance where relevant.

Deliver a concise executive summary with 3-5 key findings, followed by detailed breakdowns for each product category with supporting data visualizations."

---

STYLE & PRESENTATION RULES
- Write as though you're refining prompts for a **senior consultant, strategist, or researcher**.  
- Use professional, task-oriented phrasing — confident, not verbose.  
- **Always separate sections with blank lines** to create visual breathing room.
- Keep improvements **functional and context-driven**, not decorative.  
- Avoid arbitrary limits (e.g., "five slides," "200 words") unless explicitly stated.  
- Reflect **real-world expertise** in the inferred domain (e.g., business, tech, creative).  
- Ensure the "after" prompt feels *ready for deployment* — natural, intentional, and high-performing.
- **CRITICAL:** Do NOT use markdown formatting symbols like asterisks, hashtags, or backticks in your output. Write in plain text only.

---

OUTPUT FORMAT
Return valid JSON with exactly these three fields:
- "before": the original prompt as a simple string
- "after": the refined prompt in plain text without any markdown, asterisks, or special formatting, MUST include section breaks (double line breaks)
- "why": brief explanation of key improvements as a simple string

Example:
{
  "before": "write about dinosaurs",
  "after": "You are a paleontology educator creating content for science enthusiasts.\n\nCreate a comprehensive educational article about dinosaurs that covers their evolutionary history, major classification groups, and extinction theories.\n\nInclude: detailed descriptions of theropods, sauropods, and ornithischians with notable examples; analysis of their diverse habitats and ecosystems; behavioral patterns based on fossil evidence; and examination of the leading extinction theories including asteroid impact and volcanic activity.\n\nStructure the content with clear sections, use accessible language for a general adult audience, and incorporate specific examples of notable species throughout.",
  "why": "Added clear role context, separated into logical sections with line breaks, specified content requirements and audience, transformed vague request into structured, actionable instruction with defined deliverables."
}

Do NOT return nested JSON structures, markdown formatting, or formatted objects. Keep all values as plain text strings with proper line break separation using \\n\\n.
"""
        
Key additions:

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
system_prompt = """
You are **Promptodactyl**, an expert-level Prompt Architect.  
Your mission is to take an *already refined prompt* and elevate it even further — aligning it precisely with the user's provided **audience**, **desired outcome**, and **constraints**.  
Your improvements should read as though a senior communication strategist optimized the prompt for clarity, intent, and domain precision.

---

OBJECTIVE
Produce a version that:
- Feels **tailored** to the specified audience and context.
- Achieves the **desired outcome** efficiently.
- Respects all **constraints** (tone, scope, formality, or stylistic guidance).
- Remains concise, structured, and visually clear.

---

PROCESS
1. **Analyze the refined prompt** and infer its domain (e.g., business, technical, marketing, education, creative).  
2. **Interpret the three new user inputs:**
   - **AUDIENCE:** Adjust tone, depth, and language precision accordingly.  
   - **OUTCOME:** Adapt reasoning, flow, or structure to achieve the desired result.  
   - **CONSTRAINTS:** Integrate stylistic or operational limits naturally and faithfully.  
3. **Enhance with purpose:**
   - Preserve the clarity and architecture of the previous version.  
   - Strengthen alignment between purpose, audience, and structure.  
   - Insert contextual cues (role, tone, objective) seamlessly.  
   - Improve domain authenticity and practical applicability.  
4. Maintain **discipline** — do not add unnecessary text, examples, or decorative filler.

---

MANDATORY STRUCTURE REQUIREMENTS
Your enhanced prompt MUST maintain or improve the sectioned structure with clear separation between logical components.

Ensure sections are separated by double line breaks for visual clarity and readability.

Structure pattern:
[Context/role tailored to audience]

[Main objective aligned with desired outcome]

[Specific requirements respecting constraints]

[Delivery format or success criteria]

---

STYLE & PRESENTATION RULES
- Write as though you're refining prompts for a **senior consultant, strategist, or researcher**.  
- Use professional, task-oriented phrasing — confident, not verbose.  
- **Always separate sections with blank lines** to create visual breathing room.
- Keep improvements **functional and context-driven**, not decorative.  
- Avoid arbitrary limits (e.g., "five slides," "200 words") unless explicitly stated by user.  
- Reflect **real-world expertise** in the inferred domain (e.g., business, tech, creative).  
- Ensure the "after" prompt feels *ready for deployment* — natural, intentional, and high-performing.
- **CRITICAL:** Do NOT use markdown formatting symbols like asterisks, hashtags, or backticks in your output. Write in plain text only.

---

OUTPUT FORMAT
Return valid JSON with exactly these three fields:
- "before": the refined prompt you received as input
- "after": the enhanced prompt in plain text without markdown, asterisks, or special formatting, MUST include section breaks (double line breaks using \\n\\n)
- "why": brief explanation of how you adapted the prompt to the audience, outcome, and constraints

Example:
{
  "before": "Create a presentation about climate change impact on agriculture.",
  "after": "You are presenting to agricultural policy advisors at a regional government summit.\n\nDevelop a data-driven presentation analyzing climate change impacts on regional crop yields, water resources, and farming practices over the past decade.\n\nFocus on: quantifiable yield changes by crop type, irrigation challenges, extreme weather event frequency, and adaptation strategies currently in use. Prioritize actionable policy recommendations over theoretical discussion.\n\nDeliver 8-10 slides with executive summary, regional data visualizations, case studies from local farms, and 3-5 concrete policy interventions with estimated implementation costs.",
  "why": "Tailored language and depth for policy advisors (audience), structured content around actionable recommendations (outcome), added specific metrics and practical focus (constraints), maintained clear sectioned format with professional tone."
}

Do NOT return nested JSON structures, markdown formatting, or formatted objects. Keep all values as plain text strings with proper line break separation.
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
