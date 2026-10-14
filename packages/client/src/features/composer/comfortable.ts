import { COMPOSER_TOOLS_SELECTOR, COMPOSER_TRAILING_SELECTOR, COMPOSER_STANDARD_SELECTOR, COMPOSER_DOCK_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createStamp } from '../../shared/dom'

export function installComfortableComposer() {
  const toolbar = createStamp<HTMLElement>('data-dsh-claude-composer-toolbar')
  const tools = createStamp<HTMLElement>('data-dsh-claude-composer-tools')
  const trailing = createStamp<HTMLElement>('data-dsh-claude-composer-trailing')
  const standard = createStamp<HTMLElement>('data-dsh-claude-composer-standard')
  const dock = createStamp<HTMLElement>('data-dsh-claude-composer-dock')
  return {sync(card: HTMLElement | null) {
    const end = card?.querySelector<HTMLElement>(COMPOSER_TRAILING_SELECTOR) ?? null
    trailing.mark(end); toolbar.mark(end?.parentElement ?? null)
    tools.mark(card?.querySelector<HTMLElement>(COMPOSER_TOOLS_SELECTOR) ?? null)
    standard.mark(end?.querySelector<HTMLElement>(COMPOSER_STANDARD_SELECTOR) ?? null)
    dock.mark(card?.parentElement?.querySelector<HTMLElement>(`:scope > ${COMPOSER_DOCK_SELECTOR}`) ?? null)
  }, stop() {for (const stamp of [toolbar, tools, trailing, standard, dock]) stamp.release()}}
}
