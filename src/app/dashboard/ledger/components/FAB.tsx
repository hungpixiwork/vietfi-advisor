'use client';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export default function FAB({ onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1, rotate: 90 }}
      className="fixed bottom-24 right-4 md:bottom-28 md:right-6 w-14 h-14 bg-[#22C55E] rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.4)]
                 flex items-center justify-center text-3xl text-black font-black z-50 transition-all duration-300 border border-white/20"
      animate={{
        boxShadow: ["0 0 20px rgba(34,197,94,0.3)", "0 0 40px rgba(34,197,94,0.6)", "0 0 20px rgba(34,197,94,0.3)"]
      }}
      transition={{
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <Plus className="w-8 h-8" />
    </motion.button>
  );
}
