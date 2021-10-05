const express = require("express");
require('dotenv').config();
const { Pool } = require('pg');
const app = express();
const port = 8081;

let dbParams = {};
if (process.env.DATABASE_URL) {
  dbParams.connectionString = process.env.DATABASE_URL;
} else {
  dbParams = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  };
}

const db = new Pool(dbParams);
db.connect()

app.get("/", (req, res) => {
  res.send("<h1>Express Demo App</h1> <h4>Message: Success</h4> <p>Version 1.3</p>");
});

app.get("/api/products", (req, res) => {
  db.query('SELECT * FROM products')
    .then((data) => {
      console.log(data.rows)
      res.json({data: data.rows})
    })
    .catch((e) => {
      console.log('Error:', e);
      res.json({error: 'DB Error'})
    })
});

app.listen(port, ()=> {
  console.log(`Demo app is up and listening to port: ${port}`);
});
