// Shared UI Components


// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 overflow-hidden'

  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5',
    secondary: 'bg-zinc-800/80 text-zinc-100 border border-white/10 hover:bg-zinc-700/80 hover:border-white/20',
    danger: 'bg-rose-600/90 text-white hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/25',
    ghost: 'text-zinc-400 hover:text-white hover:bg-white/5'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </span>
      )}
      <span className={isLoading ? 'opacity-0' : ''}>{children}</span>
    </button>
  )
}

// Card Component
interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'none' | 'purple' | 'pink' | 'cyan'
}

export function Card({ children, className = '', glow = 'none' }: CardProps) {
  const glowStyles = {
    none: '',
    purple: 'hover:shadow-xl hover:shadow-violet-500/10',
    pink: 'hover:shadow-xl hover:shadow-fuchsia-500/10',
    cyan: 'hover:shadow-xl hover:shadow-cyan-500/10'
  }

  return (
    <div className={`bg-zinc-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-300 ${glowStyles[glow]} ${className}`}>
      {children}
    </div>
  )
}

// Card Header
export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b border-white/[0.06] flex items-center justify-between ${className}`}>
      {children}
    </div>
  )
}

// Card Content
export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

// Badge Component
interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    default: 'bg-zinc-800 text-zinc-400 border-white/10'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${variants[variant]}`}>
      {variant === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      {variant === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
      {variant === 'info' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
      {children}
    </span>
  )
}

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-zinc-400">{label}</label>}
      <input
        className={`w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  )
}

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-zinc-400">{label}</label>}
      <textarea
        className={`w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  )
}

// Alert Component
interface AlertProps {
  children: React.ReactNode
  variant?: 'success' | 'error' | 'info'
  onClose?: () => void
}

export function Alert({ children, variant = 'info', onClose }: AlertProps) {
  const variants = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
    info: 'bg-violet-500/10 border-violet-500/30 text-violet-200'
  }

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${variants[variant]}`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Section Title
export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold text-white">{children}</h2>
      {subtitle && <p className="mt-1 text-zinc-400">{subtitle}</p>}
    </div>
  )
}

// Empty State
export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="text-center py-12">
      {icon && <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 text-zinc-500 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-zinc-300">{title}</h3>
      {description && <p className="mt-1 text-zinc-500">{description}</p>}
    </div>
  )
}

// List Item
interface ListItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
}

export function ListItem({ children, className = '', onClick, selected }: ListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
        selected
          ? 'bg-violet-500/10 border-violet-500/30'
          : 'bg-zinc-900/40 border-white/[0.04] hover:border-white/10 hover:bg-zinc-800/40'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

// Toggle Switch
interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-zinc-700'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      {label && <span className="text-sm text-zinc-300">{label}</span>}
    </label>
  )
}

// Slider
interface SliderProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label?: string
}

export function Slider({ value, min, max, onChange, label }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-zinc-400">{label}</label>}
      <div className="relative h-2 bg-zinc-800 rounded-full">
        <div
          className="absolute h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}
