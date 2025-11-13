import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { useMeasure } from "@/hooks/useMeasure";

type Props = {
  idKey: string; // change this per route/section to trigger content swap
  children: React.ReactNode;
  className?: string;
};

// A morphing white container: animates its height only, fades content in/out.
// Children themselves don't reposition-animate (we set layout={false} by default).
export function TopShelf({ idKey, children, className }: Props) {
  const { ref, height } = useMeasure<HTMLDivElement>();

  return (
    <motion.section
      className={["rounded-2xl bg-white shadow-sm top-shelf", className].filter(Boolean).join(" ")}
      style={{ overflow: "hidden", willChange: "height" }}
      // animate the container height only
      initial={false}
      animate={{ height }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      // prevents children from applying transform-based layout moves
      layout={false}
      // Allow className to override bg-white if needed (e.g., dark theme)
    >
      {/* Measuring wrapper */}
      <div ref={ref}>
        <AnimatePresence mode="wait">
          <motion.div
            // key must change when content changes (route or title)
            key={idKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            // disable layout animation on inner content
            layout={false}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

