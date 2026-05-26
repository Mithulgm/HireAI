# applications/ai.py

import json
from openai import OpenAI
from django.conf import settings


def analyze_resume(resume_text, job):
    """
    Sends resume + job details to OpenAI GPT.
    Returns a dict with match score, skills, summary etc.
    """

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    # OpenAI() creates a client — same concept as Anthropic's client

    prompt = f"""You are an expert technical recruiter AI and ATS system.

JOB DETAILS:
Title: {job.title}
Company: {job.company}
Required Skills: {', '.join(job.skills)}
Description: {job.description}
Requirements: {job.requirements}

CANDIDATE RESUME:
{resume_text}

Analyze this resume against the job. Return ONLY a valid JSON object, no markdown, no extra text:

{{
    "match_score": <integer 0 to 100>,
    "matched_skills": [<skills from required list clearly present in resume>],
    "missing_skills": [<skills from required list NOT found in resume>],
    "summary": "<2-3 sentence honest assessment of fit>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "gaps": ["<gap 1>", "<gap 2>"]
}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        # gpt-4o-mini is fast and cheap — perfect for resume analysis
        # swap to "gpt-4o" if you want higher quality
        messages=[
            {
                "role": "system",
                "content": "You are a JSON-only recruitment AI. Return valid JSON only, no markdown, no extra text."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,
        # Lower temperature = more consistent, focused responses
        # 0.0 = deterministic, 1.0 = creative/random
        # 0.3 is good for structured JSON output
    )

    raw = response.choices[0].message.content
    # response.choices is a list (in case you request multiple responses)
    # [0] gets the first one
    # .message.content gets the text string

    # Strip markdown fences if GPT added them anyway
    clean = raw.replace("```json", "").replace("```", "").strip()

    result = json.loads(clean)
    # Convert JSON string → Python dict

    return result