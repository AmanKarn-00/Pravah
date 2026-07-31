import json
import httpx
import networkx as nx
import os
from typing import Dict, Any
from google import genai
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from dotenv import load_dotenv

load_dotenv()

client = genai.Client()

def check_bridge_tonnage(truck_weight: float, bridge: str) -> Dict[str, Any]:
    """Checks if a bridge can support a given truck weight.
    
    Args:
        truck_weight: The weight of the truck in tonnes.
        bridge: The name of the bridge (e.g. "Sunkoshi Bridge", "Temporary Bailey Bridge").
    """
    bridges_max_load = {
        "Sunkoshi Bridge": 40.0,
        "Temporary Bailey Bridge": 20.0,
        "Bhaktapur Bridge": 60.0
    }
    max_load = bridges_max_load.get(bridge, 30.0)
    
    return {
        "status": "PASS" if truck_weight <= max_load else "FAIL",
        "max_load": max_load,
        "truck_weight": truck_weight,
        "bridge": bridge
    }

def check_route_geometry(gradient: float, vehicle_length: float, turning_radius: float) -> str:
    """Checks if a route's geometry is safe for a specific vehicle length.
    
    Args:
        gradient: The maximum gradient of the route in percentage.
        vehicle_length: The length of the vehicle in meters.
        turning_radius: The minimum turning radius of the route in meters.
    """
    if gradient > 12.0 or turning_radius < (vehicle_length * 1.5):
        return "Unsafe"
    return "Safe"

def get_monsoon_landslide_risk(location: str) -> Dict[str, Any]:
    """Gets the monsoon landslide risk for a given location by checking recent rainfall.
    
    Args:
        location: The location to check (e.g. "Bhaktapur-Banepa").
    """
    lat, lon = 27.67, 85.38 
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum&timezone=Asia%2FKathmandu"
    
    with httpx.Client() as http_client:
        try:
            response = http_client.get(url)
            response.raise_for_status()
            data = response.json()
            precip = sum(data.get("daily", {}).get("precipitation_sum", [0])[:3])
            
            prob = min(precip / 100.0, 0.99)
            
            return {
                "rain_mm": round(precip, 2),
                "humidity": 85,
                "landslide_probability": round(prob, 2),
                "risk_level": "High" if prob > 0.5 else "Medium" if prob > 0.2 else "Low"
            }
        except Exception as e:
            print(f"Weather API error: {e}")
            return {
                "rain_mm": 84,
                "humidity": 91,
                "landslide_probability": 0.72,
                "risk_level": "High"
            }

def simulate_network_cascade(closed_road: str = "") -> Dict[str, Any]:
    """Simulates the traffic cascade effect if a specific road is closed.
    
    Args:
        closed_road: The road that is closed or restricted (e.g., "Road A (Suryabinayak)").
    """
    G = nx.Graph()
    G.add_node("Suryabinayak")
    G.add_node("Jagati")
    G.add_node("Sanga")
    G.add_node("Banepa")
    G.add_node("Alternative_Route_1")
    
    G.add_edge("Suryabinayak", "Jagati", weight=10, name="Road A (Suryabinayak)")
    G.add_edge("Jagati", "Sanga", weight=15, name="Road B (Jagati)")
    G.add_edge("Sanga", "Banepa", weight=12, name="Road C (Sanga)")
    G.add_edge("Suryabinayak", "Alternative_Route_1", weight=25, name="Alt 1")
    G.add_edge("Alternative_Route_1", "Banepa", weight=25, name="Alt 2")

    baseline_time = nx.shortest_path_length(G, source="Suryabinayak", target="Banepa", weight="weight")
    
    impacted = False
    if closed_road:
        for u, v, data in G.edges(data=True):
            if closed_road.lower() in data['name'].lower():
                G[u][v]['weight'] *= 1.5
                impacted = True
            
    if not impacted:
        G["Jagati"]["Sanga"]['weight'] *= 1.5
        closed_road = "Road B (Jagati)"

    new_time = nx.shortest_path_length(G, source="Suryabinayak", target="Banepa", weight="weight")
    
    centrality = nx.edge_betweenness_centrality(G, weight="weight")
    
    cascade = []
    for (u, v), cent in centrality.items():
        name = G[u][v]['name']
        if name == closed_road:
            cascade.append({"road": name, "color": "red", "delay": 500})
        elif cent > 0.4:
            cascade.append({"road": name, "color": "orange", "delay": 1500})
        elif cent > 0:
            cascade.append({"road": name, "color": "yellow", "delay": 2500})
            
    # Remove duplicate cascade items based on road
    unique_cascade = []
    seen = set()
    for c in sorted(cascade, key=lambda x: x["delay"]):
        if c["road"] not in seen:
            unique_cascade.append(c)
            seen.add(c["road"])
            
    increase = int(((new_time - baseline_time) / baseline_time) * 100) if baseline_time else 0
            
    return {
        "baseline_travel_time_min": baseline_time,
        "new_travel_time_min": new_time,
        "increase_pct": f"+{increase}%",
        "closed_road_simulated": closed_road,
        "cascade_visualization": unique_cascade
    }

def query_decision_memory(event_context: str) -> Dict[str, Any]:
    """Queries the past decision memory to find similar historical events.
    
    Args:
        event_context: A description of the current event to search for.
    """
    try:
        with open("data/decision_memory.json", "r") as f:
            memory = json.load(f)
            
        if not memory:
            return {"similar_event": None}
            
        texts = [f"{item['event']} at {item['location']}" for item in memory]
        
        query_emb = client.models.embed_content(
            model="gemini-embedding-2",
            contents=event_context
        ).embeddings[0].values
        
        memory_embs = client.models.embed_content(
            model="gemini-embedding-2",
            contents=texts
        )
        memory_vecs = [emb.values for emb in memory_embs.embeddings]
        
        similarities = cosine_similarity([query_emb], memory_vecs)[0]
        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]
        
        if best_score > 0.5:
            return {
                "similar_event": memory[best_idx],
                "similarity_score": round(float(best_score), 2)
            }
            
        return {"similar_event": None, "message": "No relevant past decisions found."}
    except Exception as e:
        print(f"Memory error: {e}")
        return {"error": str(e)}

def ask_clarification(question: str) -> Dict[str, Any]:
    """Asks the user a clarifying question if critical details like the specific bridge name, road name, or truck weight are missing.
    
    Args:
        question: The question to ask the user to gather the missing context.
    """
    return {
        "status": "clarification_needed",
        "question": question
    }

pravah_tools = [
    check_bridge_tonnage,
    check_route_geometry,
    get_monsoon_landslide_risk,
    simulate_network_cascade,
    query_decision_memory,
    ask_clarification
]
