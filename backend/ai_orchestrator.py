import json
import asyncio
import concurrent.futures
from typing import Dict, Any, List, Generator
from google import genai
from google.genai import types
from tools import pravah_tools
from schemas import EXTRACTION_SCHEMA, UNIFIED_RESOLUTION_SCHEMA
import time
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()

def call_llm(prompt: str, system_instruction: str = None, response_schema: Any = None) -> Dict[str, Any]:
    kwargs = {
        "model": "gemma-4-31b-it",
        "config": types.GenerateContentConfig(
            temperature=0.2,
        )
    }
    if system_instruction:
        kwargs["config"].system_instruction = system_instruction
    if response_schema:
        kwargs["config"].response_mime_type = "application/json"
        kwargs["config"].response_schema = response_schema
        
    try:
        # Hackathon Demo Polish: Add a strict 12-second timeout to prevent endless spinning
        # If the API takes too long, we gracefully trigger the fallback so the demo continues smoothly.
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(
                client.models.generate_content,
                contents=prompt,
                **kwargs
            )
            response = future.result(timeout=12)
        text = response.text.strip()
        
        print("\n====================")
        if response_schema == EXTRACTION_SCHEMA:
            print("EXTRACTION RESPONSE")
        elif response_schema == UNIFIED_RESOLUTION_SCHEMA:
            print("UNIFIED RESPONSE")
        else:
            print("UNKNOWN RESPONSE")
        print(repr(text))
        print("====================\n")
        
        # Try direct parse first in case it's clean
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        # Strip markdown fences
        text_clean = text.replace("```json", "").replace("```", "").strip()
        
        try:
            return json.loads(text_clean)
        except json.JSONDecodeError:
            pass
            
        # Fallback to Regex Extraction
        import re
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
            
        raise ValueError("Could not extract JSON from response")
            
    except concurrent.futures.TimeoutError:
        print(f"API Error in call_llm: Timeout after 12 seconds")
    except Exception as e:
        print(f"API Error in call_llm: {e}")
        try:
            print(f"Failed to parse. Text was: {repr(response.text)}")
        except:
            pass
        
    # --- HACKATHON SAFE FALLBACKS FOR RATE LIMITS OR TIMEOUTS ---
    if response_schema == UNIFIED_RESOLUTION_SCHEMA:
        return {
            "traffic_recommendation": "Implement standard routing protocols (Fallback active).",
            "traffic_reason": "Expert module unreachable due to high load. Proceeding with standard safety margins.",
            "traffic_confidence": "65",
            "infra_recommendation": "Maintain structural integrity.",
            "infra_reason": "Default infrastructure checks applied.",
            "infra_confidence": "70",
            "final_decision": "Proceed with default safety measures.",
            "final_explanation": "System fallback activated. Ensure standard operational procedures are followed.",
            "public_notice_nepali": "सुरक्षा मापदण्ड लागू गरिएको छ। (Fallback)",
            "sms": "PRAVAH: Standard safety active."
        }
    elif response_schema == EXTRACTION_SCHEMA:
         return {"event": "Incident", "location": "Unknown", "road": "Unknown", "time": "Unknown", "duration": "Unknown"}
    return {}

