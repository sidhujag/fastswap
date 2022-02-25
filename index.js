import CONFIGURATION from './config'
// Import express
const express = require('express')
// Import Body parser
const bodyParser = require('body-parser')
// Import Mongoose
const mongoose = require('mongoose')
const timerController = require('./timerController')
// Initialize the app
const app = express()

// Import routes
const apiRoutes = require('./api-routes')
// Configure bodyparser to handle post requests
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
// Connect to Mongoose and set connection variable
mongoose.connect('mongodb://localhost/fastswap', { useNewUrlParser: true })

const db = mongoose.connection

// Added check for DB connection

if (!db) { console.log('Error connecting db') } else { console.log('Db connected successfully') }

// Setup server port
const port = CONFIGURATION.PORT || 8080
setTimeout(timerController.loop, 10000, timerController)
// Send message for default URL
app.get('/', (req, res) => res.send('FastSwap says Hi!'))

// Use Api routes in the App
app.use('/api', apiRoutes)
// Launch app to listen to specified port
app.listen(port, function () {
  console.log('Running FastSwap on port ' + port)
})
