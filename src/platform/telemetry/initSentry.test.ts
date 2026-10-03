import type {
  browserApiErrorsIntegration as sentryBrowserApiErrorsIntegration,
  ErrorEvent,
  EventHint,
  init as sentryInitContract
} from '@sentry/vue'
import { createApp } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'

const { sentryInit, browserApiErrorsIntegration } = vi.hoisted(() => ({
  sentryInit: vi.fn<typeof sentryInitContract>(),
  browserApiErrorsIntegration: vi.fn<typeof sentryBrowserApiErrorsIntegration>()
}))

vi.mock(import('@sentry/vue'), () => ({
  browserApiErrorsIntegration,
  init: sentryInit
}))

import { initSentry } from './initSentry'

beforeEach(() => sentryInit.mockClear())

function beforeSend() {
  initSentry({
    app: createApp({}),
    dsn: 'https://public@example.invalid/1',
    enabled: true,
    isCloud: false
  })

  const options = sentryInit.mock.lastCall?.[0]
  if (!options) throw new Error('Sentry was not initialized')
  return options.beforeSend as (
    event: ErrorEvent,
    hint: EventHint
  ) => ErrorEvent | null
}

it('filters third-party noise', () => {
  expect(
    beforeSend()(
      {
        type: undefined,
        message: 'Invalid call to runtime.sendMessage(). Tab not found.'
      },
      {}
    )
  ).toBeNull()
})

it('adds Vue directive diagnostics after filtering', () => {
  const event = {
    type: undefined,
    exception: {
      values: [
        {
          value: 'undefined is not a function',
          stacktrace: { frames: [{ function: 'withDirectives' }] }
        }
      ]
    }
  } satisfies ErrorEvent

  expect(beforeSend()(event, {})?.tags?.diagnostic).toBe(
    'vue_directive_runtime'
  )
})
