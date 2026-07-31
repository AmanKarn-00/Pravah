"""
PRAVAH Tool Suite — 21 tools across 6 agent domains.
All tools are Python callables passed to Gemma for native function calling.
"""
import json
import math
import random
import httpx
import networkx as nx
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
from google import genai
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()

# ═══════════════════════════════════════════════════════════
# SHARED: Road Network Graph
# ═══════════════════════════════════════════════════════════

def _build_network():
    """Build the Bhaktapur-Banepa road network graph."""
    G = nx.DiGraph()
    G.add_node("Suryabinayak", pos=(27.67, 85.42))
    G.add_node("Jagati", pos=(27.66, 85.44))
    G.add_node("Sanga", pos=(27.655, 85.455))
    G.add_node("Banepa", pos=(27.635, 85.50))
    G.add_node("Alt_Junction", pos=(27.665, 85.46))

    edges = [
        ("Suryabinayak", "Jagati", {"weight": 10, "name": "Road A (Suryabinayak)", "distance_km": 4.2, "capacity_vph": 1200, "speed_limit": 40}),
        ("Jagati", "Sanga", {"weight": 15, "name": "Road B (Jagati)", "distance_km": 3.8, "capacity_vph": 800, "speed_limit": 30}),
        ("Sanga", "Banepa", {"weight": 12, "name": "Road C (Sanga)", "distance_km": 5.1, "capacity_vph": 1000, "speed_limit": 40}),
        ("Suryabinayak", "Alt_Junction", {"weight": 20, "name": "Alt 1", "distance_km": 6.5, "capacity_vph": 600, "speed_limit": 25}),
        ("Alt_Junction", "Banepa", {"weight": 22, "name": "Alt 2", "distance_km": 7.2, "capacity_vph": 600, "speed_limit": 25}),
    ]
    for u, v, data in edges:
        G.add_edge(u, v, **data)
        G.add_edge(v, u, **data)  # Bidirectional
    return G

