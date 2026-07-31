import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const ClarificationModal = ({ clarification, onResolve }) => {
  const [inputValue, setInputValue] = useState('');

  if (!clarification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md transition-all duration-700">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-[0_0_100px_rgba(245,158,11,0.2)] p-8 max-w-2xl w-full mx-4 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        
        <div className="flex items-start gap-4 mb-8">
          <div className="bg-amber-500/10 p-4 rounded-full shrink-0 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-pulse">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-50 mb-3 tracking-tight">Critical Input Required</h2>
            <p className="text-slate-300 text-lg leading-relaxed">{clarification.question}</p>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-lg p-5 mb-8 flex items-center justify-between border border-slate-800">
          <span className="text-slate-400 font-medium text-sm uppercase tracking-wider">Current AI Confidence</span>
          <div className="flex items-center gap-3">
             <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${clarification.confidence}%` }} 
                  className="h-full bg-amber-500" 
                />
             </div>
             <span className="text-2xl font-bold text-amber-400 font-mono">{clarification.confidence}%</span>
          </div>
        </div>

        <div className="mb-8">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Provide required details..."
            className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl p-5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors text-xl font-medium shadow-inner"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim() !== '') {
                onResolve(`Provided Details: ${inputValue}`);
              }
            }}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              if (inputValue.trim() !== '') {
                onResolve(`Provided Details: ${inputValue}`);
              } else {
                onResolve("Provide Details");
              }
            }}
            className="flex items-center justify-center gap-3 p-5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-900 text-amber-500 transition-all font-bold text-lg"
          >
            Submit Data to Resume
          </button>
          
          <button
            onClick={() => onResolve("Ignore Bridge Check")}
            className="flex items-center justify-center gap-3 p-5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 text-slate-300 transition-all font-medium text-lg"
          >
            Override & Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ClarificationModal;
