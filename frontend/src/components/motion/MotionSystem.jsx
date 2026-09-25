import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { transitions } from "./transitions.js";

export { transitions };

/**
 * PageTransition: Snappy, subtle vertical fade for route changes
 */
export function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={transitions.page}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeIn: Controlled entrance with optional direction
 */
export function FadeIn({
  children,
  delay = 0,
  direction = "up", // 'up' | 'down' | 'none'
  duration = 0.26,
  className = "",
  viewportOnce = true,
  onScroll = false,
}) {
  const yOffset = direction === "up" ? 8 : direction === "down" ? -8 : 0;

  const animationProps = onScroll
    ? {
        initial: { opacity: 0, y: yOffset },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: viewportOnce, margin: "-30px" },
      }
    : {
        initial: { opacity: 0, y: yOffset },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <motion.div
      {...animationProps}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer & StaggerItem: Coordinated list / grid appearances
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.04,
  initialDelay = 0,
  className = "",
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }) {
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * AnimatedCard: Subtle elevation and border refinement on hover
 * Avoids huge scale; applies clean, professional feedback.
 */
export function AnimatedCard({
  children,
  className = "",
  onClick,
  hoverable = true,
  interactive = false,
  role,
  tabIndex,
  onKeyDown,
}) {
  return (
    <motion.div
      whileHover={
        hoverable
          ? {
              y: -2,
              transition: { duration: 0.18, ease: "easeOut" },
            }
          : undefined
      }
      whileTap={
        interactive
          ? {
              scale: 0.995,
              transition: { duration: 0.1 },
            }
          : undefined
      }
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      className={`transition-colors duration-150 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedButton: Micro-interaction with hover elevation & tap compression
 */
export function AnimatedButton({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary, secondary, outline, ghost, danger
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  icon: Icon,
  iconPosition = "left",
  ...props
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={
        !disabled && !loading
          ? { y: -1, transition: { duration: 0.14, ease: "easeOut" } }
          : undefined
      }
      whileTap={
        !disabled && !loading
          ? { scale: 0.98, transition: { duration: 0.08 } }
          : undefined
      }
      className={`relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`}
      {...props}
    >
      {loading && (
        <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {!loading && Icon && iconPosition === "left" && (
        <Icon size={15} className="mr-1.5 shrink-0" />
      )}
      {children}
      {!loading && Icon && iconPosition === "right" && (
        <Icon size={15} className="ml-1.5 shrink-0" />
      )}
    </motion.button>
  );
}

/**
 * AnimatedBadge: Smooth scale entrance for match scores and statuses
 */
export function AnimatedBadge({ children, className = "" }) {
  return (
    <motion.span
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center ${className}`}
    >
      {children}
    </motion.span>
  );
}

/**
 * AnimatedModal: Backdrop blur with smooth scale and fade dialog
 */
export function AnimatedModal({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-xl",
  className = "",
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} z-10 my-8 rounded-2xl bg-white dark:bg-[#141210] border border-slate-200 dark:border-[#262320] shadow-2xl overflow-hidden ${className}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * AnimatedDrawer: Slide-over drawer for detail views & mobile sheets
 */
export function AnimatedDrawer({
  isOpen,
  onClose,
  children,
  position = "right", // 'right' | 'left'
  width = "max-w-xl",
  className = "",
}) {
  const xOffset = position === "right" ? "100%" : "-100%";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs"
          />

          {/* Drawer Pane */}
          <div
            className={`fixed inset-y-0 ${
              position === "right" ? "right-0" : "left-0"
            } flex max-w-full`}
          >
            <motion.div
              initial={{ x: xOffset }}
              animate={{ x: 0 }}
              exit={{ x: xOffset }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className={`w-screen ${width} bg-white dark:bg-[#141210] border-${
                position === "right" ? "l" : "r"
              } border-slate-200 dark:border-[#262320] shadow-2xl flex flex-col ${className}`}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { motion, AnimatePresence };
