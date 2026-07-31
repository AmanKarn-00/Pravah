import React from 'react';
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon issue in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapWidget = ({ simulationData, mapCascade, currentMapStep = -1 }) => {
  // Bhaktapur - Banepa roughly around 27.64, 85.47
  const position = [27.65, 85.47];
  
  // Mock road segments for visualization
  const roads = [
    { name: "Road A (Suryabinayak)", positions: [[27.67, 85.42], [27.66, 85.44]] },
    { name: "Road B (Jagati)", positions: [[27.66, 85.44], [27.65, 85.46]] },
    { name: "Road C (Sanga)", positions: [[27.65, 85.46], [27.64, 85.49]] },
    { name: "Road D (Banepa)", positions: [[27.64, 85.49], [27.63, 85.52]] },
  ];

  const getColor = (roadName) => {
    // If in cascade demo mode
    if (mapCascade && currentMapStep >= 0) {
      const stepIdx = mapCascade.findIndex(step => step.road === roadName);
      if (stepIdx !== -1 && stepIdx <= currentMapStep) {
        const colorName = mapCascade[stepIdx].color;
        if (colorName === 'red') return '#ef4444';
        if (colorName === 'orange') return '#f97316';
        if (colorName === 'yellow') return '#eab308';
        if (colorName === 'green') return '#22c55e';
      }
      return '#22c55e'; // Default before cascade reaches it
    }

    // Default simulation data mode
    if (!simulationData) return '#22c55e';
    const congestion = simulationData[roadName];
    if (!congestion) return '#22c55e';
    const percent = parseInt(congestion.replace('%','').replace('+',''));
    if (percent > 40) return '#ef4444'; // red
    if (percent > 20) return '#f97316'; // orange
    return '#eab308'; // yellow
  };

  const getTrafficClass = (roadName) => {
    if (mapCascade && currentMapStep >= 0) {
      const stepIdx = mapCascade.findIndex(step => step.road === roadName);
      if (stepIdx !== -1 && stepIdx <= currentMapStep) {
        return 'cascade-wave';
      }
    }

    let color = getColor(roadName);
    if (color === '#22c55e') return 'animated-traffic-fast';
    if (color === '#eab308') return 'animated-traffic-medium';
    return 'animated-traffic-slow'; // Red/Orange
  };

  return (
    <div className="h-full w-full min-h-[300px] rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-800 relative z-0">
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
      `}</style>
      <div className="absolute inset-0 pointer-events-none border-[4px] border-slate-700/50 rounded-xl z-[400]" />
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 10 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          className="map-tiles"
        />
        {roads.map((road, idx) => (
          <Polyline 
            key={idx} 
            positions={road.positions} 
            color={getColor(road.name)} 
            weight={6}
            opacity={0.9}
            className={getTrafficClass(road.name)}
          >
            <Popup>{road.name}: {simulationData ? simulationData[road.name] || '0%' : 'No congestion'}</Popup>
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapWidget;
