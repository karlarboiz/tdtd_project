import { openDb } from './db/connection.js'
import { createApp } from './app.js'
import { assertProductionSecrets } from './lib/auth-config.js'
import { assertProductionCorsConfig } from './lib/cors-config.js'

assertProductionSecrets()
assertProductionCorsConfig()

const port = Number(process.env.PORT) || 3000
const db = openDb()
const app = createApp(db)

app.listen(port, '0.0.0.0', () => {
  console.log(`tdtd-node listening on http://0.0.0.0:${port}`)
})
