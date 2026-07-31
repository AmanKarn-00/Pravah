import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Circle, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AlertTriangle, CloudRain, Car, Activity } from 'lucide-react';

// Fix leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIcon = (color, emoji) => L.divIcon({
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 10px ${color}80;">${emoji}</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const createLabelIcon = (text, color, bgColor) => L.divIcon({
  html: `<div style="
    background:${bgColor};
    color:${color};
    font-size:11px;
    font-weight:700;
    padding:2px 8px;
    border-radius:6px;
    border:1.5px solid ${color};
    white-space:nowrap;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    letter-spacing:0.5px;
    text-transform:uppercase;
  ">${text}</div>`,
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// ── Bhaktapur-Banepa corridor bounds ──
const AREA_BOUNDS = [
  [27.62, 85.40],  // southwest
  [27.69, 85.52],  // northeast
];
const CENTER = [27.655, 85.46];
const MIN_ZOOM = 13;
const MAX_ZOOM = 17;
const DEFAULT_ZOOM = 14;

// ── Road network ──
const mainRoads = [
  { name: "Road A (Suryabinayak)", positions: [[27.67, 85.42], [27.66, 85.44]], label: "Road A" },
  { name: "Road B (Jagati)", positions: [[27.66, 85.44], [27.655, 85.455]], label: "Road B" },
  { name: "Road C (Sanga)", positions: [[27.655, 85.455], [27.645, 85.475]], label: "Road C" },
  { name: "Road D (Banepa)", positions: [[27.645, 85.475], [27.635, 85.50]], label: "Road D" },
];

const altRoutes = [
  { name: "Alt 1", positions: [[27.67, 85.42], [27.665, 85.46]], label: "Alt Route A" },
  { name: "Alt 2", positions: [[27.665, 85.46], [27.635, 85.50]], label: "Alt Route B" },
];

const roads = [...mainRoads, ...altRoutes];

// Key junction / landmark points for labelling
const junctions = [
  { name: "Suryabinayak", pos: [27.67, 85.42], emoji: "📍" },
  { name: "Jagati", pos: [27.66, 85.44], emoji: "📍" },
  { name: "Sanga", pos: [27.655, 85.455], emoji: "📍" },
  { name: "Banepa", pos: [27.635, 85.50], emoji: "📍" },
  { name: "Alt Junction", pos: [27.665, 85.46], emoji: "🔀" },
];

const landslideZones = [
  { center: [27.655, 85.455], radius: 600, risk: 'high', label: 'Jagati Slope' },
  { center: [27.645, 85.48], radius: 400, risk: 'medium', label: 'Sanga Hillside' },
  { center: [27.66, 85.43], radius: 350, risk: 'low', label: 'Suryabinayak Ridge' },
];

const floodZones = [
  { center: [27.65, 85.46], radius: 500, label: 'River Crossing' },
  { center: [27.64, 85.49], radius: 350, label: 'Low Basin Area' },
];

// ── Component that constrains the map to our area ──
const BoundsEnforcer = () => {
  const map = useMap();

  useEffect(() => {
    // Set hard bounds so users can't pan away
    map.setMaxBounds(L.latLngBounds(AREA_BOUNDS));
    map.setMinZoom(MIN_ZOOM);
    map.setMaxZoom(MAX_ZOOM);

    // Fit view to the road corridor
    const corridorBounds = L.latLngBounds([
      [27.630, 85.41],
      [27.675, 85.51],
    ]);
    map.fitBounds(corridorBounds, { padding: [30, 30], maxZoom: DEFAULT_ZOOM });

    // Prevent the grey void when user drags near edges
    const onDragEnd = () => {
      if (!map.getBounds().intersects(L.latLngBounds(AREA_BOUNDS))) {
        map.panInsideBounds(L.latLngBounds(AREA_BOUNDS), { animate: true });
      }
    };
    map.on('dragend', onDragEnd);
    return () => map.off('dragend', onDragEnd);
  }, [map]);

  return null;
};

