"use client";

import React from "react";

/**
 * Clean Light Mode Technical Background
 * Follows Global Rules: Light mode (#F8FAFC), crisp contrast, 0 external image dependencies, zero glassmorphism.
 */
export const CyberBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#F8FAFC]">
      {/* 1. Subtle Precision Grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0F172A 1px, transparent 1px),
            linear-gradient(to bottom, #0F172A 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      {/* 2. Soft top glow for hierarchy */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-amber-100/40 via-slate-100/20 to-transparent blur-2xl rounded-full" />
    </div>
  );
};
