import CONFIGURATION from "./config.js";
// Import express
import express from "express";
// Import Body parser
import bodyParser from "body-parser";
// Import Mongoose
import mongoose from "mongoose";
import timerController from "./timerController.js";
import txController from "./txController.js";
import balanceController from "./balanceController.js";
// Import routes
import apiRoutes from "./api-routes.js";
import cors from "cors";

import swaggerUi from "swagger-ui-express";

import YAML from "yamljs";

const swaggerDocument = YAML.load("./swagger.yaml");

// Initialize the app
const app = express();
app.use(cors());
// Configure bodyparser to handle post requests
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
// Connect to Mongoose and set connection variable
mongoose
  .connect(
    "mongodb://fastswap:fastswap@0.0.0.0:" +
      CONFIGURATION.MONGOOSEPORT +
      "/fastswap",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .catch((error) => console.log("mongoose error: " + error));

const db = mongoose.connection;

// Added check for DB connection

if (!db) {
  console.log("Error connecting db");
} else {
  console.log("Db connected successfully");
}

// Setup server port
const port = CONFIGURATION.PORT || 8080;
setTimeout(timerController.loop, 10000, timerController);
// Send message for default URL
app.get("/", (req, res) => res.send("EasySwap says Hi!"));

// Use Api routes in the App
app.use("/api", apiRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Launch app to listen to specified port
app.listen(port, function () {
  console.log("Running EasySwap on port " + port);
});
// fetch balances on startup
txController.FetchAndUpdateBalances(balanceController);
