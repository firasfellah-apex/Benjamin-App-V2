/**
 * CustomerPageTitle Component
 * 
 * Animated page title with smooth morphing between states.
 * Provides calm, soft transitions for title and subtitle changes.
 */

import { motion, AnimatePresence } from "framer-motion";

interface CustomerPageTitleProps {
  title: string;
  subtitle?: string;
  titleKey?: string; // unique key for title changes
}

export function CustomerPageTitle({ title, subtitle, titleKey }: CustomerPageTitleProps) {
  return (
    <>
      <AnimatePresence mode="wait">
        <motion.h1
          key={`title-${titleKey || title}`}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{
            duration: 0.35,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="text-[24px] font-semibold leading-tight"
        >
          {title}
        </motion.h1>
      </AnimatePresence>
      
      {subtitle && (
        <AnimatePresence mode="wait">
          <motion.p
            key={`subtitle-${titleKey || subtitle}`}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{
              duration: 0.35,
              ease: [0.34, 1.56, 0.64, 1],
              delay: 0.05,
            }}
            className="text-[16px] text-[#6b7280] mt-1"
          >
            {subtitle}
          </motion.p>
        </AnimatePresence>
      )}
    </>
  );
}

