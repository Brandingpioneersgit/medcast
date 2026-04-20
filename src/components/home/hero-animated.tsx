"use client";

import { motion } from "framer-motion";
import { Sparkles, MapPin, Stethoscope, Shield } from "lucide-react";
import { Link } from "@/lib/i18n/routing";

export function HeroAnimated({ hospitalCount, countryCount }: { hospitalCount: string, countryCount: number }) {
  return (
    <section className="relative w-full h-[100vh] min-h-[800px] flex items-center justify-center overflow-hidden bg-black text-white">
      {/* 3D Background */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 z-0 bg-[url('/images/hero_abstract_medical_1776416832611.png')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ filter: "brightness(0.8) contrast(1.2)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full flex flex-col items-center text-center mt-20">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-8 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
        >
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium tracking-wide text-gray-300">Connecting you with {hospitalCount} elite global facilities</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-heading text-6xl md:text-8xl font-bold tracking-tighter leading-[1.05] mb-8"
        >
          The World's Elite<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-emerald-400 to-teal-600 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            Medical Care.
          </span><br/>
          Borderless.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl font-light tracking-wide mb-14 leading-relaxed"
        >
          Gain priority access to JCI-accredited institutions, world-renowned specialists, and transparent global pricing. Zero hidden costs.
        </motion.p>

        {/* Apple-style floating spotlight search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="w-full max-w-3xl bg-surface/40 backdrop-blur-3xl rounded-[2rem] p-2 border border-white/10 shadow-glass flex flex-col sm:flex-row gap-2"
        >
          <div className="flex-1 flex items-center bg-black/40 rounded-[1.5rem] px-5 py-4 border border-transparent focus-within:border-brand-500/50 transition-colors">
            <Stethoscope className="text-brand-400 w-5 h-5 me-4" />
            <select className="w-full bg-transparent border-none p-0 focus:ring-0 text-white text-[15px] outline-none appearance-none cursor-pointer">
              <option value="" disabled selected>Search condition or specialty...</option>
              <option value="cardiac-surgery">Cardiac Surgery</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="oncology">Oncology</option>
              <option value="neurology">Neurology</option>
            </select>
          </div>
          <div className="flex-1 flex items-center bg-black/40 rounded-[1.5rem] px-5 py-4 border border-transparent focus-within:border-brand-500/50 transition-colors">
            <MapPin className="text-brand-400 w-5 h-5 me-4" />
            <select className="w-full bg-transparent border-none p-0 focus:ring-0 text-white text-[15px] outline-none appearance-none cursor-pointer">
              <option value="" disabled selected>Select destination...</option>
              <option value="india">India</option>
              <option value="turkey">Turkey</option>
              <option value="singapore">Singapore</option>
            </select>
          </div>
          <Link
            href="/hospitals"
            className="bg-ink text-black px-8 py-4 rounded-[1.5rem] hover:bg-brand-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-all duration-500 font-semibold flex items-center justify-center shrink-0"
          >
            Find Care
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
