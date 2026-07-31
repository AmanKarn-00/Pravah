import React from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';

const ScenarioPanel = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) return null;

  const tagColors = {
    'Safest': { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: Shield },
    'Balanced': { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: Scale },
    'Least Disruptive': { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', icon: TrendingUp },
  };

  const riskColors = {
    'Low': 'text-emerald-400 bg-emerald-500/15',
    'Medium': 'text-amber-400 bg-amber-500/15',
    'High': 'text-red-400 bg-red-500/15',
    'Critical': 'text-red-500 bg-red-500/20',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-slate-100 text-lg">Decision Scenarios</h3>
        <span className="text-xs text-slate-500 ml-2">Compare trade-offs</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map((scenario, idx) => {
          const style = tagColors[scenario.tag] || tagColors['Balanced'];
          const TagIcon = style.icon;
          const riskStyle = riskColors[scenario.safety_risk] || riskColors['Medium'];
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className={`${style.bg} rounded-xl border ${style.border} p-4 relative overflow-hidden group hover:scale-[1.02] transition-transform`}
            >
              {/* Tag */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TagIcon className={`w-4 h-4 ${style.text}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                    {scenario.label}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${style.text} ${style.bg} border ${style.border}`}>
                  {scenario.tag}
                </span>
              </div>

              {/* Action */}
              <p className="text-sm font-semibold text-slate-200 mb-4 leading-snug min-h-[40px]">
                {scenario.action}
              </p>

              {/* Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Travel Impact
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {scenario.travel_impact}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Safety Risk
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskStyle}`}>
                    {scenario.safety_risk}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> Economic Cost
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {scenario.economic_cost}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ScenarioPanel;
