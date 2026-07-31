import React from 'react';
import { Activity, CloudRain, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import CountUpModule from 'react-countup';
const CountUp = CountUpModule.default || CountUpModule;

const EvidencePanel = ({ evidence }) => {
  if (!evidence) return null;

  const parseValue = (str) => {
    if (!str) return { val: 0, prefix: '', suffix: '' };
    const numMatch = str.match(/([+-]?\d+(?:\.\d+)?)/);
    if (!numMatch) return { val: 0, prefix: '', suffix: str };
    
    const num = parseFloat(numMatch[1]);
    const index = str.indexOf(numMatch[1]);
    const prefix = str.substring(0, index);
    const suffix = str.substring(index + numMatch[1].length);
    
    return { val: num, prefix, suffix };
  };

  const bridgeStatus = parseValue(evidence.bridge?.status);
  const bridgeMax = parseValue(evidence.bridge?.max);
  const weatherRain = parseValue(evidence.weather?.rain);
  const simIncrease = parseValue(evidence.simulation?.increase);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden mb-6"
    >
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
          Evidence & Analysis Context
        </h3>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bridge Stats */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Bridge Capacity</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${evidence.bridge?.result === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {evidence.bridge?.result || 'UNKNOWN'}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Current Load</span>
                <span className="font-bold text-slate-200">
                  <CountUp end={bridgeStatus.val} prefix={bridgeStatus.prefix} suffix={bridgeStatus.suffix} duration={2} />
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${Math.min((bridgeStatus.val / Math.max(bridgeMax.val, 1)) * 100, 100)}%` }} 
                  transition={{ duration: 1.5, delay: 0.5 }}
                  className={`h-full ${evidence.bridge?.result === 'PASS' ? 'bg-emerald-500' : 'bg-red-500'}`} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Max Rating</span>
                <span className="font-bold text-slate-400">
                  <CountUp end={bridgeMax.val} prefix={bridgeMax.prefix} suffix={bridgeMax.suffix} duration={2} />
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: '100%' }} 
                  transition={{ duration: 1.5 }}
                  className="h-full bg-slate-600" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Weather Risk */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-sm font-medium uppercase">Weather Risk</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">{evidence.weather?.risk}</span>
          </div>
          <div className="flex items-center gap-3">
            <CloudRain className="w-8 h-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-slate-200">
                <CountUp end={weatherRain.val} prefix={weatherRain.prefix} suffix={weatherRain.suffix} duration={2} />
              </p>
              <p className="text-xs text-slate-500">{evidence.weather?.condition}</p>
            </div>
          </div>
        </div>

        {/* Simulation Impact */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-sm font-medium uppercase">Network Impact</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold text-amber-400">
                <CountUp end={simIncrease.val} prefix={simIncrease.prefix} suffix={simIncrease.suffix} duration={2} />
              </p>
              <p className="text-xs text-slate-500">Congestion Increase</p>
            </div>
            <div className="text-right max-w-[50%]">
              <p className="text-sm font-medium text-slate-300 truncate">{evidence.simulation?.worst_road}</p>
              <p className="text-xs text-slate-500">Critical Path</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EvidencePanel;
