import type { ChildrenNode } from 'interweave'
import { Matcher } from 'interweave'
import React from 'react'

export class MDHeadingMatcher extends Matcher {
  replaceWith(children: ChildrenNode, props: { level: number }) {
    const { level } = props

    // Define different styling based on the heading level
    switch (level) {
      case 1: // H1 - # Heading
        return <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
      case 2: // H2 - ## Heading
        return <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>
      case 3: // H3 - ### Heading
        return <h3 className="text-lg font-bold mt-2 mb-1">{children}</h3>
      case 4: // H4 - #### Heading
        return <h4 className="text-base font-bold mt-2 mb-1">{children}</h4>
      default:
        return <h5 className="text-sm font-bold mt-1 mb-1">{children}</h5>
    }
  }

  asTag(): string {
    return 'h1' // Default tag, will be overridden by replaceWith
  }

  match(value: string) {
    // Match headings (# Heading)
    return this.doMatch(value, /^(#{1,5}) (.+)$/m, (matches) => ({
      match: matches[2],
      level: matches[1].length
    }))
  }
}
