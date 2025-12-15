import app from './app.js'

const port = process.env.PORT ? Number(process.env.PORT) : 3002
const host = process.env.HOST || '0.0.0.0'

app.listen(port, host, () => {
  console.log(`ms-pricing listening on http://${host}:${port}`)
})