// ── Animated vehicles component ──
const AnimatedVehicles = ({ activeRoads }) => {
  const [positions, setPositions] = useState([]);
  
  useEffect(() => {
    const vehicles = [];
    roads.forEach(road => {
      const isActive = activeRoads.includes(road.name);
      const count = isActive ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const t = Math.random();
        const lat = road.positions[0][0] + (road.positions[1][0] - road.positions[0][0]) * t;
        const lng = road.positions[0][1] + (road.positions[1][1] - road.positions[0][1]) * t;
        vehicles.push({ lat, lng, road: road.name, speed: isActive ? 'slow' : 'fast' });
      }
    });
    setPositions(vehicles);
    
    const interval = setInterval(() => {
      setPositions(prev => prev.map(v => {
        const road = roads.find(r => r.name === v.road);
        if (!road) return v;
        const dir = Math.random() > 0.5 ? 1 : -1;
        const step = v.speed === 'slow' ? 0.0003 : 0.001;
        let newLat = v.lat + (road.positions[1][0] - road.positions[0][0]) * step * dir;
        let newLng = v.lng + (road.positions[1][1] - road.positions[0][1]) * step * dir;
        const minLat = Math.min(road.positions[0][0], road.positions[1][0]);
        const maxLat = Math.max(road.positions[0][0], road.positions[1][0]);
        const minLng = Math.min(road.positions[0][1], road.positions[1][1]);
        const maxLng = Math.max(road.positions[0][1], road.positions[1][1]);
        newLat = Math.max(minLat, Math.min(maxLat, newLat));
        newLng = Math.max(minLng, Math.min(maxLng, newLng));
        return { ...v, lat: newLat, lng: newLng };
      }));
    }, 800);
    
    return () => clearInterval(interval);
  }, [activeRoads]);
  
  return positions.map((v, i) => (
    <Marker 
      key={`vehicle-${i}`} 
      position={[v.lat, v.lng]} 
      icon={createIcon(v.speed === 'slow' ? '#ef4444' : '#22c55e', '🚗')}
    />
  ));
};

