import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface NumberInputProps {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  className?: string
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  className = ''
}: NumberInputProps) {
  const handleIncrement = () => {
    const newValue = Number(value || 0) + step
    if (max === undefined || newValue <= max) {
      onChange(newValue.toString())
    }
  }

  const handleDecrement = () => {
    const newValue = Number(value || 0) - step
    if (min === undefined || newValue >= min) {
      onChange(newValue.toString())
    }
  }

  return (
    <div className="number-input-wrapper">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent ${className}`}
      />
      <div className="number-input-controls">
        <button type="button" onClick={handleIncrement} tabIndex={-1}>
          <ChevronUp className="h-3 w-3" />
        </button>
        <button type="button" onClick={handleDecrement} tabIndex={-1}>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
