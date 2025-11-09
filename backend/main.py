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
    """API root endpoint with service information"""
    return {"service": "Promptodactyl API", "status": "running", "version": "1.1.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# --- Core Refinement Endpoint ---
@app.post("/refine")
async def refine_prompt(data: Prompt):
    """
    Refine a user prompt into a high-quality, production-ready prompt.
    
    Args:
        data: Prompt object containing the text to refine
        
    Returns:
        Dict with before, after, why, and category fields
    """
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
            model=MODEL_NAME,
            temperature=0.4,
            timeout=API_TIMEOUT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        # Log token usage for cost monitoring
        if hasattr(response, 'usage') and response.usage:
            logger.info(f"Token usage - Prompt: {response.usage.prompt_tokens}, "
                       f"Completion: {response.usage.completion_tokens}, "
                       f"Total: {response.usage.total_tokens}")

        content = response.choices[0].message.content
        result = json.loads(content)

        # Validate response structure
        required_keys = ["before", "after", "why"]
        if not all(k in result for k in required_keys):
            logger.error(f"Missing required keys in AI response. Got: {result.keys()}")
            raise ValueError("Invalid response structure from AI")

        # Validate response content
        for key in required_keys:
            if not isinstance(result[key], str) or not result[key].strip():
                logger.error(f"Invalid {key} field in AI response")
                raise ValueError(f"Invalid {key} field in response")

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
            "category": category,
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Invalid AI response format")
    except Exception as e:
        logger.error(f"Refinement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during refinement")


# --- Enhancement Endpoint ---
@app.post("/enhance")
async def enhance_prompt(data: EnhanceRequest):
    """
    Enhance a refined prompt with additional context.
    
    Args:
        data: EnhanceRequest object with refined prompt and context
        
    Returns:
        Dict with before, after, and why fields
    """
    try:
        logger.info(f"Enhancing prompt of length: {len(data.refined)}")

        system_prompt = """
You are an expert-level Prompt Architect.
Transform a refined prompt into a contextually enhanced version based on audience, outcome, and constraints.
Return valid JSON only with: before, after, why.
"""

        user_prompt = f"""
Refined prompt:
{data.refined}

Audience: {data.audience or "not specified"}
Desired outcome: {data.outcome or "not specified"}
Constraints: {data.constraints or "none"}

Enhance the tone, focus, and clarity to suit this exact situation.
"""

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.6,
            timeout=API_TIMEOUT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        # Log token usage for cost monitoring
        if hasattr(response, 'usage') and response.usage:
            logger.info(f"Token usage - Prompt: {response.usage.prompt_tokens}, "
                       f"Completion: {response.usage.completion_tokens}, "
                       f"Total: {response.usage.total_tokens}")

        content = response.choices[0].message.content
        result = json.loads(content)

        # Validate response structure
        required_keys = ["before", "after", "why"]
        if not all(k in result for k in required_keys):
            logger.error(f"Missing required keys in AI response. Got: {result.keys()}")
            raise ValueError("Invalid response structure from AI")

        # Validate response content
        for key in required_keys:
            if not isinstance(result[key], str) or not result[key].strip():
                logger.error(f"Invalid {key} field in AI response")
                raise ValueError(f"Invalid {key} field in response")

        return {
            "before": safe_text(result["before"]).strip(),
            "after": safe_text(result["after"]).strip(),
            "why": safe_text(result["why"]).strip(),
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Invalid AI response format")
    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during enhancement")


# --- Local Run ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
