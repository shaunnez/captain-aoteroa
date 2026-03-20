import { Search } from 'lucide-react'

interface EventSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function EventSearchBar({ value, onChange }: EventSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search events…"
        className="input-field pl-10"
        aria-label="Search events"
      />
    </div>
  )
}
