"use client";

import { motion } from "framer-motion";
import { Link } from "@/lib/i18n/routing";
import { ArrowRight } from "lucide-react";

export function SpecialtiesAnimated() {
  const specialties = [
    { name: "Cardiac Surgery", label: "World-leading technology", colSpan: "col-span-1 md:col-span-2", rowSpan: "row-span-2", img: "/images/cardiology_3d_icon_1776416847381.png", slug: "cardiac-surgery" },
    { name: "Neurology", label: "Precision neural care", colSpan: "col-span-1 md:col-span-2", rowSpan: "row-span-1", img: "/images/neurology_3d_icon_1776416862318.png", slug: "neurology-neurosurgery" },
    { name: "Orthopedics", label: "Advanced mobility", colSpan: "col-span-1", rowSpan: "row-span-1", img: "/images/Ortho.png", slug: "orthopedics" },
    { name: "Oncology", label: "Targeted tumor therapies", colSpan: "col-span-1", rowSpan: "row-span-1", img: "/images/oncology-new.png", slug: "oncology" },
  ];

  return (
    <section className="bg-black py-32 border-t border-white/5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-900/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-brand-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Centers of Excellence</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white tracking-tight">Specialized Care.<br/>Elevated.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
          {specialties.map((spec, i) => (
            <motion.div
              key={spec.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7 }}
              className={`${spec.colSpan} ${spec.rowSpan} group`}
            >
              <Link
                href={`/specialty/${spec.slug}`}
                className="relative block w-full h-full bg-surface-elevated rounded-[2.5rem] border border-white/5 overflow-hidden transition-all duration-700 hover:border-brand-500/30 hover:bg-surface p-8 min-h-[250px]"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10" />
                <div className="relative z-20 flex flex-col h-full justify-end">
                  <h3 className="text-2xl lg:text-3xl font-heading font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">{spec.name}</h3>
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">{spec.label}</p>
                </div>
                
                {/* 3D Icon Image */}
                <motion.img
                  src={spec.img}
                  alt={spec.name}
                  className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 lg:right-0 lg:translate-x-1/4 h-[120%] lg:h-[150%] object-contain opacity-40 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700 pointer-events-none mix-blend-screen"
                />

                <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center z-20 bg-black/30 backdrop-blur-md group-hover:bg-brand-500 group-hover:border-brand-400 transition-all duration-500">
                  <ArrowRight className="w-5 h-5 text-white group-hover:-rotate-45 transition-transform duration-500" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
