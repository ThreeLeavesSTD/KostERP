"use client";

import React, { useEffect, useState } from "react";
import { Inbox, MessageCircle, Calendar, Handshake, CheckCircle2 } from "lucide-react";
import { Lead } from "@/types";

interface SequentialPipelineFunnelProps {
  leads: Lead[];
}

interface FunnelNode {
  id: string;
  title: string;
  shortLabel: string;
  icon: React.ElementType;
  count: number;
  percentage: number;
  activeColor: string;
}

export function SequentialPipelineFunnel({ leads }: SequentialPipelineFunnelProps) {
  const [orbStep, setOrbStep] = useState<number>(0);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  // Calculate clean stage counts and conversion proportions
  const total = leads.length || 1;
  const newCount = leads.filter((l) => l.status === "new").length;
  const contactedCount = leads.filter((l) => l.status === "contacted" || l.status === "follow_up").length;
  const surveyCount = leads.filter((l) => l.status === "survey_scheduled" || l.status === "survey_done").length;
  const negotiationCount = leads.filter((l) => l.status === "negotiation").length;
  const wonCount = leads.filter((l) => l.status === "won").length;

  const nodes: FunnelNode[] = [
    {
      id: "new",
      title: "Inbound Baru",
      shortLabel: "Inbound",
      icon: Inbox,
      count: newCount,
      percentage: Math.round((newCount / total) * 100),
      activeColor: "#38BDF8",
    },
    {
      id: "contacted",
      title: "Kontak & Follow",
      shortLabel: "Kontak",
      icon: MessageCircle,
      count: contactedCount,
      percentage: Math.round((contactedCount / total) * 100),
      activeColor: "#F59E0B",
    },
    {
      id: "survey",
      title: "Jadwal Survey",
      shortLabel: "Survey",
      icon: Calendar,
      count: surveyCount,
      percentage: Math.round((surveyCount / total) * 100),
      activeColor: "#818CF8",
    },
    {
      id: "negotiation",
      title: "Negosiasi",
      shortLabel: "Review",
      icon: Handshake,
      count: negotiationCount,
      percentage: Math.round((negotiationCount / total) * 100),
      activeColor: "#C084FC",
    },
    {
      id: "won",
      title: "Closing / Won",
      shortLabel: "Deal",
      icon: CheckCircle2,
      count: wonCount,
      percentage: Math.round((wonCount / total) * 100),
      activeColor: "#10B981",
    },
  ];

  // Determine target node: default to Won if present, else highest active stage with leads
  const targetIndex = wonCount > 0 ? 4 : negotiationCount > 0 ? 3 : surveyCount > 0 ? 2 : contactedCount > 0 ? 1 : 0;

  // Sequential Step-by-Step Travel on initial mount
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < targetIndex) {
        current += 1;
        setOrbStep(current);
      } else {
        clearInterval(interval);
        setHasArrived(true);
      }
    }, 420);

    return () => clearInterval(interval);
  }, [targetIndex]);

  // Position percentage of current orb along the 0%..100% line
  const orbProgressPercent = (orbStep / (nodes.length - 1)) * 100;

  return (
    <div className="rounded-3xl border border-white/80 bg-white p-4 sm:p-6 shadow-spatial dark:bg-[#111218] dark:border-white/10 overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#D9FF43] shadow-[0_0_8px_#D9FF43]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
            Sequential Conversion Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          <span>{leads.length} Total Prospek</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{wonCount} Closing Won</span>
        </div>
      </div>

      {/* Track & Node Stream */}
      <div className="relative pt-3 pb-2 px-2 sm:px-6">
        {/* Background Connecting Axis Line */}
        <div className="absolute top-[28px] sm:top-[30px] left-6 right-6 h-[2px] bg-neutral-200 dark:bg-white/10" />

        {/* Highlighted Flow Track */}
        <div
          className="absolute top-[28px] sm:top-[30px] left-6 h-[2px] bg-gradient-to-r from-[#38BDF8] via-[#D9FF43] to-[#10B981] transition-all duration-500 ease-out"
          style={{ width: `calc((100% - 48px) * ${orbStep / (nodes.length - 1)})` }}
        />

        {/* Traveling & Orbiting Indicator Orb */}
        <div
          className="absolute top-[23px] sm:top-[25px] left-6 transition-all duration-500 ease-out pointer-events-none"
          style={{
            transform: `translateX(calc(((100% - 48px) * ${orbStep / (nodes.length - 1)}) - 6px))`,
          }}
        >
          <div
            className={`h-3 w-3 rounded-full bg-[#D9FF43] shadow-[0_0_12px_#D9FF43] ${
              hasArrived ? "animate-[stageNodeOrbit_3s_linear_infinite]" : "scale-110"
            }`}
          />
        </div>

        {/* The 5 Sequential Stage Anchors */}
        <div className="relative flex items-start justify-between">
          {nodes.map((node, idx) => {
            const Icon = node.icon;
            const isReached = idx <= orbStep;
            const isTarget = idx === targetIndex && hasArrived;

            return (
              <div key={node.id} className="flex flex-col items-center text-center group cursor-default">
                {/* Stage Anchor Ring */}
                <div
                  className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                    isTarget
                      ? "border-[#D9FF43] bg-[#0B0C0E] text-[#D9FF43] shadow-[0_0_14px_rgba(217,255,67,0.4)] scale-110"
                      : isReached
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-400 dark:border-white/20 dark:bg-[#18181B] dark:text-neutral-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>

                {/* Stage Geometric Label & Proportions */}
                <div className="mt-2.5 space-y-0.5">
                  <p className="text-[10px] sm:text-xs font-black text-neutral-900 dark:text-white leading-tight">
                    <span className="hidden sm:inline">{node.title}</span>
                    <span className="sm:hidden">{node.shortLabel}</span>
                  </p>
                  <div className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                    <span>{node.count}</span>
                    <span className="opacity-40">•</span>
                    <span className={node.percentage > 0 ? "text-neutral-800 dark:text-neutral-200" : ""}>
                      {node.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
