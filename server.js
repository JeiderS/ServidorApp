require("dotenv").config() 

const express = require('express')
const cors = require("cors")
const { MongoClient } = require("mongodb")
const { Server } = require("socket.io")
const http = require("http")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
      origin: '*',
    },
});
  

app.use(cors())
app.use(express.json())


const uri = process.env.MONGO_URI
const client = new MongoClient(uri)
let db;

async function connecDB() {
    try {
        await client.connect();
        db = client.db("DataBaseHappyPeluditos")
        console.log("conexion establecida")
        watchCollection()
    } catch (error) {
        console.log(error)   
    }
}
connecDB();

const port = process.env.PORT || 4000;



// Ruta para obtener los productos manualmente (solo si lo necesitas)
app.get('/productos', async (req, res) => {
    try {
      const productos = await db.collection("productos").find().toArray();
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  

// Función para detectar cambios en la base de datos
function watchCollection() {
    const collection = db.collection("productos");
  
    const changeStream = collection.watch();
  
    changeStream.on("change", (change) => {
      console.log("Cambio detectado en MongoDB:", change);
      io.emit("productos_actualizados"); // Notifica a los clientes
    });
  }
  

  // WebSockets: conexión con el frontend
  io.on("connection", (socket) => {
    console.log("Cliente conectado");
    socket.on("disconnect", () => {
      console.log("Cliente desconectado");
    });
  });

app.listen(port, "0.0.0.0", () => console.log(`Servidor corriendo en ${port}`));
