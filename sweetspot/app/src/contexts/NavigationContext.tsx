import React, { createContext, useContext, useState } from 'react'

interface NavigationContextType {
  isExpanded: boolean
  toggleNavigation: () => void
}

const NavigationContext = createContext<NavigationContextType>({
  isExpanded: false,
  toggleNavigation: () => {}
})

export function NavigationProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleNavigation = () => {
    setIsExpanded((prev) => !prev)
  }

  return (
    <NavigationContext.Provider value={{ isExpanded, toggleNavigation }}>
      {children}
    </NavigationContext.Provider>
  )
}

export const useNavigation = () => useContext(NavigationContext)
