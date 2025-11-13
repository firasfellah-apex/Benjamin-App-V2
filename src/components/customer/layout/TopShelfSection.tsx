import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTopShelfTransition } from "@/features/shelf/useTopShelfTransition";
import { Skeleton } from "@/components/common/Skeleton";

type Props = {
  loading?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

/** Silky, shared-layout top-shelf content with phase-based transitions & no layout shift. */
export default function TopShelfSection({
  loading,
  title,
  subtitle,
  actions,
  children,
}: Props) {
  const prefersReduced = useReducedMotion();
  const shelf = useTopShelfTransition({ minBase: 168, settleDelayMs: 240 });

  const transition = prefersReduced
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26, mass: 0.6 };

  const fade = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition },
    exit: { opacity: 0, y: -6, transition: { duration: 0.16 } },
  };

  // Show skeleton during reserve phase or when data is loading
  const showSkeleton = shelf.phase === "reserve" || (loading && shelf.phase !== "idle" && shelf.phase !== "swap");

  return (
    <>
      {/* Title row */}
      <motion.header layout="position" className="flex items-start justify-between gap-3 mb-3">
        <motion.div layoutId="ts-title" layout="position">
          {showSkeleton ? (
            <>
              <div className="h-7 w-2/5 animate-pulse rounded bg-slate-100 mb-2" />
              <div className="h-5 w-1/4 animate-pulse rounded bg-slate-100" />
            </>
          ) : (
            <>
              {title ? (
                <motion.h1
                  layoutId="ts-h1"
                  layout="position"
                  className="text-[22px] sm:text-[24px] font-semibold leading-tight tracking-tight text-slate-900"
                  transition={transition}
                >
                  {title}
                </motion.h1>
              ) : null}
              {subtitle ? (
                <motion.p
                  layoutId="ts-sub"
                  layout="position"
                  className="mt-1.5 text-[16px] sm:text-[17px] text-slate-500 leading-snug"
                  transition={transition}
                >
                  {subtitle}
                </motion.p>
              ) : null}
            </>
          )}
        </motion.div>

        <motion.div layoutId="ts-actions" layout="position" className="shrink-0">
          {showSkeleton ? (
            <div className="h-12 w-44 animate-pulse rounded-full bg-slate-100" />
          ) : (
            actions
          )}
        </motion.div>
      </motion.header>

      {/* Content wrapper we measure */}
      <div ref={shelf.measureRef}>
        <AnimatePresence mode="wait">
          {(shelf.phase === "idle" || shelf.phase === "swap" || shelf.phase === "settle") && (
            <motion.div
              key={`content-${shelf.currKey}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={fade}
              transition={transition}
              className="mt-6"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightweight structure skeleton while settling or when data not ready */}
        {shelf.phase === "reserve" && (
          <div className="space-y-3 mt-6">
            <div className="h-5 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-slate-100" />
            <div className="h-12 w-44 animate-pulse rounded-full bg-slate-100" />
          </div>
        )}
      </div>
    </>
  );
}

