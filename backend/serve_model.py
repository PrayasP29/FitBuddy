import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

os.environ["TRANSFORMERS_NO_TF"] = "1"

BASE_MODEL = "microsoft/phi-2" 
ADAPTER_PATH = r"C:\Users\LOQ\fitness_project\phi-fitness-final"

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    device_map="auto",
    torch_dtype="auto"
)
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserProfile(BaseModel):
    height: int
    weight: int
    free_time: int
    fitness_level: str
    goal: str

@app.post("/api/routine")
async def generate_routine(user: UserProfile):
    prompt = (
        f"Height: {user.height} cm, Weight: {user.weight} kg, "
        f"Free time: {user.free_time} min, Fitness level: {user.fitness_level}, "
        f"Goal: {user.goal}. Create a structured workout routine."
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=256,
        temperature=0.7,
        top_p=0.9,
    )
    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"routine": text}
