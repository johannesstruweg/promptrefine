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

# Define allowed origins BEFORE adding the middleware
allowed_origins = [
    "https://promptodactyl.com",
    "https://www.promptodactyl.com",
    "https://promptodactyl.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
]

if os.getenv("ALLOWED_ORIGINS"):
    allowed_origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

# Add CORS middleware AFTER defining allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Prompt(BaseModel):
    text: str

    @validator('text')
    def validate_text(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError('Prompt must be at least 10 characters')
        if len(v) > 2000:
            raise ValueError('Prompt must be less than 2000 characters')
        return v

@app.get("/")
async def root():
    return {
        "service": "PromptRefine API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@a@app.post("/refine")
async def refine_prompt(data: Prompt):
    try:
        logger.info(f"Refining prompt of length: {len(data.text)}")

        system_prompt = """
You are an expert prompt engineer and AI strategy consultant.
Your job is to transform ordinary or vague user prompts into strategically structured, expert-level prompts that lead to deeper, more actionable LLM outputs.

When refining a prompt:
1. Define a relevant expert role (for example, “Act as a manufacturing efficiency analyst”) to frame the model’s perspective.
2. Add clear objectives and constraints that guide the reasoning process.
3. Structure the output format into explicit sections when appropriate (for example, Analysis, Recommendations, Risks, Implementation Steps).
4. Require quantitative or comparative reasoning where it strengthens decision-making (for example, estimates, benchmarks, risk scores, timelines).
5. Maintain the original intent but enhance clarity, precision, and analytical depth.
6. Keep the result professional, concise, and immediately usable.

Return only valid JSON with exactly these keys:
- before: the original prompt
- after: the improved prompt
- why: a concise explanation (2–3 sentences) describing what structural and analytical improvements were applied.
"""

        # Optional automatic context detection for smarter refinements
        lower_text = data.text.lower()
        if "marketing" in lower_text:
            context_hint = (
                "This prompt appears related to marketing or communication. "
                "Emphasize audience clarity, tone, and measurable outcomes."
            )
        elif "manufacturing" in lower_text:
            context_hint = (
                "This prompt appears related to manufacturing or process optimization. "
                "Emphasize quantitative evaluation, efficiency metrics, and implementation steps."
            )
        elif "strategy" in lower_text or "business" in lower_text:
            context_hint = (
                "This prompt appears related to business or strategic decision-making. "
                "Focus on data-driven recommendations, competitive analysis, and actionable next steps."
            )
        else:
            context_hint = (
                "General improvement: clarify the purpose, structure the response, and strengthen analytical guidance."
            )

        user_prompt = f"""
{context_hint}

Refine and enhance the following prompt according to your system instructions:

{data.text}

Focus on improving depth, structure, and analytical guidance.
Ensure the rewritten prompt defines a role, objective, and structured output format.
Return valid JSON only.
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
