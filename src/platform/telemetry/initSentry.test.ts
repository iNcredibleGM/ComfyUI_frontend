import type {
  browserApiErrorsIntegration as sentryBrowserApiErrorsIntegration,
  ErrorEvent,
  init as sentryInitContract
} from '@sentry/vue'
import { createApp } from 'vue'
import { expect, it, vi } from 'vitest'

const { sentryInit, browserApiErrorsIntegration } = vi.hoisted(() => ({
  sentryInit: vi.fn<typeof sentryInitContract>(),
  browserApiErrorsIntegration: vi.fn<typeof sentryBrowserApiErrorsIntegration>()
}))

vi.mock(import('@sentry/vue'), () => ({
  browserApiErrorsIntegration,
  init: sentryInit
}))

import { initSentry } from './initSentry'

function installedBeforeSend() {
  initSentry({
    app: createApp({}),
    dsn: 'https://public@example.invalid/1',
    enabled: true,
    isCloud: false
  })

  const options = sentryInit.mock.lastCall?.[0]
  if (!options) throw new Error('Sentry was not initialized')
  if (!options.beforeSend)
    throw new Error('Sentry beforeSend was not installed')
  return options.beforeSend
}

it('filters third-party noise', async () => {
  expect(
    await installedBeforeSend()(
      {
        type: undefined,
        message: 'Invalid call to runtime.sendMessage(). Tab not found.'
      },
      {}
    )
  ).toBeNull()
})

it('adds Vue directive diagnostics after filtering', async () => {
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

  expect((await installedBeforeSend()(event, {}))?.tags?.diagnostic).toBe(
    'vue_directive_runtime'
  )
})
