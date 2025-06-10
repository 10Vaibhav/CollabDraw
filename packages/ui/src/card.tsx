"use client";
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-500';
  
  const variants = {
    default: 'bg-gray-900/50 border border-gray-800 backdrop-blur-sm',
    elevated: 'bg-gradient-to-br from-gray-900/80 to-gray-800/50 border border-gray-700/50 backdrop-blur-md shadow-2xl',
    bordered: 'bg-gray-900/70 border-2 border-gray-700 backdrop-blur-sm',
    glass: 'bg-gray-900/30 backdrop-blur-xl border border-gray-700/30 shadow-2xl'
  };
  
  const paddings = {
    sm: 'p-6',
    md: 'p-8',
    lg: 'p-10'
  };
  
  const hoverStyles = hover ? 'hover:shadow-2xl hover:shadow-violet-500/10 cursor-pointer hover:border-violet-500/30' : '';
  
  const combinedClassName = `${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`.trim();

  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

export default Card;