def _load_json(filename):
    """Load a JSON data file from the data directory."""
    path = os.path.join(os.path.dirname(__file__), "data", filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ═══════════════════════════════════════════════════════════
# 🚦 TRAFFIC AGENT TOOLS (1-4)
# ═══════════════════════════════════════════════════════════

def get_live_traffic_status(road: str) -> Dict[str, Any]:
    """Gets the current live traffic status for a specific road including speed, density, queue length and delay.
    
    Args:
        road: The road name to check traffic for (e.g. "Road A (Suryabinayak)", "Jagati").
    """
    G = _build_network()
    # Find matching edge
    matched = None
    for u, v, data in G.edges(data=True):
        if road.lower() in data["name"].lower():
            matched = data
            break
    
    if not matched:
        matched = {"capacity_vph": 800, "speed_limit": 30, "distance_km": 4.0}
    
    hour = datetime.now().hour
    # Simulate realistic traffic patterns based on time of day
    if 7 <= hour <= 9 or 17 <= hour <= 19:  # Peak
        load_factor = random.uniform(0.75, 0.95)
    elif 10 <= hour <= 16:  # Midday
        load_factor = random.uniform(0.4, 0.65)
    else:  # Night/early morning
        load_factor = random.uniform(0.1, 0.3)
    
    avg_speed = max(5, matched["speed_limit"] * (1 - load_factor * 0.8))
    density = "Heavy" if load_factor > 0.7 else "Moderate" if load_factor > 0.4 else "Light"
    queue_m = int(load_factor * 800) if load_factor > 0.5 else 0
    delay = round((matched["distance_km"] / avg_speed - matched["distance_km"] / matched["speed_limit"]) * 60, 1)
    
    return {
        "road": road,
        "average_speed_kmh": round(avg_speed, 1),
        "traffic_density": density,
        "queue_length_m": queue_m,
        "travel_delay_min": max(0, round(delay, 1)),
        "current_volume_vph": int(matched["capacity_vph"] * load_factor),
        "capacity_vph": matched["capacity_vph"],
        "timestamp": datetime.now().strftime("%H:%M")
    }


def predict_queue_length(road: str, closure_percent: int, duration_hours: float) -> Dict[str, Any]:
    """Predicts the queue buildup if a road is partially or fully closed.
    
    Args:
        road: The road that will be closed or restricted.
        closure_percent: Percentage of road capacity closed (100 = full closure, 50 = one lane).
        duration_hours: How long the closure will last in hours.
    """
    G = _build_network()
    capacity = 800
    for u, v, data in G.edges(data=True):
        if road.lower() in data["name"].lower():
            capacity = data["capacity_vph"]
            break
    
    remaining_capacity = capacity * (1 - closure_percent / 100)
    arrival_rate = capacity * 0.6  # Average demand
    queue_rate = max(0, arrival_rate - remaining_capacity)  # vehicles/hr backing up
    
    total_queued = queue_rate * duration_hours
    queue_km = round(total_queued * 0.007, 1)  # ~7m per vehicle
    
    hour = datetime.now().hour
    peak_hour = 17 if hour < 12 else 8  # Next peak
    peak_time = f"{peak_hour}:30"
    
    clearance_hours = (total_queued / capacity) if capacity > 0 else duration_hours
    clearance = (datetime.now() + timedelta(hours=duration_hours + clearance_hours)).strftime("%H:%M")
    
    return {
        "road": road,
        "closure_percent": closure_percent,
        "expected_queue_km": queue_km,
        "expected_queued_vehicles": int(total_queued),
        "peak_time": peak_time,
        "clearance_time": clearance,
        "spillover_roads": ["Alt 1", "Alt 2"] if queue_km > 2 else []
    }


def simulate_route_closure(road: str, closure_type: str = "full", duration_hours: float = 4) -> Dict[str, Any]:
    """Simulates the network-wide impact of closing or restricting a road segment.
    
    Args:
        road: The road to close (e.g. "Road B (Jagati)", "Pulbazar Bridge").
        closure_type: Type of closure - "full", "one_lane", or "heavy_vehicle_ban".
        duration_hours: Duration of the closure in hours.
    """
    G = _build_network()
    
    weight_multiplier = {"full": 100, "one_lane": 1.8, "heavy_vehicle_ban": 1.3}.get(closure_type, 100)
    
    closed_edge = None
    for u, v, data in G.edges(data=True):
        if road.lower() in data["name"].lower():
            G[u][v]["weight"] *= weight_multiplier
            G[v][u]["weight"] *= weight_multiplier
            closed_edge = data["name"]
            break
    
    if not closed_edge:
        # Default: affect Jagati-Sanga
        G["Jagati"]["Sanga"]["weight"] *= weight_multiplier
        G["Sanga"]["Jagati"]["weight"] *= weight_multiplier
        closed_edge = "Road B (Jagati)"
    
    baseline_G = _build_network()
    try:
        baseline_time = nx.shortest_path_length(baseline_G, "Suryabinayak", "Banepa", weight="weight")
        new_time = nx.shortest_path_length(G, "Suryabinayak", "Banepa", weight="weight")
        new_path = nx.shortest_path(G, "Suryabinayak", "Banepa", weight="weight")
    except nx.NetworkXNoPath:
        return {"error": "No alternative route available", "closed_road": closed_edge}
    
    increase = int(((new_time - baseline_time) / baseline_time) * 100)
    
    # Build affected roads
    affected = []
    centrality = nx.edge_betweenness_centrality(G, weight="weight")
    for (u2, v2), cent in centrality.items():
        name = G[u2][v2]["name"]
        congestion = "Critical" if cent > 0.5 else "Heavy" if cent > 0.3 else "Moderate"
        affected.append({"road": name, "congestion": congestion, "betweenness": round(cent, 3)})
    
    # Cascade visualization for map
    cascade = []
    for a in sorted(affected, key=lambda x: -x["betweenness"]):
        color = "red" if a["congestion"] == "Critical" else "orange" if a["congestion"] == "Heavy" else "yellow"
        if a["road"] == closed_edge:
            color = "red"
        cascade.append({"road": a["road"], "color": color, "delay": len(cascade) * 800 + 500})
    
    return {
        "closed_road": closed_edge,
        "closure_type": closure_type,
        "baseline_travel_time_min": baseline_time,
        "new_travel_time_min": round(new_time, 1),
        "increase_pct": f"+{increase}%",
        "detour_path": [G[new_path[i]][new_path[i+1]]["name"] for i in range(len(new_path)-1)] if len(new_path) > 1 else [],
        "affected_roads": affected,
        "congestion_score": min(100, increase * 2),
        "cascade_visualization": cascade
    }


def find_best_detour(closed_road: str) -> Dict[str, Any]:
    """Finds the best alternative route when a road is closed.
    
    Args:
        closed_road: The road that is closed (e.g. "Road B (Jagati)").
    """
    G = _build_network()
    
    # Remove the closed road
    for u, v, data in list(G.edges(data=True)):
        if closed_road.lower() in data["name"].lower():
            G.remove_edge(u, v)
    
    try:
        path = nx.shortest_path(G, "Suryabinayak", "Banepa", weight="weight")
        time = nx.shortest_path_length(G, "Suryabinayak", "Banepa", weight="weight")
        
        route_details = []
        total_dist = 0
        for i in range(len(path) - 1):
            edge = G[path[i]][path[i+1]]
            total_dist += edge["distance_km"]
            route_details.append({
                "road": edge["name"],
                "distance_km": edge["distance_km"],
                "capacity_vph": edge["capacity_vph"],
                "truck_suitable": edge["capacity_vph"] > 700
            })
        
        baseline_G = _build_network()
        baseline_time = nx.shortest_path_length(baseline_G, "Suryabinayak", "Banepa", weight="weight")
        
        return {
            "detour_available": True,
            "route": route_details,
            "total_distance_km": round(total_dist, 1),
            "estimated_travel_time_min": round(time, 1),
            "extra_time_min": round(time - baseline_time, 1),
            "truck_suitable": all(r["truck_suitable"] for r in route_details)
        }
    except nx.NetworkXNoPath:
        return {"detour_available": False, "error": "No alternative route exists"}


# ═══════════════════════════════════════════════════════════
# 🌉 INFRASTRUCTURE AGENT TOOLS (5-8)
# ═══════════════════════════════════════════════════════════

def get_bridge_health(bridge_name: str) -> Dict[str, Any]:
    """Gets the current health status, inspection history, and maintenance status of a bridge.
    
    Args:
        bridge_name: The name of the bridge (e.g. "Pulbazar Bridge", "Sunkoshi Bridge").
    """
    bridges = _load_json("bridge_registry.json")
    for b in bridges:
        if bridge_name.lower() in b["name"].lower():
            return {
                "name": b["name"],
                "type": b["type"],
                "condition": b["condition"],
                "last_inspection": b["last_inspection"],
                "load_limit_tonnes": b["load_limit_tonnes"],
                "maintenance_due": b["maintenance_due"],
                "year_built": b["year_built"],
                "age_years": datetime.now().year - b["year_built"],
                "notes": b["notes"]
            }
    return {"error": f"Bridge '{bridge_name}' not found in registry", "available_bridges": [b["name"] for b in bridges]}


def predict_bridge_failure(bridge_name: str, rainfall_mm: float = 0, truck_load_tonnes: float = 0) -> Dict[str, Any]:
    """Predicts the probability of bridge failure based on current conditions.
    
    Args:
        bridge_name: The name of the bridge.
        rainfall_mm: Current or forecasted rainfall in millimeters.
        truck_load_tonnes: Weight of the heaviest expected vehicle in tonnes.
    """
    bridges = _load_json("bridge_registry.json")
    bridge = None
    for b in bridges:
        if bridge_name.lower() in b["name"].lower():
            bridge = b
            break
    
    if not bridge:
        return {"error": f"Bridge '{bridge_name}' not found"}
    
    age = datetime.now().year - bridge["year_built"]
    condition_factor = {"Good": 0.02, "Fair": 0.08, "Poor": 0.2}.get(bridge["condition"], 0.1)
    
    # Risk model
    age_risk = min(age / 100, 0.3)  # Older = riskier
    load_ratio = truck_load_tonnes / bridge["load_limit_tonnes"] if bridge["load_limit_tonnes"] > 0 else 0
    overload_risk = max(0, (load_ratio - 0.8) * 2)  # Risk spikes above 80% capacity
    weather_risk = min(rainfall_mm / 200, 0.3)  # Heavy rain increases risk
    maintenance_risk = 0.1 if bridge["maintenance_due"] else 0
    
    probability = min(0.99, condition_factor + age_risk + overload_risk + weather_risk + maintenance_risk)
    
    risk_level = "Critical" if probability > 0.5 else "High" if probability > 0.3 else "Medium" if probability > 0.15 else "Low"
    
    return {
        "bridge": bridge["name"],
        "failure_probability": round(probability, 2),
        "risk_level": risk_level,
        "risk_factors": {
            "structural_condition": bridge["condition"],
            "age_years": age,
            "load_ratio": round(load_ratio, 2),
            "weather_impact": round(weather_risk, 2),
            "maintenance_overdue": bridge["maintenance_due"]
        },
        "recommendation": "Immediate inspection required" if probability > 0.3 else "Monitor closely" if probability > 0.15 else "Normal operations"
    }


def get_bridge_history(bridge_name: str) -> Dict[str, Any]:
    """Retrieves the full inspection, repair, and incident history for a bridge.
    
    Args:
        bridge_name: The name of the bridge.
    """
    bridges = _load_json("bridge_registry.json")
    for b in bridges:
        if bridge_name.lower() in b["name"].lower():
            return {
                "name": b["name"],
                "inspections": b["inspections"],
                "repairs": b["repairs"],
                "overload_incidents": b["overload_incidents"],
                "total_repair_cost_npr": sum(r["cost_npr"] for r in b["repairs"]),
                "incident_count": len(b["overload_incidents"])
            }
    return {"error": f"Bridge '{bridge_name}' not found"}


def calculate_remaining_capacity(bridge_name: str, current_load_tonnes: float) -> Dict[str, Any]:
    """Calculates the remaining load capacity of a bridge given current traffic load.
    
    Args:
        bridge_name: The name of the bridge.
        current_load_tonnes: The current total load on the bridge in tonnes.
    """
    bridges = _load_json("bridge_registry.json")
    for b in bridges:
        if bridge_name.lower() in b["name"].lower():
            limit = b["load_limit_tonnes"]
            condition_reduction = {"Good": 1.0, "Fair": 0.85, "Poor": 0.65}.get(b["condition"], 0.8)
            effective_limit = limit * condition_reduction
            remaining = effective_limit - current_load_tonnes
            utilization = (current_load_tonnes / effective_limit * 100) if effective_limit > 0 else 100
            
            return {
                "bridge": b["name"],
                "rated_capacity_tonnes": limit,
                "effective_capacity_tonnes": round(effective_limit, 1),
                "current_load_tonnes": current_load_tonnes,
                "remaining_capacity_tonnes": round(max(0, remaining), 1),
                "utilization_percent": round(min(100, utilization), 1),
                "risk": "Critical" if utilization > 90 else "High" if utilization > 75 else "Medium" if utilization > 50 else "Low",
                "can_accept_more": remaining > 0
            }
    return {"error": f"Bridge '{bridge_name}' not found"}


# ═══════════════════════════════════════════════════════════
# 🌧️ WEATHER AGENT TOOLS (9-11)
# ═══════════════════════════════════════════════════════════

def get_weather_forecast(location: str) -> Dict[str, Any]:
    """Gets the comprehensive weather forecast including rainfall, wind, visibility and storm warnings.
    
    Args:
        location: The location to get weather for (e.g. "Bhaktapur", "Banepa", "Sanga").
    """
    lat, lon = 27.67, 85.38
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,precipitation"
        f"&daily=precipitation_sum,wind_speed_10m_max,temperature_2m_max,temperature_2m_min"
        f"&hourly=visibility"
        f"&timezone=Asia%2FKathmandu&forecast_days=3"
    )
    
    with httpx.Client() as http_client:
        try:
            response = http_client.get(url, timeout=8)
            response.raise_for_status()
            data = response.json()
            
            current = data.get("current", {})
            daily = data.get("daily", {})
            hourly = data.get("hourly", {})
            
            precip_3day = sum(daily.get("precipitation_sum", [0])[:3])
            precip_today = daily.get("precipitation_sum", [0])[0] if daily.get("precipitation_sum") else 0
            wind_max = daily.get("wind_speed_10m_max", [0])[0] if daily.get("wind_speed_10m_max") else 0
            
            # Get minimum visibility from hourly data
            vis_values = hourly.get("visibility", [10000])[:24]
            min_visibility = min(vis_values) if vis_values else 10000
            
            storm_warning = precip_today > 80 or wind_max > 50
            
            return {
                "location": location,
                "temperature_c": current.get("temperature_2m", 25),
                "humidity_percent": current.get("relative_humidity_2m", 80),
                "wind_speed_kmh": current.get("wind_speed_10m", 10),
                "wind_gusts_kmh": current.get("wind_gusts_10m", 20),
                "current_precipitation_mm": current.get("precipitation", 0),
                "rainfall_today_mm": round(precip_today, 1),
                "rainfall_3day_mm": round(precip_3day, 1),
                "visibility_m": round(min_visibility),
                "storm_warning": storm_warning,
                "road_condition": "Dangerous" if precip_today > 60 else "Wet" if precip_today > 10 else "Dry",
                "forecast_summary": f"{'⚠️ STORM WARNING: ' if storm_warning else ''}{round(precip_today)}mm rain today, wind {round(wind_max)}km/h"
            }
        except Exception as e:
            print(f"Weather API error: {e}")
            return {
                "location": location,
                "rainfall_today_mm": 84, "rainfall_3day_mm": 210,
                "wind_speed_kmh": 35, "visibility_m": 300,
                "storm_warning": True,
                "road_condition": "Dangerous",
                "forecast_summary": "⚠️ Heavy monsoon conditions (fallback data)"
            }


