import app from './app.js'
import { initLodgingClassCache } from './lodging-helper.js'

const port = process.env.PORT ? Number(process.env.PORT) : 3002
const host = process.env.HOST || '0.0.0.0'

app.listen(port, host, async () => {
  console.log(`ms-pricing listening on http://${host}:${port}`)

  try {
    await initLodgingClassCache()
    console.log('Lodging class cache initialized')
  } catch (error) {
    console.error('Failed to initialize lodging class cache:', error)
    console.error('Application will continue but may have degraded performance')
  }
})
