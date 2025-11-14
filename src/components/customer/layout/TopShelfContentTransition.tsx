import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface TopShelfContentTransitionProps {
  stepKey: string; // e.g. "home", "address", "amount"
  children: React.ReactNode;
}

/**
 * Global transition wrapper for top-shelf content.
 * 
 * Provides a simple, consistent fade/slide transition for all customer steps.
 * No layout animations - just opacity and a tiny Y offset for smoothness.
 */
export function TopShelfContentTransition({ 
  stepKey, 
  children 
}: TopShelfContentTransitionProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div>{children}</div>;
  }

  const stepVariants = {
    enter: { opacity: 0, y: 8 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.18,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

