import React from 'react'
import { flushSync } from 'react-dom'
import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostContext, HostValue } from '../../core/host'

interface InputSnapshot {phase: string, draft: string, attachmentIds?: string[]}
interface InputProps {
  sessionId?: string
  useInput: (selector: (snapshot: InputSnapshot) => InputSnapshot) => InputSnapshot
  inputActions: {setDraft(value: string): void, submit(): void}
}
const PREFERENCE = 'dsh-claude-style.native-input'
const CHANGE = 'dsh-claude-style:native-input'

function wanted() {
  const saved = localStorage.getItem(PREFERENCE)
  return saved === 'off' ? false : saved === 'on' || matchMedia('(max-width:720px), (any-pointer:coarse)').matches
}

function useNativeInput() {
  const [active, setActive] = React.useState(wanted)
  React.useEffect(() => {
    const media = matchMedia('(max-width:720px), (any-pointer:coarse)')
    const update = () => setActive(wanted())
    media.addEventListener('change', update)
    window.addEventListener(CHANGE, update)
    window.addEventListener('storage', update)
    return () => {media.removeEventListener('change', update); window.removeEventListener(CHANGE, update); window.removeEventListener('storage', update)}
  }, [])
  return active
}

/** Native input remains uncontrolled; committed state goes through the host's input machine. */
function createComposer(ctx: HostContext, updates: Set<() => void>) {
  return function NativeComposer(props: InputProps) {
    const enabled = useNativeInput()
    const input = props.useInput(snapshot => snapshot)
    const [ready, setReady] = React.useState(false)
    const [hasStop, setHasStop] = React.useState(false), [empty, setEmpty] = React.useState(true)
    const [uploadBusy, setUploadBusy] = React.useState(false)
    const active = enabled && ready && input.phase === 'plain' && props.sessionId !== undefined
    const wrap = React.useRef<HTMLDivElement>(null), area = React.useRef<HTMLTextAreaElement>(null)
    const pending = React.useRef<string | null>(null), composing = React.useRef(false)
    const current = React.useRef(input); current.current = input
    const face = React.useMemo(() => {
      const scope = props.sessionId ? ctx.get('sessions')?.scope(props.sessionId) : undefined
      return scope?.get('conversation')?.input?.for(scope)
    }, [props.sessionId]) as HostValue
    const uploads = React.useMemo(() => {
      const scope = props.sessionId ? ctx.get('sessions')?.scope(props.sessionId) : undefined
      return scope?.get('conversation')?.fileUploads
    }, [props.sessionId]) as HostValue
    React.useEffect(() => {
      const update = () => {
        const files = uploads?.getSnapshot() ?? {}
        setUploadBusy((current.current.attachmentIds ?? []).some(id => files[id] !== undefined && files[id].status !== 'ready'))
      }
      update()
      return uploads?.subscribe(update)
    }, [uploads, input.attachmentIds])

    function commit() {
      if (pending.current === null) return
      const value = pending.current; pending.current = null
      props.inputActions.setDraft(value)
    }
    function card() {return wrap.current?.closest<HTMLElement>(COMPOSER_CARD_SELECTOR) ?? null}
    React.useEffect(() => {
      let bound: HTMLElement | null = null
      const observer = new MutationObserver(update)
      const resize = new ResizeObserver(measure)
      function update() {
        const owner = card()
        if (!owner) return
        if (owner !== bound) {
          bound?.removeAttribute('data-dsh-claude-native-input')
          observer.disconnect(); resize.disconnect(); bound = owner
          observer.observe(owner, {attributes: true, subtree: true, childList: true, attributeFilter: ['contenteditable','data-phase','role','data-dsh-claude-control']})
          resize.observe(owner)
          const scroll = owner.querySelector(COMPOSER_SCROLL_SELECTOR)
          if (scroll) resize.observe(scroll)
          measure()
        }
        const editor = owner.querySelector(COMPOSER_INPUT_SELECTOR)
        setReady(editor?.getAttribute('contenteditable') === 'true' && owner.getAttribute('role') !== 'button')
        setHasStop(!!owner.querySelector('button[data-dsh-claude-control="stop"]'))
        if (active && !owner.hasAttribute('data-dsh-claude-native-input')) owner.setAttribute('data-dsh-claude-native-input', '')
      }
      updates.add(update); update()
      return () => {updates.delete(update); observer.disconnect(); resize.disconnect(); bound?.removeAttribute('data-dsh-claude-native-input')}
    }, [props.sessionId, input.phase, active])
    function measure() {
      const field = area.current, holder = wrap.current, scroll = card()?.querySelector<HTMLElement>(COMPOSER_SCROLL_SELECTOR)
      if (!field || !holder || !scroll || composing.current) return
      const parent = holder.offsetParent?.getBoundingClientRect(), box = scroll.getBoundingClientRect()
      if (!parent || box.width === 0) return
      const values = {left: box.left - parent.left, top: box.top - parent.top, width: box.width, height: Math.max(52, box.height)}
      for (const [key, value] of Object.entries(values)) {
        const next = `${Math.round(value)}px`
        if (holder.style.getPropertyValue(key) !== next) holder.style.setProperty(key, next)
      }
    }
    function syncDraft() {
      const field = area.current
      if (!field || composing.current || pending.current !== null) return
      const next = face?.state.getSnapshot().draft ?? current.current.draft
      if (field.value !== next) field.value = next
      setEmpty(!field.value.trim())
      measure()
    }

    React.useLayoutEffect(() => {
      if (!active) return
      const owner = card(), editor = owner?.querySelector<HTMLElement>(COMPOSER_INPUT_SELECTOR)
      if (!owner || !editor || editor.getAttribute('contenteditable') !== 'true') return
      owner.setAttribute('data-dsh-claude-native-input', '')
      if (area.current) area.current.value = input.draft ?? ''
      setEmpty(!(input.draft ?? '').trim())
      measure()
      const hide = () => {if (document.hidden) commit()}
      document.addEventListener('visibilitychange', hide)
      window.addEventListener('pagehide', commit)
      return () => {commit(); owner.removeAttribute('data-dsh-claude-native-input'); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', commit)}
    }, [active, props.sessionId])
    React.useEffect(() => {
      if (!active) return
      syncDraft()
      return face?.state.subscribe(syncDraft)
    }, [active, face])
    React.useEffect(() => {if (active && !face) syncDraft()}, [active, input.draft])

    function send() {
      const field = area.current
      if (!field || composing.current || uploadBusy || (!field.value.trim() && !(current.current.attachmentIds?.length))) return
      pending.current = field.value
      flushSync(commit)
      // The native button owns delivery policy and attachment admission.
      // Lexical key events can be consumed without submitting an unfocused root.
      const primary = card()?.querySelector<HTMLButtonElement>('button[data-dsh-claude-control="send"], button[data-dsh-claude-control="stop"]')
      if (primary) primary.click()
      else props.inputActions.submit()
    }
    function onInput(event: React.FormEvent<HTMLTextAreaElement>) {
      const value = event.currentTarget.value
      const previous = pending.current ?? current.current.draft
      pending.current = value
      setEmpty(!value.trim())
      // Menu triggers need the draft now. Other typing waits for a commit
      // point to avoid rewriting the hidden Lexical surface under Android IMEs.
      const triggers = (text: string) => text.match(/[/@]/g)?.length ?? 0
      if (!composing.current && triggers(previous) !== triggers(value)) {
        event.currentTarget.blur(); flushSync(commit); event.currentTarget.focus({preventScroll: true})
      }
    }
    function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
      if (!event.clipboardData.files.length) return
      const editor = card()?.querySelector(COMPOSER_INPUT_SELECTOR)
      if (!editor) return
      flushSync(commit)
      editor.dispatchEvent(new ClipboardEvent('paste', {bubbles: true, cancelable: true, clipboardData: event.clipboardData}))
      event.preventDefault()
    }
    return React.createElement('div', {ref: wrap, hidden: !active, className: 'dsh-claude-native-wrap'}, active ? [
      React.createElement('textarea', {key: 'field', ref: area, className: 'dsh-claude-native-input', rows: 1,
        placeholder: '输入消息，/ 命令，@ 文件', 'aria-label': '输入消息', enterKeyHint: 'send',
        autoCapitalize: 'sentences', onInput, onPaste,
        onCompositionStart: () => {composing.current = true},
        onCompositionEnd: () => {composing.current = false; measure()},
        onBlur: () => {if (!composing.current) {commit(); measure()}},
        onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229 && !composing.current) {event.preventDefault(); send()}
        },
      }),
      React.createElement('button', {key: 'send', type: 'button', className: 'dsh-claude-native-send', 'aria-label': '发送消息',
        hidden: hasStop && empty, disabled: uploadBusy || (empty && !(input.attachmentIds?.length)),
        onPointerDown: (event: React.PointerEvent) => event.preventDefault(), onClick: send}, '↑'),
    ] : null)
  }
}

