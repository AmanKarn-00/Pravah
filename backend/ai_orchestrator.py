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
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(
                client.models.generate_content,
                contents=prompt,
                **kwargs
            )
            response = future.result(timeout=30)  # Increased for 21 tools
        text = response.text.strip()
        
        print("\n====================")
        if response_schema == EXTRACTION_SCHEMA:
            print("EXTRACTION RESPONSE")
        elif response_schema == UNIFIED_RESOLUTION_SCHEMA:
            print("UNIFIED RESPONSE")
        else:
            print("LLM RESPONSE")
        print(repr(text[:500]))
        print("====================\n")
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        text_clean = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(text_clean)
        except json.JSONDecodeError:
            pass
            
        import re
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
            
        raise ValueError("Could not extract JSON from response")
            
    except concurrent.futures.TimeoutError:
        print(f"API Error in call_llm: Timeout after 30 seconds")
    except Exception as e:
        print(f"API Error in call_llm: {e}")
        try:
            print(f"Failed to parse. Text was: {repr(response.text[:300])}")
        except:
            pass
        
    # Fallbacks
    if response_schema == UNIFIED_RESOLUTION_SCHEMA:
        return {
            "traffic_recommendation": "Implement standard routing protocols (Fallback active).",
            "traffic_reason": "Expert module unreachable. Proceeding with standard safety margins.",
            "traffic_confidence": "50",
            "infra_recommendation": "Maintain structural integrity checks.",
            "infra_reason": "Default infrastructure assessment applied.",
            "infra_confidence": "50",
            "emergency_recommendation": "Keep emergency routes open.",
            "emergency_reason": "Default emergency protocol.",
            "emergency_confidence": "50",
            "planning_recommendation": "Assess economic impact post-event.",
            "planning_reason": "Standard planning fallback.",
            "final_decision": "Proceed with default safety measures.",
            "final_explanation": "System fallback activated.",
            "public_notice_nepali": "सुरक्षा मापदण्ड लागू गरिएको छ। (Fallback)",
            "sms": "PRAVAH: Standard safety active.",
            "scenario_a_action": "Full closure with detour", "scenario_a_travel_impact": "+25 min",
            "scenario_a_safety_risk": "Low", "scenario_a_detour_route": "Road A via Sanga Pass",
            "scenario_a_rationale": "Eliminates all risk by closing the road entirely and routing traffic through the safest corridor.",
            "scenario_b_action": "Partial closure (one lane)", "scenario_b_travel_impact": "+10 min",
            "scenario_b_safety_risk": "Medium", "scenario_b_detour_route": "Shared lane on Road B",
            "scenario_b_rationale": "Balances throughput with safety by keeping one lane open with weight restrictions.",
            "scenario_c_action": "Keep open with restrictions", "scenario_c_travel_impact": "+0 min",
            "scenario_c_safety_risk": "High", "scenario_c_detour_route": "No detour needed",
            "scenario_c_rationale": "Maintains normal flow but exposes road users to structural and weather risks.",
        }
    elif response_schema == EXTRACTION_SCHEMA:
         return {"event": "Incident", "road": "Unknown", "time": "Unknown", "duration": "Unknown"}
    return {}

SYSTEM_INSTRUCTION = """You are PRAVAH, a multi-agent AI infrastructure decision orchestrator for Nepal's road network.

You have access to 21 specialized tools across 6 domains:
- 🚦 Traffic: get_live_traffic_status, predict_queue_length, simulate_route_closure, find_best_detour
- 🌉 Infrastructure: get_bridge_health, predict_bridge_failure, get_bridge_history, calculate_remaining_capacity
- 🌧️ Weather: get_weather_forecast, predict_landslide_probability, check_river_level
- 🚑 Emergency: get_nearest_hospital, estimate_ambulance_delay, get_available_emergency_units
- 🧠 Memory: search_similar_incidents, retrieve_post_incident_report
- 📊 Planning: estimate_economic_loss, estimate_carbon_emissions
- 🔮 Prediction: forecast_traffic, predict_recovery_time

IMPORTANT RULES:
1. Before calling analysis tools, check if critical details (road/bridge name, time, duration) are missing. If ANY are missing, call ask_clarification FIRST.
2. Call tools from MULTIPLE domains to build comprehensive context. A good analysis uses at least 3-4 different tools.
3. For road closures: always call simulate_route_closure, get_weather_forecast, search_similar_incidents, and estimate_ambulance_delay.
4. For bridge issues: always call get_bridge_health, predict_bridge_failure, and estimate_ambulance_delay.
5. Never invent data — always use tools to gather real information.
6. You may call multiple tools in parallel in a single turn."""

