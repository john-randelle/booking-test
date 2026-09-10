import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { env } from './lib/env.js'
import { auth } from './lib/auth.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.all("/api/auth/*", (c) => auth.handler(c.req.raw)); 

serve({
  fetch: app.fetch,
  port: env.PORT
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
