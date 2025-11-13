import React, { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";

type HeightCache = Map<string, number>;

type Ctx = {
  get: (key: string) => number | undefined;
  set: (key: string, h: number) => void;
};

const TopShelfHeightCtx = createContext<Ctx | null>(null);

export function TopShelfHeightProvider({ children }: { children: React.ReactNode }) {
  const cache = useMemo<HeightCache>(() => new Map(), []);
  
  const ctx = useMemo<Ctx>(() => ({
    get: (k) => cache.get(k),
    set: (k, h) => { if (Number.isFinite(h)) cache.set(k, h); },
  }), [cache]);
  
  return <TopShelfHeightCtx.Provider value={ctx}>{children}</TopShelfHeightCtx.Provider>;
}

export function useTopShelfHeightCache() {
  const ctx = useContext(TopShelfHeightCtx);
  if (!ctx) throw new Error("useTopShelfHeightCache must be used inside TopShelfHeightProvider");
  return ctx;
}

/** Renders children off-screen to measure height (once), then calls onMeasure */
export function OffscreenMeasure({
  measureKey,
  className = "max-w-[720px] w-full", // match shelf inner width
  children,
  onMeasure,
}: {
  measureKey: string;
  className?: string;
  children: React.ReactNode;
  onMeasure: (h: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Use requestAnimationFrame to ensure layout is complete
    const rafId = requestAnimationFrame(() => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) {
        onMeasure(Math.ceil(h));
      }
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [measureKey, onMeasure]);

  return (
    <div
      aria-hidden
      ref={ref}
      className={className}
      style={{
        position: "fixed",
        top: -99999,
        left: 0,
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      {children}
    </div>
  );
}