def orchestrate_decision_stream(messages: List[Dict[str, str]]) -> Generator[str, None, None]:
    """Generates a stream of orchestration events."""
    
    base_event = next((msg["content"] for msg in messages if msg["role"] == "user"), "")
    full_context = "\n".join(f"{msg['role'].capitalize()}: {msg['content']}" for msg in messages)
    
    yield 'data: ' + json.dumps({"type": "log", "message": f"Received conversation with {len(messages)} turns."}) + "\n\n"
    
    # 1. Extract Entities
    yield 'data: ' + json.dumps({"type": "log", "message": "Extracting entities..."}) + "\n\n"
    
    start_time = time.time()
    extracted = call_llm(
        prompt=f"Extract the event details from the following conversation:\n{full_context}\n\nIf not present, leave blank.",
        system_instruction="You are a data extraction assistant.",
        response_schema=EXTRACTION_SCHEMA
    )
    dur = int((time.time() - start_time) * 1000)
    print("1 Extraction complete")
    yield 'data: ' + json.dumps({"type": "step_start", "name": "Extract Entities"}) + "\n\n"
    yield 'data: ' + json.dumps({"type": "step_end", "name": "Extract Entities", "status": "success", "duration": f"{dur} ms", "result": extracted}) + "\n\n"
    
    # 2. Native Function Calling with all 21 tools
    yield 'data: ' + json.dumps({"type": "log", "message": "Invoking multi-agent tool orchestration..."}) + "\n\n"
    
    gemini_history = []
    if len(messages) > 1:
        for msg in messages[:-1]:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_history.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])]
            ))
            
    print("2 Creating chat")
    try:
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
                system_instruction=SYSTEM_INSTRUCTION
            ),
            history=gemini_history,
        )
        print("3 Chat created")
    except Exception as e:
        print("CHAT CREATE ERROR:", repr(e))
        raise
    
    tool_results_dict = {}
    
    latest_msg = messages[-1]["content"] if messages else ""
    missing_fields = [k for k, v in extracted.items() if not v or v in ('Unknown', '')]
    missing_note = ""
    if missing_fields:
        missing_note = f"\nWARNING: The following critical fields are missing or empty: {', '.join(missing_fields)}. You MUST call ask_clarification to gather these before proceeding with analysis tools."
    
    prompt = f"Analyze this event and gather comprehensive context using tools from multiple domains. New User Input: '{latest_msg}'.\nExtracted details so far: {json.dumps(extracted)}{missing_note}"
    
    MAX_TURNS = 6
    for turn in range(MAX_TURNS):
        print(f"TURN {turn}")
        try:
            response = chat.send_message(prompt)

            try:
                response_text = response.text or ""
            except Exception:
                response_text = ""

            func_calls = []
            try:
                candidate = response.candidates[0]
                for i, part in enumerate(candidate.content.parts):
                    if hasattr(part, "function_call") and part.function_call:
                        func_calls.append(part.function_call)
                print(f"  → {len(func_calls)} function calls extracted")
            except Exception as e:
                print("Error extracting function calls:", repr(e))

        except Exception as e:
            print("SEND MESSAGE ERROR:", repr(e))
            yield 'data: ' + json.dumps({"type": "log", "message": f"API Error in tool loop: {e}. Falling back."}) + "\n\n"
            break

        if not func_calls:
            if response_text:
                yield 'data: ' + json.dumps({"type": "log", "message": f"Gemini concluded: {response_text[:200]}"}) + "\n\n"
            else:
                yield 'data: ' + json.dumps({"type": "log", "message": "Tool gathering phase complete."}) + "\n\n"
            break

        function_responses = []
        for fc in func_calls:
            tool_name = fc.name
            args = fc.args
            yield 'data: ' + json.dumps({"type": "log", "message": f"Calling tool: {tool_name}({json.dumps(args, default=str)[:100]})"}) + "\n\n"
            yield 'data: ' + json.dumps({"type": "step_start", "name": tool_name}) + "\n\n"
            
            func = next((t for t in pravah_tools if t.__name__ == tool_name), None)
            if func:
                try:
                    t_start = time.time()
                    result = func(**args)
                    t_dur = int((time.time() - t_start) * 1000)
                    tool_results_dict[tool_name] = result
                    yield 'data: ' + json.dumps({"type": "step_end", "name": tool_name, "status": "success", "duration": f"{t_dur} ms", "result": result}, default=str) + "\n\n"
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
        
        prompt = function_responses
                
    # 3. Dynamic Clarification
    if "ask_clarification" in tool_results_dict:
        clarification = {
            "question": tool_results_dict["ask_clarification"].get("question", "Could you provide more details?"),
            "options": [],
            "confidence": 40
        }
        yield 'data: ' + json.dumps({"type": "clarification", "data": clarification}) + "\n\n"
        return
        
    clarification = None
    yield 'data: ' + json.dumps({"type": "log", "message": "Multi-agent context complete. Running baseline comparison..."}) + "\n\n"
    
    # ── 3b. Automatic Baseline vs Optimized Comparison ──
    from tools import compute_naive_baseline, compute_optimized_route
    
    closed_road_name = extracted.get("road", "")
    # Also try to get it from simulation results
    sim_res_early = tool_results_dict.get("simulate_route_closure", {})
    if not closed_road_name and sim_res_early:
        closed_road_name = sim_res_early.get("closed_road", "Road B (Jagati)")
    if not closed_road_name:
        closed_road_name = "Road B (Jagati)"
    
    baseline_result = None
    optimized_result = None
    
    try:
        yield 'data: ' + json.dumps({"type": "step_start", "name": "compute_naive_baseline"}) + "\n\n"
        b_start = time.time()
        baseline_result = compute_naive_baseline(closed_road=closed_road_name)
        b_dur = int((time.time() - b_start) * 1000)
        tool_results_dict["compute_naive_baseline"] = baseline_result
        yield 'data: ' + json.dumps({"type": "step_end", "name": "compute_naive_baseline", "status": "success", "duration": f"{b_dur} ms", "result": baseline_result}, default=str) + "\n\n"
    except Exception as e:
        print(f"Baseline error: {e}")
        yield 'data: ' + json.dumps({"type": "step_end", "name": "compute_naive_baseline", "status": "error", "duration": "0 ms", "result": str(e)}) + "\n\n"
    
    try:
        yield 'data: ' + json.dumps({"type": "step_start", "name": "compute_optimized_route"}) + "\n\n"
        o_start = time.time()
        optimized_result = compute_optimized_route(closed_road=closed_road_name)
        o_dur = int((time.time() - o_start) * 1000)
        tool_results_dict["compute_optimized_route"] = optimized_result
        yield 'data: ' + json.dumps({"type": "step_end", "name": "compute_optimized_route", "status": "success", "duration": f"{o_dur} ms", "result": optimized_result}, default=str) + "\n\n"
    except Exception as e:
        print(f"Optimized error: {e}")
        yield 'data: ' + json.dumps({"type": "step_end", "name": "compute_optimized_route", "status": "error", "duration": "0 ms", "result": str(e)}) + "\n\n"
    
    # Build comparison object
    comparison = None
    if baseline_result and optimized_result and "error" not in baseline_result and "error" not in optimized_result:
        baseline_score = baseline_result.get("risk_adjusted_score", 999)
        optimized_score = optimized_result.get("risk_adjusted_score", 999)
        improvement = round((baseline_score - optimized_score) / baseline_score * 100, 1) if baseline_score > 0 else 0
        
        comparison = {
            "baseline": baseline_result,
            "optimized": optimized_result,
            "improvement_pct": improvement,
            "winner": "optimized" if optimized_score < baseline_score else "baseline",
            "metric": "Risk-Adjusted Decision Cost (lower = better)",
            "metric_formula": "Score = TravelTime×1 + SafetyRisk×50 + AmbulanceDelay×5 + EconCost×0.001"
        }
    
    yield 'data: ' + json.dumps({"type": "log", "message": "Running expert deliberation + scenario analysis..."}) + "\n\n"
    
    context = f"Extracted: {json.dumps(extracted)}\nTool Results: {json.dumps(tool_results_dict, default=str)}"
    
    # 4. Expert Resolution + Scenario Generation
    yield 'data: ' + json.dumps({"type": "step_start", "name": "Expert Resolution"}) + "\n\n"
    e_start = time.time()
    
    try:
        resolution = call_llm(
            prompt=f"""Given the Context:
{context}

You must act as FOUR expert agents and then generate THREE decision scenarios:

1. TRAFFIC OPERATIONS EXPERT: Analyze congestion, detour quality, queue predictions, and recovery time.
2. INFRASTRUCTURE EXPERT: Analyze bridge health, failure probability, remaining capacity.
3. EMERGENCY RESPONSE EXPERT: Analyze ambulance delays, hospital access, available emergency units.
4. PLANNING EXPERT: Analyze economic loss, carbon emissions, long-term impact.

Then generate THREE actionable scenarios for the decision maker:
- Scenario A (Safest): Maximum safety, e.g. full closure with detour.
- Scenario B (Balanced): Compromise between safety and disruption.
- Scenario C (Least Disruptive): Minimal disruption, e.g. keep open with restrictions.

For each scenario provide:
  - action: What to do
  - travel_impact: Qualitative description, e.g. "Significant delay" or "Moderate increase"
  - safety_risk: Low / Medium / High
  - detour_route: The suggested route, e.g. "Road A via Sanga Pass"
  - rationale: 1-2 sentences explaining why this option exists based on tool data

Finally, provide a recommended decision, Nepali public notice, and SMS alert.""",
            system_instruction="You are PRAVAH's final decision engine. Provide structured multi-expert analysis with scenario comparison.",
            response_schema=UNIFIED_RESOLUTION_SCHEMA
        )
        e_dur = int((time.time() - e_start) * 1000)
        yield 'data: ' + json.dumps({"type": "step_end", "name": "Expert Resolution", "status": "success", "duration": f"{e_dur} ms"}) + "\n\n"
    except Exception as e:
        e_dur = int((time.time() - e_start) * 1000)
        print(f"Expert Resolution error: {e}")
        yield 'data: ' + json.dumps({"type": "step_end", "name": "Expert Resolution", "status": "error", "duration": f"{e_dur} ms"}) + "\n\n"
        resolution = {
            "traffic_recommendation": "Analysis unavailable (fallback).", "traffic_reason": "Error.", "traffic_confidence": "50",
            "infra_recommendation": "Maintain safety protocols.", "infra_reason": "Fallback.", "infra_confidence": "50",
            "emergency_recommendation": "Keep emergency routes open.", "emergency_reason": "Fallback.", "emergency_confidence": "50",
            "planning_recommendation": "Assess impact post-event.", "planning_reason": "Fallback.",
            "final_decision": "Proceed with caution.", "final_explanation": "Fallback activated.",
            "public_notice_nepali": "सुरक्षा मापदण्ड लागू गरिएको छ।", "sms": "PRAVAH: Safety measures active.",
            "scenario_a_action": "Full closure", "scenario_a_travel_impact": "Significant delay", "scenario_a_safety_risk": "Low",
            "scenario_a_detour_route": "Road A via Sanga Pass", "scenario_a_rationale": "Full closure eliminates risk.",
            "scenario_b_action": "Partial closure", "scenario_b_travel_impact": "Moderate increase", "scenario_b_safety_risk": "Medium",
            "scenario_b_detour_route": "Shared lane on Road B", "scenario_b_rationale": "Balances safety and throughput.",
            "scenario_c_action": "Keep open", "scenario_c_travel_impact": "Minimal change", "scenario_c_safety_risk": "High",
            "scenario_c_detour_route": "No detour needed", "scenario_c_rationale": "Maintains flow but increases risk.",
        }
    
    # Build evidence from tool results
    sim_res = tool_results_dict.get("simulate_route_closure", tool_results_dict.get("simulate_network_cascade", {}))
    weather_res = tool_results_dict.get("get_weather_forecast", tool_results_dict.get("get_monsoon_landslide_risk", {}))
    bridge_res = tool_results_dict.get("get_bridge_health", tool_results_dict.get("check_bridge_tonnage", {}))
    landslide_res = tool_results_dict.get("predict_landslide_probability", {})
    river_res = tool_results_dict.get("check_river_level", {})
    ambulance_res = tool_results_dict.get("estimate_ambulance_delay", {})
    economic_res = tool_results_dict.get("estimate_economic_loss", {})
    traffic_res = tool_results_dict.get("get_live_traffic_status", {})
    
    evidence = {
        "bridge": {
            "max": f"{bridge_res.get('load_limit_tonnes', bridge_res.get('max_load', 0))} t",
            "status": f"{bridge_res.get('condition', bridge_res.get('truck_weight', 0))}",
            "result": bridge_res.get('condition', bridge_res.get('status', 'N/A'))
        } if bridge_res else None,
        "weather": {
            "condition": weather_res.get("road_condition", "Rain" if weather_res.get("rainfall_today_mm", weather_res.get("rain_mm", 0)) > 0 else "Clear"),
            "rain": f"{weather_res.get('rainfall_today_mm', weather_res.get('rain_mm', 0))} mm",
            "risk": landslide_res.get("risk_level", weather_res.get("risk_level", "Unknown"))
        } if weather_res else None,
        "simulation": {
            "worst_road": sim_res.get("closed_road", sim_res.get("closed_road_simulated", "None")),
            "increase": sim_res.get("increase_pct", "0%")
        } if sim_res else None,
        "emergency": {
            "ambulance_delay": f"{ambulance_res.get('delay_increase_min', 0)} min",
            "nearest_hospital": ambulance_res.get("nearest_hospital", "Unknown"),
            "golden_hour_risk": ambulance_res.get("golden_hour_at_risk", False)
        } if ambulance_res else None,
        "economic": {
            "total_loss": f"NPR {economic_res.get('total_economic_loss_npr', 0):,}",
            "affected_vehicles": economic_res.get("affected_vehicles", 0)
        } if economic_res else None,
        "traffic": {
            "density": traffic_res.get("traffic_density", "Unknown"),
            "speed": f"{traffic_res.get('average_speed_kmh', 0)} km/h",
            "queue": f"{traffic_res.get('queue_length_m', 0)} m"
        } if traffic_res else None,
        "river": {
            "level": river_res.get("level", "Unknown"),
            "flood_risk": river_res.get("flood_risk", "Unknown"),
            "discharge": f"{river_res.get('current_discharge_m3s', 0)} m³/s"
        } if river_res else None
    }
    
    map_cascade = sim_res.get("cascade_visualization", [])
    memory_results = tool_results_dict.get("search_similar_incidents", tool_results_dict.get("query_decision_memory", []))
    
    # Build scenarios from resolution
    scenarios = [
        {
            "label": "Scenario A",
            "tag": "Safest",
            "action": resolution.get("scenario_a_action", "Full closure"),
            "travel_impact": resolution.get("scenario_a_travel_impact", "Significant delay"),
            "safety_risk": resolution.get("scenario_a_safety_risk", "Low"),
            "detour_route": resolution.get("scenario_a_detour_route", "Road A via Sanga Pass"),
            "rationale": resolution.get("scenario_a_rationale", ""),
        },
        {
            "label": "Scenario B",
            "tag": "Balanced",
            "action": resolution.get("scenario_b_action", "Partial closure"),
            "travel_impact": resolution.get("scenario_b_travel_impact", "Moderate increase"),
            "safety_risk": resolution.get("scenario_b_safety_risk", "Medium"),
            "detour_route": resolution.get("scenario_b_detour_route", "Shared lane on Road B"),
            "rationale": resolution.get("scenario_b_rationale", ""),
        },
        {
            "label": "Scenario C",
            "tag": "Least Disruptive",
            "action": resolution.get("scenario_c_action", "Keep open"),
            "travel_impact": resolution.get("scenario_c_travel_impact", "Minimal change"),
            "safety_risk": resolution.get("scenario_c_safety_risk", "High"),
            "detour_route": resolution.get("scenario_c_detour_route", "No detour needed"),
            "rationale": resolution.get("scenario_c_rationale", ""),
        },
    ]
    
    final_payload = {
        "extracted": extracted,
        "clarification": clarification,
        "evidence": evidence,
        "map_cascade": map_cascade,
        "memory": memory_results,
        "context": tool_results_dict,
        "scenarios": scenarios,
        "comparison": comparison,
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
            },
            "emergency": {
                "recommendation": resolution.get("emergency_recommendation", ""),
                "reason": resolution.get("emergency_reason", ""),
                "confidence": resolution.get("emergency_confidence", "")
            },
            "planning": {
                "recommendation": resolution.get("planning_recommendation", ""),
                "reason": resolution.get("planning_reason", ""),
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