def predict_landslide_probability(location: str, slope_angle: float = 35, soil_type: str = "clay") -> Dict[str, Any]:
    """Predicts landslide probability using rainfall data, slope angle, and soil type.
    
    Args:
        location: The location to assess (e.g. "Sanga Hill", "Jagati").
        slope_angle: The slope angle in degrees (default 35 for typical Nepal hill roads).
        soil_type: The soil type - "clay", "silt", "rock", or "mixed" (default "clay").
    """
    # Get live rainfall
    weather = get_weather_forecast(location)
    rain_3day = weather.get("rainfall_3day_mm", 0)
    rain_today = weather.get("rainfall_today_mm", 0)
    
    # Soil saturation factor
    soil_factors = {"clay": 0.9, "silt": 0.7, "mixed": 0.5, "rock": 0.2}
    soil_factor = soil_factors.get(soil_type, 0.6)
    
    # Slope factor (steeper = riskier)
    slope_factor = min(slope_angle / 45, 1.0)
    
    # Rainfall factor
    rain_factor = min(rain_3day / 150, 1.0)
    
    # Combined probability
    probability = min(0.99, (rain_factor * 0.4 + slope_factor * 0.3 + soil_factor * 0.3))
    
    # Vegetation factor (reduces risk)
    vegetation_reduction = 0.85  # Nepal hills generally have some vegetation
    probability *= vegetation_reduction
    
    risk_level = "Critical" if probability > 0.7 else "High" if probability > 0.5 else "Medium" if probability > 0.25 else "Low"
    
    return {
        "location": location,
        "landslide_probability": round(probability, 2),
        "risk_level": risk_level,
        "factors": {
            "rainfall_3day_mm": rain_3day,
            "rainfall_today_mm": rain_today,
            "slope_angle": slope_angle,
            "soil_type": soil_type,
            "soil_saturation": round(soil_factor, 2)
        },
        "recommendation": "Evacuate and close road" if probability > 0.7 else "Preventive closure recommended" if probability > 0.5 else "Monitor closely" if probability > 0.25 else "Normal operations"
    }


