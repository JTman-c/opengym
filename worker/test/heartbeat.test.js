import test from 'node:test'
import assert from 'node:assert/strict'
import { config, heartbeat } from '../src/runtime.js'

function stubFetch(t, impl) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return impl()
  })
  return calls
}

test('sends nothing when HEARTBEAT_URL is unset', async t => {
  const calls = stubFetch(t, () => new Response('OK'))
  await heartbeat(config({}))
  assert.equal(calls.length, 0)
})

test('pings HEARTBEAT_URL with a timeout', async t => {
  const calls = stubFetch(t, () => new Response('OK'))
  await heartbeat(config({ HEARTBEAT_URL: 'https://hc.example/ping' }))
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://hc.example/ping')
  assert.ok(calls[0].init.signal instanceof AbortSignal)
})

test('logs a failed ping instead of throwing', async t => {
  stubFetch(t, () => {
    throw new Error('network down')
  })
  const errors = t.mock.method(console, 'error', () => {})
  await heartbeat(config({ HEARTBEAT_URL: 'https://hc.example/ping' }))
  assert.equal(errors.mock.callCount(), 1)
})
