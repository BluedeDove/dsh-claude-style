import React from 'react'
import { closestComposerCard, sessionScope } from '../../core/host'
import type { HostContext } from '../../core/host'
import { COMPOSER_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSize } from '../../core/bus'

interface StopProps {
  sessionId?: string
  useSession(selector: (value: { running?: boolean }) => boolean | undefined): boolean | undefined
  useInput(selector: (value: { draft?: string, attachmentIds?: string[] } | undefined) => boolean): boolean
}

/** Cancellation stays available independently of the host's draft-dependent primary button. */
export function installStopControl(ctx: HostContext) {
  const fiber = ctx.inject?.(['slots', 'sessions'], scope => {
    const slots = scope.get('slots')
    if (slots === undefined || slots === null) return
    function StopControl(props: StopProps) {
      const running = props.useSession(value => value.running) === true
      const draft = props.useInput(value => !!(value?.draft?.trim() || value?.attachmentIds?.length))
      const [pending, setPending] = React.useState(false), [error, setError] = React.useState('')
      const button = React.useRef<HTMLButtonElement>(null), alive = React.useRef(true)
      const conversation = React.useMemo(() => sessionScope(scope, props.sessionId)?.get('conversation'), [props.sessionId])
      React.useEffect(() => {alive.current = true; return () => {alive.current = false}}, [])
      React.useLayoutEffect(() => {
        const card = closestComposerCard(button.current)
        card?.toggleAttribute('data-dsh-claude-stop-overlay', running)
        card?.toggleAttribute('data-dsh-claude-stop-draft', running && draft)
        const scroll = card?.querySelector(COMPOSER_SCROLL_SELECTOR)
        function measure() {
          const control = button.current, parent = control?.offsetParent
          if (!control || !parent || !scroll || !card) return
          const box = scroll.getBoundingClientRect(), base = parent.getBoundingClientRect()
          const inset = card.hasAttribute('data-dsh-claude-native-input')
            ? Math.max(0, box.height - 46) : Math.max(0, Math.min(16, (box.height - 40) / 2))
          const top = `${Math.round(box.top - base.top + inset)}px`
          if (control.style.top !== top) control.style.top = top
          if (control.style.bottom !== 'auto') control.style.bottom = 'auto'
        }
        const stopSize = card && scroll ? observeSize([card, scroll], measure) : null
        const observer = new MutationObserver(measure)
        if (card) observer.observe(card, {attributes: true, attributeFilter: ['data-dsh-claude-native-input']})
        measure()
        return () => {stopSize?.(); observer.disconnect(); card?.removeAttribute('data-dsh-claude-stop-overlay'); card?.removeAttribute('data-dsh-claude-stop-draft')}
      }, [running, draft, props.sessionId])
      async function cancel() {
        setPending(true); setError('')
        try {await conversation.cancel()}
        catch (failure) {
          // Cancellation errors are reported and shown beside the retry control.
          reportError(failure)
          if (alive.current) setError(failure instanceof Error ? failure.message : String(failure))
        } finally {if (alive.current) setPending(false)}
      }
      if (!running || props.sessionId === undefined || typeof conversation?.cancel !== 'function') return null
      return React.createElement(React.Fragment, null,
        React.createElement('button', {
          ref: button, type: 'button', className: 'dsh-claude-stop-control',
          style: {width: 40, height: 40, minHeight: 40},
          'data-dsh-claude-control': 'stop', 'data-dsh-claude-stop-owned': '',
          'aria-label': '停止生成 / Stop generating', title: '停止生成 / Stop generating',
          disabled: pending, onMouseDown: (event: React.MouseEvent) => event.preventDefault(), onClick: cancel,
        }, React.createElement('svg', {viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true},
          React.createElement('rect', {x: 3, y: 3, width: 10, height: 10, rx: 3, fill: 'currentColor'}))),
        error ? React.createElement('span', {className: 'dsh-claude-stop-error', role: 'alert'}, error) : null)
    }
    slots.inject('conversation.input.overlay', () => slots.register({name: 'conversation.input.overlay', id: 'claude-stop-control', order: 50}, StopControl))
  })
  return () => fiber?.dispose()
}
