from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Force reload for logging update
from app.api.endpoints import router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Historical Storytelling API")
# Force reload for syntax fix check

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Reload Trigger: Sentence Alignment Support

from fastapi.staticfiles import StaticFiles
import os

# Create static directory if it doesn't exist
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Historical Storytelling API (Stateless)"}
