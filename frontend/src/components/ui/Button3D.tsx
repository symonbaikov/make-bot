import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Button3DProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  className?: string;
}

export const Button3D = ({ children, variant = 'primary', className, ...props }: Button3DProps) => {
  const variants = {
    primary: 'bg-primary shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]',
    secondary: 'bg-secondary shadow-[0_4px_0_rgb(126,34,206)] hover:shadow-[0_2px_0_rgb(126,34,206)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]',
    accent: 'bg-accent shadow-[0_4px_0_rgb(219,39,119)] hover:shadow-[0_2px_0_rgb(219,39,119)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]',
    danger: 'bg-red-500 shadow-[0_4px_0_rgb(185,28,28)] hover:shadow-[0_2px_0_rgb(185,28,28)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cn(
        "px-6 py-2 rounded-lg font-bold text-white transition-all duration-100 uppercase tracking-wider text-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