def check_river_level(river_name: str) -> Dict[str, Any]:
    """Checks the current river level and flood risk for a river crossing.
    
    Args:
        river_name: The name of the river (e.g. "Sunkoshi", "Hanumante", "Roshi").
    """
    # Use Open-Meteo river discharge API
    lat, lon = 27.65, 85.47
    url = (
        f"https://flood-api.open-meteo.com/v1/flood?"
        f"latitude={lat}&longitude={lon}"
        f"&daily=river_discharge"
        f"&forecast_days=7"
    )
    
    with httpx.Client() as http_client:
        try:
            response = http_client.get(url, timeout=8)
            response.raise_for_status()
            data = response.json()
            
            discharges = data.get("daily", {}).get("river_discharge", [])
            current_discharge = discharges[0] if discharges else 50
            max_forecast = max(discharges[:3]) if len(discharges) >= 3 else current_discharge
            
            # Classify levels
            if current_discharge > 500:
                level = "Danger"
                overflow_prob = 0.85
            elif current_discharge > 200:
                level = "Warning"
                overflow_prob = 0.45
            elif current_discharge > 100:
                level = "Alert"
                overflow_prob = 0.15
            else:
                level = "Normal"
                overflow_prob = 0.02
            
            return {
                "river": river_name,
                "current_discharge_m3s": round(current_discharge, 1),
                "max_forecast_3day_m3s": round(max_forecast, 1),
                "level": level,
                "overflow_probability": round(overflow_prob, 2),
                "flood_risk": "High" if overflow_prob > 0.4 else "Medium" if overflow_prob > 0.1 else "Low",
                "advisory": f"{'⚠️ FLOOD WARNING: ' if level in ['Danger', 'Warning'] else ''}River {river_name} at {level} level"
            }
        except Exception as e:
            print(f"River API error: {e}")
            return {
                "river": river_name,
                "level": "Warning",
                "overflow_probability": 0.41,
                "flood_risk": "Medium",
                "advisory": "River monitoring data unavailable (fallback)"
            }


