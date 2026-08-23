import type { Variants, Transition } from "motion/react";

/**
 * Standard smooth cubic-bezier easing curve for luxury UI transitions.
 * Feels snappy to start and glides smoothly to rest.
 */
export const smoothEase = [0.22, 1, 0.36, 1] as const;

/**
 * Default smooth spring transition configuration.
 */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 28,
};

/**
 * Soft spring transition configuration for larger elements (drawers, modals).
 */
export const softSpringTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 25,
};

/**
 * Page transition variant for full-page route transitions.
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.35,
      ease: smoothEase,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Fade in and upward translation variant for cards, sections, and items.
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: smoothEase,
    },
  },
};

/**
 * Fade in and downward translation variant.
 */
export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: smoothEase,
    },
  },
};

/**
 * Fade in and scale up variant (ideal for modals, dialogs, popovers, badges).
 */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: smoothEase,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Stagger container for cascading child animations.
 */
export const staggerContainer = (
  staggerChildren = 0.05,
  delayChildren = 0
): Variants => ({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      delayChildren,
      staggerChildren,
    },
  },
});

/**
 * Micro-interaction tap effect for interactive cards, buttons, badges.
 */
export const tapScale = {
  scale: 0.98,
  transition: { duration: 0.1, ease: "easeOut" },
};

/**
 * Micro-interaction hover lift effect.
 */
export const hoverLift = {
  y: -3,
  transition: { duration: 0.25, ease: smoothEase },
};
