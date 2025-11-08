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

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://vercel.com/johannes-projects-e398a402/promptodactyl/2Cjmc9Y61NVb1zpcKqYiAsdUBoVt"
]

if os.getenv("ALLOWED_ORIGINS"):
    allowed_origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
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

@app.post("/refine")
async def refine_prompt(data: Prompt):
    try:
        logger.info(f"Refining prompt of length: {len(data.text)}")
        
        system_prompt = """You are an expert prompt engineer. 
Analyze the user's prompt and improve it for clarity, precision, and effectiveness.
Return ONLY valid JSON with exactly these keys:
- before: the original prompt (string)
- after: the improved prompt (string)
- why: a brief explanation of improvements (string, 1-2 sentences)"""

        user_prompt = f"""Improve this prompt:

{data.text}

Return valid JSON only."""

        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        content = response.choices[0].message.content
        result = json.loads(content)
        
        if not all(key in result for key in ["before", "after", "why"]):
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
