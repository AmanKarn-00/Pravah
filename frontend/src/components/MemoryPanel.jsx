import React from 'react';
import { Database, Search, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const MemoryPanel = ({ memory }) => {
  if (!memory || !Array.isArray(memory) || memory.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden mb-6"
    >
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          RAG Memory Context
        </h3>
        <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">
          VECTOR SEARCH
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        {memory.map((item, idx) => (
          <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
            
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-slate-800 p-2 rounded-md border border-slate-700">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-slate-200">Previous Similar Event</h4>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.date || 'Historical'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 italic mb-2">"{item.event || item.query}"</p>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-3 mt-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1 block">Past Resolution</span>
                  <p className="text-sm text-indigo-100">{item.resolution || item.result}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default MemoryPanel;
