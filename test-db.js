// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();
const { Pool } = require('pg');

// Configurar la conexión usando los datos del .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Probar la conexión
async function probarConexion() {
    try {
        const client = await pool.connect();
        console.log(' ¡CONEXIÓN EXITOSA! Conectado a la base de datos:', process.env.DB_DATABASE);
        
        // Hacer una consulta de prueba para verificar los productos
        const res = await client.query('SELECT COUNT(*) FROM productos;');
        console.log(`📦 Productos encontrados en la base de datos: ${res.rows[0].count}`);
        
        client.release();
        pool.end();
    } catch (err) {
        console.error('❌ ERROR DE CONEXIÓN: No se pudo conectar a PostgreSQL.');
        console.error('Detalles del error:', err.message);
    }
}

probarConexion();