"use client";
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed group';
  
  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 focus:ring-violet-500 shadow-2xl shadow-violet-500/25 hover:shadow-violet-400/40',
    secondary: 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 hover:border-gray-600 focus:ring-gray-500 shadow-xl hover:shadow-2xl',
    outline: 'border-2 border-violet-500 text-violet-400 hover:bg-violet-500 hover:text-white focus:ring-violet-500 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-500/25',
    ghost: 'text-gray-300 hover:text-white hover:bg-gray-800/50 focus:ring-gray-500 backdrop-blur-sm'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-8 py-3 text-base',
    lg: 'px-10 py-4 text-lg'
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim();

  return (
    <button
      className={combinedClassName}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;