# ═══════════════════════════════════════════════════════════
# 🚑 EMERGENCY AGENT TOOLS (12-14)
# ═══════════════════════════════════════════════════════════

def get_nearest_hospital(location: str) -> Dict[str, Any]:
    """Finds the nearest hospitals and their capabilities for a given location.
    
    Args:
        location: The location to search from (e.g. "Jagati", "Sanga", "Banepa").
    """
    hospitals = _load_json("hospital_registry.json")
    
    # Normalize location
    loc_key = None
    for key in ["Suryabinayak", "Jagati", "Sanga", "Banepa"]:
        if key.lower() in location.lower():
            loc_key = key
            break
    if not loc_key:
        loc_key = "Jagati"  # Default to central location
    
    results = []
    for h in hospitals:
        dist = h["distance_km"].get(loc_key, 15)
        time = h["travel_time_min"].get(loc_key, 30)
        results.append({
            "name": h["name"],
            "type": h["type"],
            "distance_km": dist,
            "travel_time_min": time,
            "trauma_center": h["trauma_center"],
            "available_beds": h["beds"],
            "icu_beds": h["icu_beds"],
            "ambulances": h["ambulances"]
        })
    
    results.sort(key=lambda x: x["travel_time_min"])
    
    return {
        "location": location,
        "nearest": results[0] if results else None,
        "all_hospitals": results,
        "nearest_trauma_center": next((h for h in results if h["trauma_center"]), None)
    }