const MapWidget = ({ simulationData, mapCascade, currentMapStep = -1, evidence }) => {
  const [activeLayers, setActiveLayers] = useState({
    traffic: true, weather: true, landslide: true, vehicles: true
  });

  // Build congestion lookup from simulation data (handles both old and new formats)
  const congestionMap = useMemo(() => {
    const map = {};
    if (!simulationData) return map;
    
    // New format: affected_roads array from simulate_route_closure
    if (simulationData.affected_roads) {
      simulationData.affected_roads.forEach(r => {
        map[r.road] = r.congestion; // "Critical", "Heavy", "Moderate"
      });
    }
    // Old format: simulation_results keyed by road name
    if (simulationData.simulation_results) {
      Object.entries(simulationData.simulation_results).forEach(([road, val]) => {
        map[road] = val;
      });
    }
    return map;
  }, [simulationData]);

  const hasWeatherRisk = evidence?.weather?.risk === 'High' || evidence?.weather?.risk === 'Critical';
  const rainMm = evidence?.weather?.rain ? parseFloat(evidence.weather.rain) : 0;

  const getColor = (roadName) => {
    // Cascade animation mode
    if (mapCascade && mapCascade.length > 0 && currentMapStep >= 0) {
      const stepIdx = mapCascade.findIndex(step => step.road === roadName);
      if (stepIdx !== -1 && stepIdx <= currentMapStep) {
        const c = mapCascade[stepIdx].color;
        if (c === 'red') return '#ef4444';
        if (c === 'orange') return '#f97316';
        if (c === 'yellow') return '#eab308';
        return '#22c55e';
      }
      return '#22c55e';
    }
    
    // Congestion data mode
    const cong = congestionMap[roadName];
    if (!cong) return '#22c55e';
    
    // Handle string congestion levels from new format
    if (typeof cong === 'string') {
      const cl = cong.toLowerCase();
      if (cl === 'critical') return '#ef4444';
      if (cl === 'heavy') return '#f97316';
      if (cl === 'moderate') return '#eab308';
      // Handle old percentage format
      const pct = parseInt(cong.replace('%','').replace('+',''));
      if (!isNaN(pct)) {
        if (pct > 40) return '#ef4444';
        if (pct > 20) return '#f97316';
        return '#eab308';
      }
    }
    
    return '#22c55e';
  };

  const getTrafficClass = (roadName) => {
    if (mapCascade && mapCascade.length > 0 && currentMapStep >= 0) {
      const stepIdx = mapCascade.findIndex(step => step.road === roadName);
      if (stepIdx !== -1 && stepIdx <= currentMapStep) return 'cascade-wave';
    }
    const color = getColor(roadName);
    if (color === '#22c55e') return 'animated-traffic-fast';
    if (color === '#eab308') return 'animated-traffic-medium';
    return 'animated-traffic-slow';
  };

  const activeRoads = useMemo(() => {
    if (mapCascade && mapCascade.length > 0) {
      return mapCascade.filter((_, i) => i <= currentMapStep).map(s => s.road);
    }
    return Object.keys(congestionMap);
  }, [mapCascade, currentMapStep, congestionMap]);

  const toggleLayer = (layer) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const getLandslideColor = (risk) => {
    if (!hasWeatherRisk) return 'rgba(100,100,100,0.1)';
    if (risk === 'high') return 'rgba(239,68,68,0.25)';
    if (risk === 'medium') return 'rgba(249,115,22,0.2)';
    return 'rgba(234,179,8,0.15)';
  };

  // Get closed road name for display
  const closedRoad = simulationData?.closed_road || simulationData?.closed_road_simulated || '';
  const increaseStr = simulationData?.increase_pct || '';

  // Only show routes/overlays once we have data from the backend
  const hasData = !!(simulationData || (mapCascade && mapCascade.length > 0) || evidence);

  // Helper: midpoint of a road segment for label placement
  const midpoint = (positions) => [
    (positions[0][0] + positions[1][0]) / 2,
    (positions[0][1] + positions[1][1]) / 2,
  ];

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-800 relative z-0 flex flex-col">
      <style>{`
        .animated-traffic-fast {
          stroke-dasharray: 8, 12;
          animation: trafficFlow 1s linear infinite;
        }
        .animated-traffic-medium {
          stroke-dasharray: 8, 12;
          animation: trafficFlow 3s linear infinite;
        }
        .animated-traffic-slow {
          stroke-dasharray: 8, 12;
          animation: trafficFlow 8s linear infinite;
        }
        @keyframes trafficFlow {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        .cascade-wave {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawCascade 0.8s ease-out forwards;
        }
        @keyframes drawCascade {
          to { stroke-dashoffset: 0; }
        }
        .alt-route-dash {
          stroke-dasharray: 12, 8;
          animation: altPulse 2s ease-in-out infinite;
        }
        @keyframes altPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .leaflet-tooltip.route-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.5px;
          padding: 0 !important;
        }
      `}</style>
      
      {/* Layer Controls */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col gap-1.5">
        {[
          { key: 'traffic', icon: Activity, label: 'Traffic', color: '#34d399' },
          { key: 'weather', icon: CloudRain, label: 'Flood', color: '#22d3ee' },
          { key: 'landslide', icon: AlertTriangle, label: 'Landslide', color: '#fb923c' },
          { key: 'vehicles', icon: Car, label: 'Vehicles', color: '#a78bfa' },
        ].map(layer => (
          <button
            key={layer.key}
            onClick={() => toggleLayer(layer.key)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border"
            style={{
              backgroundColor: activeLayers[layer.key] ? `${layer.color}20` : 'rgba(30,41,59,0.8)',
              color: activeLayers[layer.key] ? layer.color : '#64748b',
              borderColor: activeLayers[layer.key] ? `${layer.color}60` : '#334155',
            }}
          >
            <layer.icon className="w-3 h-3" />
            {layer.label}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-[500]">
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/80 p-2.5 flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-slate-400 font-medium">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
            <span className="text-slate-400 font-medium">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="text-slate-400 font-medium">Heavy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            <span className="text-slate-400 font-medium">Critical</span>
          </div>
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-600">
            <div className="w-5 h-0.5 rounded" style={{ background: 'linear-gradient(90deg, #a78bfa 33%, transparent 33%, transparent 66%, #a78bfa 66%)' }} />
            <span className="text-violet-400 font-medium">Alt Route</span>
          </div>
          {closedRoad && (
            <div className="ml-auto flex items-center gap-1 text-red-400 font-bold truncate max-w-[40%]">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="truncate">{closedRoad}</span>
              {increaseStr && <span className="text-amber-400 ml-1">{increaseStr}</span>}
            </div>
          )}
          {!closedRoad && rainMm > 0 && (
            <div className="ml-auto flex items-center gap-1 text-cyan-400 font-bold">
              <CloudRain className="w-3 h-3" />
              {rainMm}mm
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          maxBounds={AREA_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <BoundsEnforcer />

          {/* Satellite Imagery */}
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution='Labels &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.7}
          />

          {/* ── Main Road outlines (depth effect) ── */}
          {hasData && activeLayers.traffic && mainRoads.map((road, idx) => (
            <Polyline 
              key={`outline-main-${idx}`}
              positions={road.positions} 
              color="rgba(0,0,0,0.5)"
              weight={8}
              opacity={0.4}
            />
          ))}

          {/* ── Main Traffic Roads ── */}
          {hasData && activeLayers.traffic && mainRoads.map((road, idx) => (
            <Polyline 
              key={`road-main-${idx}`}
              positions={road.positions} 
              color={getColor(road.name)} 
              weight={5}
              opacity={0.9}
              className={getTrafficClass(road.name)}
            >
              <Tooltip
                permanent
                direction="center"
                className="route-label"
                offset={[0, -12]}
              >
                <span style={{
                  color: '#fff',
                  background: 'rgba(15,23,42,0.8)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  border: `1px solid ${getColor(road.name)}60`,
                }}>
                  {road.label}
                </span>
              </Tooltip>
              <Popup>
                <div style={{color: '#1e293b', fontWeight: 600}}>{road.name}</div>
                <div style={{fontSize: '11px', color: '#64748b'}}>
                  {congestionMap[road.name] || 'Normal flow'}
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* ── Alt Route outlines (distinct dashed style) ── */}
          {hasData && activeLayers.traffic && altRoutes.map((road, idx) => (
            <Polyline
              key={`outline-alt-${idx}`}
              positions={road.positions}
              color="rgba(0,0,0,0.4)"
              weight={9}
              opacity={0.3}
              dashArray="12, 8"
            />
          ))}

          {/* ── Alt Routes (visually distinct — purple/violet dashed) ── */}
          {hasData && activeLayers.traffic && altRoutes.map((road, idx) => {
            const color = getColor(road.name);
            const isDefault = color === '#22c55e'; // no congestion data → use distinctive alt color
            const displayColor = isDefault ? '#a78bfa' : color;
            return (
              <Polyline
                key={`road-alt-${idx}`}
                positions={road.positions}
                color={displayColor}
                weight={5}
                opacity={0.9}
                dashArray="12, 8"
                className={isDefault ? 'alt-route-dash' : getTrafficClass(road.name)}
              >
                <Tooltip
                  permanent
                  direction="center"
                  className="route-label"
                  offset={[0, -14]}
                >
                  <span style={{
                    color: '#c4b5fd',
                    background: 'rgba(15,23,42,0.85)',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    border: '1.5px solid #a78bfa80',
                    textTransform: 'uppercase',
                  }}>
                    🔀 {road.label}
                  </span>
                </Tooltip>
                <Popup>
                  <div style={{color: '#1e293b', fontWeight: 600}}>{road.label}</div>
                  <div style={{fontSize: '11px', color: '#7c3aed'}}>
                    Alternative Route • {congestionMap[road.name] || 'Available'}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* ── Junction markers ── */}
          {hasData && activeLayers.traffic && junctions.map((jn, idx) => (
            <Marker
              key={`junction-${idx}`}
              position={jn.pos}
              icon={createLabelIcon(
                `${jn.emoji} ${jn.name}`,
                jn.name === 'Alt Junction' ? '#a78bfa' : '#e2e8f0',
                jn.name === 'Alt Junction' ? 'rgba(124,58,237,0.25)' : 'rgba(15,23,42,0.85)'
              )}
            />
          ))}

          {/* Landslide Risk Zones */}
          {activeLayers.landslide && landslideZones.map((zone, idx) => (
            <React.Fragment key={`ls-${idx}`}>
              <Circle
                center={zone.center}
                radius={zone.radius}
                pathOptions={{
                  fillColor: getLandslideColor(zone.risk),
                  fillOpacity: 0.5,
                  color: zone.risk === 'high' ? '#ef4444' : zone.risk === 'medium' ? '#f97316' : '#eab308',
                  weight: 1.5,
                  dashArray: '5, 5',
                }}
              >
                <Popup>
                  <div style={{fontWeight: 600, color: '#1e293b'}}>⛰️ {zone.label}</div>
                  <div style={{fontSize: '11px', color: zone.risk === 'high' ? '#dc2626' : '#ea580c'}}>
                    Landslide Risk: {zone.risk.toUpperCase()}
                  </div>
                </Popup>
              </Circle>
              {zone.risk === 'high' && hasWeatherRisk && (
                <Marker position={zone.center} icon={createIcon('#ef4444', '⚠️')} />
              )}
            </React.Fragment>
          ))}

          {/* Flood Risk Zones */}
          {activeLayers.weather && floodZones.map((zone, idx) => (
            <Circle
              key={`flood-${idx}`}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                fillColor: rainMm > 50 ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.1)',
                fillOpacity: rainMm > 50 ? 0.5 : 0.2,
                color: '#06b6d4',
                weight: 1,
                dashArray: '3, 6',
              }}
            >
              <Popup>
                <div style={{fontWeight: 600, color: '#1e293b'}}>🌊 {zone.label}</div>
                <div style={{fontSize: '11px', color: '#0891b2'}}>
                  Flood Risk: {rainMm > 50 ? 'HIGH' : rainMm > 20 ? 'MODERATE' : 'LOW'}
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Live Vehicle Markers */}
          {hasData && activeLayers.vehicles && <AnimatedVehicles activeRoads={activeRoads} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapWidget;
