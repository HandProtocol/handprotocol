// StepOption type for nested options
interface StepOption {
  id: string // Unique identifier for the option
  title: string // Title of the option
  description: string // Description of the option
  icon?: React.FC<React.SVGProps<SVGSVGElement>> // Optional icon component
}

// Step type for each step
interface Step {
  id: string // Unique identifier for the step
  title: string // Title of the step
  description: string // Description of the step
  icon?: React.FC<React.SVGProps<SVGSVGElement>> // Optional icon component
  options?: StepOption[] // Optional list of options for the step
}

// Type for the full array of steps
export type Steps = Step[]
