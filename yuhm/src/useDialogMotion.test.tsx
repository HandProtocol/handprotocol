import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDialogMotion } from './useDialogMotion'

function dispatchOpacityTransitionEnd(element: HTMLElement) {
  const event = new Event('transitionend', { bubbles: true })
  Object.defineProperty(event, 'propertyName', { value: 'opacity' })
  fireEvent(element, event)
}

function Harness({ onExited }: { onExited: () => void }) {
  const motion = useDialogMotion(onExited)
  return <>
    <button onClick={() => motion.requestClose()}>Close</button>
    <div data-testid="backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd}>
      <div data-testid="child" />
    </div>
  </>
}

describe('useDialogMotion', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits for the backdrop opacity transition before exiting', async () => {
    const onExited = vi.fn()
    render(<Harness onExited={onExited} />)

    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-dialog-state', 'open')
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-dialog-state', 'closing')
    expect(onExited).not.toHaveBeenCalled()

    dispatchOpacityTransitionEnd(screen.getByTestId('child'))
    expect(onExited).not.toHaveBeenCalled()
    dispatchOpacityTransitionEnd(screen.getByTestId('backdrop'))
    expect(onExited).toHaveBeenCalledOnce()
  })

  it('makes repeated close requests idempotent', () => {
    const onExited = vi.fn()
    render(<Harness onExited={onExited} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    dispatchOpacityTransitionEnd(screen.getByTestId('backdrop'))
    dispatchOpacityTransitionEnd(screen.getByTestId('backdrop'))

    expect(onExited).toHaveBeenCalledOnce()
  })

  it('uses the fallback when transitionend is not delivered', () => {
    vi.useFakeTimers()
    const onExited = vi.fn()
    render(<Harness onExited={onExited} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    vi.advanceTimersByTime(299)
    expect(onExited).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onExited).toHaveBeenCalledOnce()
  })
})