function NativeToggle() {
  const enabled = useNativeInput()
  return React.createElement('button', {type: 'button', className: 'dsh-claude-native-toggle',
    'data-dsh-claude-mobile-secondary': '', 'aria-label': enabled ? '改用官方输入框' : '开启原生输入框',
    onClick: () => {localStorage.setItem(PREFERENCE, enabled ? 'off' : 'on'); window.dispatchEvent(new Event(CHANGE))},
  }, enabled ? '输入法 ✓' : '输入法')
}

export function installNativeComposer(ctx: HostContext) {
  const updates = new Set<() => void>()
  const originalFocus = HTMLElement.prototype.focus
  const replacement = (editor: HTMLElement) => {
    if (!editor.matches(COMPOSER_INPUT_SELECTOR)) return null
    const owner = editor.closest<HTMLElement>(COMPOSER_CARD_SELECTOR)
    if (!owner?.hasAttribute('data-dsh-claude-native-input')) return null
    return owner.querySelector<HTMLTextAreaElement>('.dsh-claude-native-input')
  }
  const guardedFocus = function(this: HTMLElement, options?: FocusOptions) {
    const field = replacement(this)
    if (field) {originalFocus.call(field, {preventScroll:true}); return}
    originalFocus.call(this, options)
  }
  const redirect = (event: FocusEvent) => {
    if (!(event.target instanceof HTMLElement)) return
    const field = replacement(event.target)
    if (field) originalFocus.call(field, {preventScroll:true})
  }
  document.addEventListener('focusin', redirect, true)
  HTMLElement.prototype.focus = guardedFocus
  const fiber = ctx.inject?.(['slots'], scope => {
    const slots = scope.get('slots')
    slots.inject('conversation.input.overlay', () => slots.register({name: 'conversation.input.overlay', id: 'claude-native-input', order: 40}, createComposer(ctx, updates)))
    slots.inject('conversation.input.left', () => slots.register({name: 'conversation.input.left', id: 'claude-native-input-toggle', order: 60}, NativeToggle))
  })
  return {sync() {for (const update of updates) update()}, stop() {
    fiber?.dispose()
    document.removeEventListener('focusin', redirect, true)
    if (HTMLElement.prototype.focus === guardedFocus) HTMLElement.prototype.focus = originalFocus
    updates.clear()
  }}
}
