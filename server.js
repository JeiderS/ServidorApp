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

const port = 3000



// Ruta para obtener los productos manualmente (solo si lo necesitas)
app.get('/productos', async (req, res) => {
    try {
      const productos = await db.collection("productos").find().toArray();
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

app.get("/productos/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const producto = await db.collection("productos").findOne({ _id: new require("mongodb").ObjectId(id) });

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error en la búsqueda del producto" });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post("/crear_pedido", async (req, res) => {
  try {
      const pedido = req.body;
      pedido.fechacreacion = new Date();

      const result = await db.collection("pedidos").insertOne(pedido);
      res.status(201).json({ message: "Pedido creado con éxito", pedidoId: result.insertedId });
  } catch (error) {
      res.status(500).json({ error: "Error al crear el pedido" });
  }
});

app.get("/obtener_pedidos", async (req, res) => {
  try {
      const pedidos = await db.collection("pedidos").find().toArray();
      res.json(pedidos);
  } catch (error) {
      res.status(500).json({ error: "Error al obtener los pedidos" });
  }
});

app.get("/pedidos/:id", async (req, res) => {
  try {
      const { id } = req.params;
      const pedido = await db.collection("pedidos").findOne({ _id: new require("mongodb").ObjectId(id) });

      if (!pedido) {
          return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      res.json(pedido);
  } catch (error) {
      res.status(500).json({ error: "Error en la búsqueda del pedido" });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////



  

function watchProductos() {
  const collection = db.collection("productos");

  const changeStream = collection.watch();

  changeStream.on("change", (change) => {
      console.log("Cambio detectado en productos:", change);
      io.emit("productos_actualizados"); // Notifica a los clientes sobre cambios en productos
  });
}

function watchPedidos() {
  const collection = db.collection("pedidos");

  const changeStream = collection.watch();

  changeStream.on("change", (change) => {
      console.log("Cambio detectado en pedidos:", change);
      io.emit("pedidos_actualizados"); // Notifica a los clientes sobre cambios en pedidos
  });
}

// WebSockets: conexión con el frontend
io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("disconnect", () => {
      console.log("Cliente desconectado");
  });
});

// Llamar a ambas funciones después de conectar la base de datos
connecDB().then(() => {
  watchProductos();
  watchPedidos();
});


app.listen(port, "0.0.0.0", () => console.log(`Servidor corriendo en ${port}`));
