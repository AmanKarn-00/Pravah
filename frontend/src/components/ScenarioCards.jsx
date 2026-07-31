import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Scale, Zap, Clock, AlertTriangle, MapPin, ChevronDown, ChevronUp, Star } from 'lucide-react';

const tagConfig = {
  'Safest': { 
    icon: Shield, 
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    riskColor: 'text-emerald-400',
  },
  'Balanced': { 
    icon: Scale, 
    gradient: 'from-amber-500 to-yellow-600',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.12)]',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    riskColor: 'text-amber-400',
  },
  'Least Disruptive': { 
    icon: Zap, 
    gradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.12)]',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    riskColor: 'text-cyan-400',
  },
};

const riskColors = {
  'Low': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'High': 'bg-red-500/15 text-red-400 border-red-500/30',
};

const ScenarioCard = ({ scenario, index, isRecommended }) => {
  const [expanded, setExpanded] = useState(false);
  const config = tagConfig[scenario.tag] || tagConfig['Balanced'];
  const TagIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
      className={`relative rounded-xl overflow-hidden ${config.border} border ${config.bg} ${config.glow} backdrop-blur-sm`}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-lg">
            <Star className="w-2.5 h-2.5" /> Recommended
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
            <TagIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">{scenario.label}</span>
            <h3 className={`text-sm font-bold ${config.accent}`}>{scenario.tag}</h3>
          </div>
        </div>

        {/* Action */}
        <p className="text-slate-200 text-sm font-medium mb-3 leading-snug">{scenario.action}</p>

        {/* Data Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Travel Impact */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Travel Impact</span>
            </div>
            <p className="text-slate-200 text-sm font-bold">{scenario.travel_impact}</p>
          </div>

          {/* Safety Risk */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 text-slate-500" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Safety Risk</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${riskColors[scenario.safety_risk] || riskColors['Medium']}`}>
              {scenario.safety_risk}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="px-4 pb-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 py-2 transition-colors uppercase tracking-widest font-medium"
        >
          {expanded ? 'Less' : 'Details'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2.5">
              {/* Detour Route */}
              {scenario.detour_route && (
                <div className="flex items-start gap-2 bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/20">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium block mb-0.5">Detour Route</span>
                    <p className="text-slate-300 text-xs">{scenario.detour_route}</p>
                  </div>
                </div>
              )}
              {/* Rationale */}
              {scenario.rationale && (
                <div className={`text-xs italic border-l-2 ${config.border} pl-3 py-1 text-slate-400`}>
                  "{scenario.rationale}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ScenarioCards = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-violet-500/30">
          <Scale className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Actionable Scenarios</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Data-backed decision options</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map((scenario, idx) => (
          <ScenarioCard 
            key={scenario.label} 
            scenario={scenario} 
            index={idx}
            isRecommended={idx === 0}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ScenarioCards;
