import { openDb } from './db/connection.js'
import { createApp } from './app.js'

const port = Number(process.env.PORT) || 3000
const db = openDb()
const app = createApp(db)

app.listen(port, () => {
  console.log(`tdtd-node listening on http://localhost:${port}`)
})
