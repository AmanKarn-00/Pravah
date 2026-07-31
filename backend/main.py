from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ai_orchestrator import orchestrate_decision_stream
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PRAVAH - AI Infrastructure Decision Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List, Dict

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(orchestrate_decision_stream([msg.model_dump() for msg in request.messages]), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