def estimate_ambulance_delay(origin: str, closed_road: str) -> Dict[str, Any]:
    """Estimates how much ambulance response time increases if a specific road is closed.
    
    Args:
        origin: Where the emergency is (e.g. "Sanga", "Jagati").
        closed_road: The road that is closed (e.g. "Road B (Jagati)").
    """
    hospitals = _load_json("hospital_registry.json")
    
    loc_key = None
    for key in ["Suryabinayak", "Jagati", "Sanga", "Banepa"]:
        if key.lower() in origin.lower():
            loc_key = key
            break
    if not loc_key:
        loc_key = "Jagati"
    
    # Find nearest hospital normal time
    normal_times = []
    for h in hospitals:
        normal_times.append({
            "hospital": h["name"],
            "normal_time_min": h["travel_time_min"].get(loc_key, 30),
            "trauma": h["trauma_center"]
        })
    normal_times.sort(key=lambda x: x["normal_time_min"])
    
    # Simulate closure impact using graph
    G = _build_network()
    for u, v, data in list(G.edges(data=True)):
        if closed_road.lower() in data["name"].lower():
            G.remove_edge(u, v)
    
    # Calculate delay factor
    try:
        baseline_G = _build_network()
        baseline = nx.shortest_path_length(baseline_G, "Suryabinayak", "Banepa", weight="weight")
        new = nx.shortest_path_length(G, "Suryabinayak", "Banepa", weight="weight")
        delay_factor = new / baseline if baseline > 0 else 1.5
    except nx.NetworkXNoPath:
        delay_factor = 3.0
    
    current_time = normal_times[0]["normal_time_min"]
    after_closure = round(current_time * delay_factor)
    
    return {
        "origin": origin,
        "closed_road": closed_road,
        "nearest_hospital": normal_times[0]["hospital"],
        "current_response_min": current_time,
        "after_closure_response_min": after_closure,
        "delay_increase_min": after_closure - current_time,
        "golden_hour_at_risk": after_closure > 60,
        "nearest_trauma_center": next((h for h in normal_times if h["trauma"]), None)
    }