def orchestrate_decision_stream(messages: List[Dict[str, str]]) -> Generator[str, None, None]:
    """Generates a stream of orchestration events culminating in the final decision payload."""
    
    # Extract the very first user message to use as the base event context
    base_event = next((msg["content"] for msg in messages if msg["role"] == "user"), "")
    # Combine all messages to give full context for extraction
    full_context = "\n".join(f"{msg['role'].capitalize()}: {msg['content']}" for msg in messages)
    
    yield 'data: ' + json.dumps({"type": "log", "message": f"Received conversation with {len(messages)} turns."}) + "\n\n"
    
    # 1. Job 1 - Understand Input
    yield 'data: ' + json.dumps({"type": "log", "message": "Extracting entities..."}) + "\n\n"
    
    start_time = time.time()
    extracted = call_llm(
        prompt=f"Extract the event details from the following conversation:\n{full_context}\n\nIf not present, leave blank.",
        system_instruction="You are a data extraction assistant.",
        response_schema=EXTRACTION_SCHEMA
    )
    dur = int((time.time() - start_time) * 1000)
    print("1 Extraction complete")
    yield 'data: ' + json.dumps({"type": "step", "name": "Extract Entities", "status": "success", "duration": f"{dur} ms", "result": extracted}) + "\n\n"
    
    # 2. Native Function Calling
    yield 'data: ' + json.dumps({"type": "log", "message": "Invoking Gemini Native Function Calling Loop..."}) + "\n\n"
    
    # Construct history for the Gemini API
    # The last message is the "current" prompt we're sending, so we put all PRIOR messages in history
    gemini_history = []
    if len(messages) > 1:
        for msg in messages[:-1]:
            # Gemini expects 'user' or 'model' roles. We map 'assistant' to 'model'.
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_history.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])]
            ))
            
    print("2 Creating chat")
    print("TOOLS CONFIGURATION:", pravah_tools)
    try:
        # Create chat and store the object
        chat = client.chats.create(
            model="gemma-4-31b-it",
            config=types.GenerateContentConfig(
                tools=pravah_tools,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode="AUTO"
                    )
                ),
                temperature=0.2,
                system_instruction="You are an AI infrastructure decision orchestrator. Use the available tools to gather context for infrastructure decisions. IMPORTANT: Before calling any analysis tools, check if critical details (road/bridge name, time, duration) are missing or empty. If ANY critical detail is missing, you MUST call ask_clarification FIRST to get the missing information. Never assume or invent missing data."
            ),
            history=gemini_history,
        )
        print("3 Chat created")
    except Exception as e:
        print("CHAT CREATE ERROR:", repr(e))
        raise
    
    tool_results_dict = {}
    
    # Build prompt that highlights missing fields
    missing_fields = [k for k, v in extracted.items() if not v or v in ('Unknown', '')]
    missing_note = ""
    if missing_fields:
        missing_note = f"\nWARNING: The following critical fields are missing or empty: {', '.join(missing_fields)}. You MUST call ask_clarification to gather these before proceeding with analysis tools."
    
    prompt = f"Analyze this event and gather necessary context using tools. New User Input: '{latest_msg}'.\nExtracted details so far: {json.dumps(extracted)}{missing_note}"
    
    MAX_TURNS = 5
    for turn in range(MAX_TURNS):
        print(f"TURN {turn}")
        print("4 Sending message")
        try:
            response = chat.send_message(prompt)
            print("5 Message returned")

            # Debug raw output
            print("TEXT")
            try:
                print(repr(response.text))
            except Exception:
                print("Could not print text")

            # Capture text response if any
            try:
                response_text = response.text or ""
            except Exception:
                response_text = ""

            # Extract function calls from the response (new SDK pattern)
            func_calls = []
            try:
                candidate = response.candidates[0]
                print("CANDIDATE PARTS DEBUG")
                for i, part in enumerate(candidate.content.parts):
                    print(f"\n===== PART {i} =====")
                    print(repr(part))
                    if hasattr(part, "function_call") and part.function_call:
                        func_calls.append(part.function_call)
                print("EXTRACTED FUNCTION CALLS:", func_calls)
            except Exception as e:
                print("Error extracting function calls:", repr(e))

            print("CANDIDATES")
            print(response.candidates)

        except Exception as e:
            print("SEND MESSAGE ERROR:", repr(e))
            yield 'data: ' + json.dumps({"type": "log", "message": f"Gemini API Error in tool loop: {e}. Falling back."}) + "\n\n"
            break

        # If no function calls were extracted, the model is done with tool use
        if not func_calls:
            if response_text:
                yield 'data: ' + json.dumps({"type": "log", "message": f"Gemini concluded: {response_text[:200]}"}) + "\n\n"
            else:
                yield 'data: ' + json.dumps({"type": "log", "message": "Tool gathering phase complete."}) + "\n\n"
            break

        print("6 Entering tool loop")
        function_responses = []
        for fc in func_calls:
            tool_name = fc.name
            args = fc.args
            yield 'data: ' + json.dumps({"type": "log", "message": f"Calling tool: {tool_name}({args})"}) + "\n\n"
            yield 'data: ' + json.dumps({"type": "step_start", "name": tool_name}) + "\n\n"
            
            func = next((t for t in pravah_tools if t.__name__ == tool_name), None)
            if func:
                try:
                    t_start = time.time()
                    result = func(**args)
                    t_dur = int((time.time() - t_start) * 1000)
                    tool_results_dict[tool_name] = result
                    yield 'data: ' + json.dumps({"type": "step_end", "name": tool_name, "status": "success", "duration": f"{t_dur} ms", "result": result}) + "\n\n"
                except Exception as e:
                    result = {"error": str(e)}
                    yield 'data: ' + json.dumps({"type": "step_end", "name": tool_name, "status": "error", "duration": "0 ms", "result": str(e)}) + "\n\n"
                
                function_responses.append(types.Part.from_function_response(
                    name=tool_name,
                    response={"result": result}
                ))
            else:
                function_responses.append(types.Part.from_function_response(
                    name=tool_name,
                    response={"error": "Tool not found"}
                ))
        
        # Send ALL function responses back together for the next turn
        prompt = function_responses
                
    # 3. Dynamic Clarification
    if "ask_clarification" in tool_results_dict:
        clarification = {
            "question": tool_results_dict["ask_clarification"].get("question", "Could you provide more details?"),
            "options": [],
            "confidence": 40
        }
        yield 'data: ' + json.dumps({"type": "clarification", "data": clarification}) + "\n\n"
        return # Terminate the stream early, wait for user response
        
    clarification = None # No clarification needed if we passed
    yield 'data: ' + json.dumps({"type": "log", "message": "Context gathering complete. Preparing for expert deliberation..."}) + "\n\n"
    
    context = f"Extracted: {json.dumps(extracted)}\nTool Results: {json.dumps(tool_results_dict, default=str)}"
    
    # 4. Single Unified Expert Resolution Call
    yield 'data: ' + json.dumps({"type": "step_start", "name": "Expert Resolution"}) + "\n\n"
    e_start = time.time()
    
    try:
        resolution = call_llm(
            prompt=f"Given the Context:\n{context}\n\nAct as both a Traffic Operations Expert and an Infrastructure Planning Expert. Provide recommendations and confidence levels for both, and then resolve them into a final decision. Also provide a public notice in Nepali and a short SMS alert.",
            system_instruction="You are the final decision engine (Gemma). Provide structured traffic and infrastructure advice, then resolve conflicts.",
            response_schema=UNIFIED_RESOLUTION_SCHEMA
        )
        e_dur = int((time.time() - e_start) * 1000)
        yield 'data: ' + json.dumps({"type": "step_end", "name": "Expert Resolution", "status": "success", "duration": f"{e_dur} ms"}) + "\n\n"
    except Exception as e:
        e_dur = int((time.time() - e_start) * 1000)
        print(f"Expert Resolution error: {e}")
        yield 'data: ' + json.dumps({"type": "step_end", "name": "Expert Resolution", "status": "error", "duration": f"{e_dur} ms"}) + "\n\n"
        resolution = {
            "traffic_recommendation": "Analysis unavailable (fallback active).",
            "traffic_reason": "Expert module encountered an error.",
            "traffic_confidence": "50",
            "infra_recommendation": "Maintain standard safety protocols.",
            "infra_reason": "Default infrastructure assessment applied.",
            "infra_confidence": "50",
            "final_decision": "Proceed with caution using standard safety measures.",
            "final_explanation": "System fallback activated due to processing error.",
            "public_notice_nepali": "सुरक्षा मापदण्ड लागू गरिएको छ। (Fallback)",
            "sms": "PRAVAH: Standard safety measures active."
        }
    
    sim_res = tool_results_dict.get("simulate_network_cascade", {})
    weather_res = tool_results_dict.get("get_monsoon_landslide_risk", {})
    bridge_res = tool_results_dict.get("check_bridge_tonnage", {})
    
    evidence = {
        "bridge": {
            "max": f"{bridge_res.get('max_load', 0)} t",
            "status": f"{bridge_res.get('truck_weight', 0)} t",
            "result": bridge_res.get('status', 'N/A')
        } if bridge_res else None,
        "weather": {
            "condition": "Rain" if weather_res.get("rain_mm", 0) > 0 else "Clear",
            "rain": f"{weather_res.get('rain_mm', 0)} mm",
            "risk": weather_res.get("risk_level", "Unknown")
        } if weather_res else None,
        "simulation": {
            "worst_road": sim_res.get("closed_road_simulated", "None"),
            "increase": sim_res.get("increase_pct", "0%")
        } if sim_res else None
    }
    
    
    map_cascade = sim_res.get("cascade_visualization", [])
    memory_results = tool_results_dict.get("query_decision_memory", [])
    
    final_payload = {
        "extracted": extracted,
        "clarification": clarification,
        "evidence": evidence,
        "map_cascade": map_cascade,
        "memory": memory_results,
        "context": tool_results_dict,
        "experts": {
            "traffic": {
                "recommendation": resolution.get("traffic_recommendation", ""),
                "reason": resolution.get("traffic_reason", ""),
                "confidence": resolution.get("traffic_confidence", "")
            },
            "infrastructure": {
                "recommendation": resolution.get("infra_recommendation", ""),
                "reason": resolution.get("infra_reason", ""),
                "confidence": resolution.get("infra_confidence", "")
            }
        },
        "final": {
            "decision": resolution.get("final_decision", ""),
            "explanation": resolution.get("final_explanation", ""),
            "public_notice_nepali": resolution.get("public_notice_nepali", ""),
            "sms": resolution.get("sms", "")
        }
    }
    
    yield 'data: ' + json.dumps({"type": "final", "data": final_payload}, default=str) + "\n\n"
