import React from 'react';
import { motion } from 'framer-motion';

const ExpertPanel = ({ title, recommendation, reason, icon: Icon, colorClass }) => {
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
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Recommendation</h4>
          <p className="text-slate-200 text-sm">{recommendation}</p>
        </div>
        <div>
          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Reason</h4>
          <p className="text-slate-300 text-sm italic border-l-2 border-slate-600 pl-3 py-1">"{reason}"</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ExpertPanel;
