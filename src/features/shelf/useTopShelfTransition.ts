import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type StepKey = "home" | "address" | "amount";

const STEP_FROM_PATH = (path: string, step?: number): StepKey => {
  // Check for amount step (step 2 of request flow)
  if (path.includes("/customer/request")) {
    // If step is provided and is 2, we're on amount step
    if (step === 2) {
      return "amount";
    }
    // Otherwise default to address (step 1)
    return "address";
  }
  if (path.includes("/customer/addresses")) {
    return "address";
  }
  return "home";
};

type Options = {
  minBase?: number;          // floor height
  settleDelayMs?: number;    // min dwell for skeletons
};

export function useTopShelfTransition(opts: Options & { currentStep?: number } = {}) {
  const { minBase = 148, settleDelayMs = 220, currentStep } = opts;
  const location = useLocation();
  const navigate = useNavigate();
  const currKey = STEP_FROM_PATH(location.pathname, currentStep);
  const [nextKey, setNextKey] = useState<StepKey | null>(null);

  // cache measured heights per step so back nav is instant
  const heightCache = useRef(new Map<StepKey, number>());
  const [reservedMinH, setReservedMinH] = useState<number>(minBase);
  const [phase, setPhase] = useState<"idle"|"reserve"|"swap"|"settle">("idle");

  // callers attach this ref to the shelf's content wrapper to measure current height
  const measureRef = useRef<HTMLDivElement | null>(null);
  const measure = () => Math.ceil(measureRef.current?.getBoundingClientRect().height || 0);

  // measure current on mount/changes and cache it
  useLayoutEffect(() => {
    const h = measure();
    if (h > 0) {
      heightCache.current.set(currKey, h);
      // Only update reservedMinH if we're idle (not transitioning)
      if (phase === "idle") {
        setReservedMinH(Math.max(minBase, h));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currKey, currentStep]);

  function estimateHeightFor(step: StepKey, fallback = minBase) {
    return Math.max(minBase, heightCache.current.get(step) ?? fallback);
  }

  // public API: call before navigation to the next step (on tap of Continue)
  function prepare(next: StepKey, fallback?: number) {
    if (phase !== "idle") return;
    
    setNextKey(next);
    const currH = measure();
    const nextH = estimateHeightFor(next, fallback ?? minBase);
    setReservedMinH(Math.max(minBase, currH, nextH));
    setPhase("reserve");
    
    // give the shelf a tick to resize before swapping content
    // For route changes, goTo will navigate and route change effect handles swap
    // For step changes, the step change effect will handle swap
    // So we don't auto-swap here - let the appropriate effect handle it
  }

  // finalize after route actually changed (Router effect below)
  function settle() {
    // keep skeleton at least settleDelayMs to avoid flash
    setTimeout(() => {
      const h = measure();
      if (h > 0) {
        const currentStepKey = STEP_FROM_PATH(location.pathname, currentStep);
        heightCache.current.set(currentStepKey, h);
        setReservedMinH(Math.max(minBase, h));
      }
      setPhase("idle");
      setNextKey(null);
    }, settleDelayMs);
  }

  // Track previous pathname to detect route changes
  const prevPathnameRef = useRef(location.pathname);
  const phaseRef = useRef(phase);
  
  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  
  // when the route changes, run settle phase
  useEffect(() => {
    const pathnameChanged = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;
    
    if (pathnameChanged) {
      if (phaseRef.current === "reserve") {
        // Route changed while in reserve phase, move to swap
        setPhase("swap");
        setTimeout(() => {
          setPhase("settle");
          settle();
        }, 50);
      } else if (phaseRef.current === "swap") {
        // Already in swap, just settle
        setPhase("settle");
        settle();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Also handle step changes within the same route (for CashRequest step 1 <-> step 2)
  const prevStepRef = useRef<number | undefined>(currentStep);
  useEffect(() => {
    if (currentStep !== undefined && prevStepRef.current !== undefined && currentStep !== prevStepRef.current) {
      // Step changed within same route
      if (phase === "reserve") {
        // We're already in reserve phase, move to swap after a brief delay
        setTimeout(() => {
          setPhase("swap");
          // Then settle after content has swapped
          setTimeout(() => {
            setPhase("settle");
            settle();
          }, 50);
        }, 50);
      }
    }
    prevStepRef.current = currentStep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // convenience helpers for screens
  function goTo(nextPath: string, step: StepKey, fallback?: number) {
    prepare(step, fallback);
    // push route just after reserve kicks in
    // Route change effect will handle moving to swap phase
    setTimeout(() => navigate(nextPath), 120);
  }

  return {
    currKey,
    nextKey,
    phase,                // "idle" | "reserve" | "swap" | "settle"
    reservedMinH,         // bind to shelf container minHeight
    measureRef,           // attach to inner content wrapper
    prepare,
    goTo,
    estimateHeightFor,
    measure,              // expose measure function if needed
  };
}

