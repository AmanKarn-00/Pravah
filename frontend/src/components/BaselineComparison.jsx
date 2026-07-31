import React from 'react';
import { motion } from 'framer-motion';
import { Route, AlertTriangle, Clock, Shield, DollarSign, Ambulance, TrendingDown, Trophy, X } from 'lucide-react';

const BaselineComparison = ({ comparison }) => {
  if (!comparison) return null;
  
  const { baseline, optimized, improvement_pct, winner, metric, metric_formula } = comparison;
  
  if (!baseline || !optimized) return null;

  const rows = [
    { 
      label: 'Route', 
      icon: Route,
      baseline: baseline.route?.join(' → ') || 'N/A', 
      optimized: optimized.route?.join(' → ') || 'N/A',
      better: null // no comparison for route names
    },
    { 
      label: 'Distance', 
      icon: Route,
      baseline: `${baseline.total_distance_km} km`, 
      optimized: `${optimized.total_distance_km} km`,
      better: baseline.total_distance_km <= optimized.total_distance_km ? 'baseline' : 'optimized'
    },
    { 
      label: 'Travel Time', 
      icon: Clock,
      baseline: `${baseline.travel_time_min} min`, 
      optimized: `${optimized.travel_time_min} min`,
      better: baseline.travel_time_min <= optimized.travel_time_min ? 'baseline' : 'optimized'
    },
    { 
      label: 'Landslide Risk', 
      icon: AlertTriangle,
      baseline: `${Math.round(baseline.actual_landslide_risk * 100)}%`, 
      optimized: `${Math.round(optimized.actual_landslide_risk * 100)}%`,
      better: baseline.actual_landslide_risk <= optimized.actual_landslide_risk ? 'baseline' : 'optimized'
    },
    { 
      label: 'Bridge Failure', 
      icon: Shield,
      baseline: `${Math.round(baseline.actual_bridge_failure_risk * 100)}%`, 
      optimized: `${Math.round(optimized.actual_bridge_failure_risk * 100)}%`,
      better: baseline.actual_bridge_failure_risk <= optimized.actual_bridge_failure_risk ? 'baseline' : 'optimized'
    },
    { 
      label: 'Safety Risk', 
      icon: Shield,
      baseline: `${Math.round(baseline.actual_combined_safety_risk * 100)}%`, 
      optimized: `${Math.round(optimized.actual_combined_safety_risk * 100)}%`,
      better: baseline.actual_combined_safety_risk <= optimized.actual_combined_safety_risk ? 'baseline' : 'optimized'
    },
    { 
      label: 'Ambulance Delay', 
      icon: Ambulance,
      baseline: `+${baseline.ambulance_delay_min} min`, 
      optimized: `+${optimized.ambulance_delay_min} min`,
      better: baseline.ambulance_delay_min <= optimized.ambulance_delay_min ? 'baseline' : 'optimized'
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold text-slate-100 text-lg">Baseline vs. Optimized Comparison</h3>
        {improvement_pct > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
            {improvement_pct}% Better
          </span>
        )}
      </div>

      <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-slate-700">
          <div className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Metric
          </div>
          <div className="p-3 text-center border-l border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center justify-center gap-1.5">
              <X className="w-3 h-3" />
              Naive Baseline
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Shortest path only</div>
          </div>
          <div className="p-3 text-center border-l border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
              <Trophy className="w-3 h-3" />
              PRAVAH Optimized
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Multi-factor terrain-aware</div>
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, idx) => {
          const Icon = row.icon;
          return (
            <div key={idx} className={`grid grid-cols-[1fr_1fr_1fr] ${idx < rows.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
              <div className="p-2.5 flex items-center gap-2 text-xs text-slate-400">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                {row.label}
              </div>
              <div className={`p-2.5 text-center text-sm font-mono border-l border-slate-700/50 ${
                row.better === 'baseline' ? 'text-emerald-400 bg-emerald-500/5' : 
                row.better === 'optimized' ? 'text-red-400' : 'text-slate-300'
              }`}>
                {baseline.risks_ignored && ['Landslide Risk', 'Bridge Failure', 'Safety Risk'].includes(row.label) ? (
                  <span className="text-slate-500 text-xs italic">Ignored ⚠️</span>
                ) : (
                  row.baseline
                )}
              </div>
              <div className={`p-2.5 text-center text-sm font-mono border-l border-slate-700/50 ${
                row.better === 'optimized' ? 'text-emerald-400 bg-emerald-500/5' : 
                row.better === 'baseline' ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {row.optimized}
              </div>
            </div>
          );
        })}

        {/* Score Row */}
        <div className="grid grid-cols-[1fr_1fr_1fr] border-t-2 border-slate-600 bg-slate-900/50">
          <div className="p-3 flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
            <TrendingDown className="w-4 h-4 text-cyan-400" />
            Decision Score
          </div>
          <div className={`p-3 text-center text-lg font-bold font-mono border-l border-slate-700/50 ${
            winner === 'baseline' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {baseline.risk_adjusted_score}
          </div>
          <div className={`p-3 text-center text-lg font-bold font-mono border-l border-slate-700/50 ${
            winner === 'optimized' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {optimized.risk_adjusted_score}
            {winner === 'optimized' && (
              <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">✓ WINNER</span>
            )}
          </div>
        </div>

        {/* Formula */}
        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/30">
          <p className="text-[10px] text-slate-500 font-mono">{metric_formula}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metric} — Lower score = better decision</p>
        </div>

        {/* Factors Applied */}
        {optimized.factors_applied && optimized.factors_applied.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700/50 bg-emerald-500/5">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Optimization Factors Applied</p>
            <div className="flex flex-wrap gap-1.5">
              {optimized.factors_applied.map((f, i) => (
                <span key={i} className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BaselineComparison;