def get_available_emergency_units(district: str) -> Dict[str, Any]:
    """Gets the currently available emergency response units in a district.
    
    Args:
        district: The district name (e.g. "Bhaktapur", "Kavrepalanchok").
    """
    # Simulated but realistic deployment data
    units = {
        "Bhaktapur": {"police_patrols": 4, "ambulances": 6, "fire_engines": 2, "rescue_teams": 1},
        "Kavrepalanchok": {"police_patrols": 3, "ambulances": 4, "fire_engines": 1, "rescue_teams": 2},
    }
    
    district_units = units.get(district, units["Bhaktapur"])
    
    # Simulate some units being deployed
    available = {}
    for unit_type, total in district_units.items():
        deployed = random.randint(0, max(1, total // 2))
        available[unit_type] = {"total": total, "deployed": deployed, "available": total - deployed}
    
    return {
        "district": district,
        "units": available,
        "total_available": sum(u["available"] for u in available.values()),
        "can_deploy": sum(u["available"] for u in available.values()) > 2
    }


# ═══════════════════════════════════════════════════════════
# 🧠 HISTORICAL MEMORY AGENT TOOLS (15-16)
# ═══════════════════════════════════════════════════════════

def search_similar_incidents(event_context: str) -> Dict[str, Any]:
    """Searches historical incident database for similar past events using semantic similarity.
    
    Args:
        event_context: A description of the current event to search for similar incidents.
    """
    try:
        memory = _load_json("decision_memory.json")
        if not memory:
            return {"matches": [], "message": "No historical incidents in database."}
        
        texts = [f"{item['event']} at {item['location']} on {item['road']}" for item in memory]
        
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
        
        # Return top 3 matches above threshold
        top_matches = []
        for idx in np.argsort(similarities)[::-1][:3]:
            score = float(similarities[idx])
            if score > 0.4:
                incident = memory[idx]
                top_matches.append({
                    "id": incident.get("id", f"INC-{idx}"),
                    "event": incident["event"],
                    "location": incident["location"],
                    "date": incident["date"],
                    "result": incident["result"],
                    "similarity_score": round(score, 2),
                    "traffic_increase_pct": incident.get("traffic_increase_pct"),
                    "ambulance_delay_min": incident.get("ambulance_delay_min"),
                    "economic_loss_npr": incident.get("economic_loss_npr")
                })
        
        recommended_action = top_matches[0]["result"] if top_matches else "No similar incidents found."
        
        return {
            "top_matches": top_matches,
            "recommended_action": recommended_action,
            "total_incidents_searched": len(memory)
        }
    except Exception as e:
        print(f"Memory search error: {e}")
        return {"error": str(e), "top_matches": []}


def retrieve_post_incident_report(incident_id: str) -> Dict[str, Any]:
    """Retrieves the detailed post-incident report including lessons learned for a specific incident.
    
    Args:
        incident_id: The incident ID (e.g. "INC-2026-001").
    """
    memory = _load_json("decision_memory.json")
    for incident in memory:
        if incident.get("id") == incident_id:
            report = incident.get("post_incident_report", {})
            return {
                "incident_id": incident_id,
                "event": incident["event"],
                "location": incident["location"],
                "date": incident["date"],
                "duration_hours": incident.get("duration_hours"),
                "lessons_learned": report.get("lessons_learned", "No report available"),
                "what_failed": report.get("what_failed", "Unknown"),
                "what_worked": report.get("what_worked", "Unknown"),
                "economic_loss_npr": incident.get("economic_loss_npr", 0)
            }
    return {"error": f"Incident '{incident_id}' not found", "available_ids": [m.get("id") for m in memory if m.get("id")]}


# ═══════════════════════════════════════════════════════════
# 📊 PLANNING AGENT TOOLS (17-18)
# ═══════════════════════════════════════════════════════════

def estimate_economic_loss(road: str, closure_hours: float, traffic_volume: int = 800) -> Dict[str, Any]:
    """Estimates the economic impact of a road closure including fuel, time, and business losses.
    
    Args:
        road: The road being closed.
        closure_hours: How many hours the road will be closed.
        traffic_volume: Average vehicles per hour on this road (default 800).
    """
    affected_vehicles = int(traffic_volume * closure_hours)
    avg_detour_km = 8.5  # Average detour adds ~8.5 km
    
    fuel_cost_per_km = 12  # NPR per km average
    time_value_per_hour = 250  # NPR per hour per person
    avg_delay_hours = 0.5  # Average delay per vehicle
    
    fuel_loss = affected_vehicles * avg_detour_km * fuel_cost_per_km
    time_loss = affected_vehicles * avg_delay_hours * time_value_per_hour
    
    # Business disruption (shops, logistics, supply chain)
    business_loss = closure_hours * 50000  # NPR per hour estimate
    
    total = fuel_loss + time_loss + business_loss
    
    return {
        "road": road,
        "closure_hours": closure_hours,
        "affected_vehicles": affected_vehicles,
        "fuel_cost_npr": round(fuel_loss),
        "time_loss_npr": round(time_loss),
        "business_disruption_npr": round(business_loss),
        "total_economic_loss_npr": round(total),
        "total_economic_loss_usd": round(total / 135, 2),  # Approximate NPR to USD
        "loss_per_hour_npr": round(total / closure_hours) if closure_hours > 0 else 0
    }


def estimate_carbon_emissions(detour_km: float, vehicle_count: int) -> Dict[str, Any]:
    """Calculates the additional CO2 emissions caused by detour routing.
    
    Args:
        detour_km: Extra kilometers each vehicle must travel on the detour.
        vehicle_count: Number of vehicles affected.
    """
    # Average emission factors
    co2_per_km_car = 0.12  # kg CO2 per km (average car)
    co2_per_km_truck = 0.35  # kg CO2 per km (heavy vehicle)
    
    car_ratio = 0.75
    truck_ratio = 0.25
    
    car_emissions = vehicle_count * car_ratio * detour_km * co2_per_km_car
    truck_emissions = vehicle_count * truck_ratio * detour_km * co2_per_km_truck
    total = car_emissions + truck_emissions
    
    # Context: equivalent trees needed
    trees_needed = round(total / 21)  # 1 tree absorbs ~21 kg CO2/year
    
    return {
        "detour_km": detour_km,
        "vehicle_count": vehicle_count,
        "car_emissions_kg": round(car_emissions, 1),
        "truck_emissions_kg": round(truck_emissions, 1),
        "total_co2_kg": round(total, 1),
        "equivalent_trees_annual": trees_needed,
        "extra_fuel_liters": round(total / 2.31, 1)  # ~2.31 kg CO2 per liter petrol
    }


# ═══════════════════════════════════════════════════════════
# 🔮 PREDICTION AGENT TOOLS (19-20)
# ═══════════════════════════════════════════════════════════

def forecast_traffic(road: str, hours_ahead: int = 6) -> Dict[str, Any]:
    """Predicts traffic conditions for the next several hours on a specific road.
    
    Args:
        road: The road to forecast traffic for.
        hours_ahead: Number of hours to forecast (default 6, max 24).
    """
    hours_ahead = min(hours_ahead, 24)
    current_hour = datetime.now().hour
    
    forecasts = []
    for h in range(hours_ahead):
        future_hour = (current_hour + h + 1) % 24
        
        # Realistic traffic pattern for Nepal
        if 7 <= future_hour <= 9:
            density = "Heavy"
            speed = random.randint(12, 20)
            volume_pct = random.randint(75, 95)
        elif 17 <= future_hour <= 19:
            density = "Heavy"
            speed = random.randint(10, 18)
            volume_pct = random.randint(80, 98)
        elif 10 <= future_hour <= 16:
            density = "Moderate"
            speed = random.randint(22, 35)
            volume_pct = random.randint(40, 65)
        elif 20 <= future_hour <= 22:
            density = "Moderate"
            speed = random.randint(25, 38)
            volume_pct = random.randint(30, 50)
        else:
            density = "Light"
            speed = random.randint(35, 50)
            volume_pct = random.randint(5, 20)
        
        forecasts.append({
            "hour": f"{future_hour:02d}:00",
            "density": density,
            "avg_speed_kmh": speed,
            "volume_percent": volume_pct
        })
    
    peak_period = next((f for f in forecasts if f["density"] == "Heavy"), None)
    
    return {
        "road": road,
        "forecast_hours": hours_ahead,
        "predictions": forecasts,
        "next_peak": peak_period,
        "best_window": next((f for f in forecasts if f["density"] == "Light"), forecasts[-1]) if forecasts else None
    }


def predict_recovery_time(road: str, closure_type: str = "full") -> Dict[str, Any]:
    """Predicts when traffic will return to normal after a road closure ends.
    
    Args:
        road: The road that was closed.
        closure_type: Type of closure - "full", "one_lane", or "heavy_vehicle_ban".
    """
    # Recovery patterns based on closure type
    recovery_minutes = {
        "full": random.randint(45, 120),
        "one_lane": random.randint(20, 60),
        "heavy_vehicle_ban": random.randint(10, 30)
    }
    
    recovery = recovery_minutes.get(closure_type, 60)
    
    return {
        "road": road,
        "closure_type": closure_type,
        "estimated_recovery_minutes": recovery,
        "recovery_time": (datetime.now() + timedelta(minutes=recovery)).strftime("%H:%M"),
        "recovery_phases": [
            {"phase": "Queue dissipation", "duration_min": int(recovery * 0.4), "description": "Backed-up vehicles begin moving"},
            {"phase": "Flow normalization", "duration_min": int(recovery * 0.35), "description": "Traffic speed returns to 80% of normal"},
            {"phase": "Full recovery", "duration_min": int(recovery * 0.25), "description": "Normal flow restored on all routes"}
        ],
        "factors": ["Time of day", "Queue length at reopening", "Alternative route traffic", "Road surface condition"]
    }


# ═══════════════════════════════════════════════════════════
# 🔧 SYSTEM TOOL
# ═══════════════════════════════════════════════════════════

def ask_clarification(question: str) -> Dict[str, Any]:
    """Asks the user a clarifying question if critical details like the specific bridge name, road name, or truck weight are missing.
    
    Args:
        question: The question to ask the user to gather the missing context.
    """
    return {
        "status": "clarification_needed",
        "question": question
    }


# ═══════════════════════════════════════════════════════════
# TOOL REGISTRY
# ═══════════════════════════════════════════════════════════

pravah_tools = [
    # Traffic Agent
    get_live_traffic_status,
    predict_queue_length,
    simulate_route_closure,
    find_best_detour,
    # Infrastructure Agent
    get_bridge_health,
    predict_bridge_failure,
    get_bridge_history,
    calculate_remaining_capacity,
    # Weather Agent
    get_weather_forecast,
    predict_landslide_probability,
    check_river_level,
    # Emergency Agent
    get_nearest_hospital,
    estimate_ambulance_delay,
    get_available_emergency_units,
    # Memory Agent
    search_similar_incidents,
    retrieve_post_incident_report,
    # Planning Agent
    estimate_economic_loss,
    estimate_carbon_emissions,
    # Prediction Agent
    forecast_traffic,
    predict_recovery_time,
    # System
    ask_clarification,
]
