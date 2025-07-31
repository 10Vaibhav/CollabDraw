import Link from 'next/link';

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = ({ 
  children, 
  className = '',
  href, 
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) => {
  
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full";
  
  const variants = {
    primary: "bg-[#3090A1] text-white hover:bg-[#7BCECC] focus:ring-[#3090A1]",
    secondary: "bg-[#7BCECC] text-white hover:bg-[#3090A1] focus:ring-[#7BCECC]",
    danger: "bg-[#BC5148] text-white hover:bg-opacity-90 focus:ring-[#BC5148]",
    outline: "border border-[#3090A1] bg-transparent text-[#3090A1] hover:bg-[#3090A1]/10 focus:ring-[#3090A1]",
    ghost: "bg-transparent text-[#3090A1] hover:bg-[#7BCECC]/20 focus:ring-[#3090A1]"
  };
  
  const sizes = {
    sm: "text-sm px-4 py-1.5",
    md: "text-base px-5 py-2",
    lg: "text-lg px-7 py-3"
  };
  
  const allClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
  
  if (href) {
    return (
      <Link href={href} className={allClasses}>
        {children}
      </Link>
    );
  }
  
  return (
    <button {...props} className={allClasses}>
      {children}
    </button>
  );
};

export default Button;