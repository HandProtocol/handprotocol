import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CommunityBoard } from './App'

describe('CommunityBoard with no requests', () => {
  it('renders an empty board instead of crashing', () => {
    render(<CommunityBoard
      requests={[]}
      setRequests={vi.fn()}
      notify={vi.fn()}
      dbConfigured={false}
      canWrite={false}
      memberId={null}
      memberName="Visitor"
      onAuthRequired={vi.fn()}
    />)

    expect(screen.getByRole('heading', { name: '0 active requests' })).toBeInTheDocument()
    expect(screen.getByText('No requests match this filter.')).toBeInTheDocument()
    expect(screen.getByText(/No community requests yet/i)).toBeInTheDocument()
  })
})
