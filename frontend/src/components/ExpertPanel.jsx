import React from 'react';
import { motion } from 'framer-motion';

const ExpertPanel = ({ title, recommendation, reason, confidence, icon: Icon, colorClass }) => {
  if (!recommendation) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden"
    >
      <div className={`p-3 border-b border-slate-700 flex items-center gap-2 ${colorClass}`}>
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Recommendation</h4>
          <p className="text-slate-200 text-sm">{recommendation}</p>
        </div>
        <div>
          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Reason</h4>
          <p className="text-slate-300 text-sm italic border-l-2 border-slate-600 pl-3 py-1">"{reason}"</p>
        </div>
        <div className="flex flex-col mt-2 pt-3 border-t border-slate-700/50 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Confidence Score</span>
            <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded bg-slate-900 ${colorClass.split(' ')[1]}`}>
              {confidence}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${parseInt(confidence) || 0}%` }} 
              transition={{ duration: 1.5, delay: 0.2 }}
              className={`h-full ${colorClass.split(' ')[0].replace('/10', '').replace('bg-', 'bg-')}`}
              style={{ backgroundColor: colorClass.includes('cyan') ? '#06b6d4' : '#f97316' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ExpertPanel;
