const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt'); // Para el hash de las contraseñas
const app = express();
const port = 3000;

require('dotenv').config();

// Conexión a la base de datos MySQL (Proyecto)
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "2424",
    database: "Proyecto"
});

// Conectar a la base de datos
connection.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos Proyecto.');
});

// Middleware para parsear JSON
app.use(bodyParser.json());

// Ruta para buscar empleos
app.get('/buscar', (req, res) => {
    const { categoria, area, ubicacion, salario, page = 1 } = req.query;

    // Paginación: solo 5 resultados por página
    const limit = 5; // Número de empleos por página
    const offset = (page - 1) * limit; // Desplazamiento para obtener la página correcta

    // Consulta SQL para buscar empleos en la base de datos
    let query = 'SELECT * FROM empleos WHERE 1=1';

    // Filtrar por categoría, área, ubicación y salario
    if (categoria) query += ` AND categoria LIKE '%${categoria}%'`;
    if (area) query += ` AND area LIKE '%${area}%'`;
    if (ubicacion) query += ` AND ubicacion LIKE '%${ubicacion}%'`;
    if (salario) {
        if (salario === 'Menos de 30.000') query += ' AND salario < 30000';
        else if (salario === 'Entre 30.000 y 60.000') query += ' AND salario BETWEEN 30000 AND 60000';
        else if (salario === 'Más de 60.000') query += ' AND salario > 60000';
    }

    // Añadir la paginación a la consulta
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    // Ejecutar la consulta
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error ejecutando la consulta:', error);
            res.status(500).json({ error: 'Error en la consulta' });
            return;
        }
        res.json(results); // Enviar los resultados al frontend
    });
});

// Ruta para registrar un nuevo usuario
app.post('/registrarse', (req, res) => {
    const { usuario, correo, contrasena } = req.body;

    // Verificar si el usuario o correo ya existen en la base de datos
    const checkUserQuery = 'SELECT * FROM usuarios WHERE usuario = ? OR correo = ?';
    connection.query(checkUserQuery, [usuario, correo], (error, results) => {
        if (error) {
            console.error('Error al verificar usuario o correo:', error);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'El usuario o correo ya están registrados' });
        }

        // Cifrar la contraseña antes de guardarla
        bcrypt.hash(contrasena, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error al cifrar la contraseña:', err);
                return res.status(500).json({ error: 'Error al cifrar la contraseña' });
            }

            // Insertar el nuevo usuario con la contraseña cifrada
            const insertQuery = 'INSERT INTO usuarios (usuario, correo, contrasena) VALUES (?, ?, ?)';
            connection.query(insertQuery, [usuario, correo, hashedPassword], (error, results) => {
                if (error) {
                    console.error('Error al registrar usuario:', error);
                    return res.status(500).json({ error: 'Error al registrar el usuario' });
                }

                res.json({ success: true });
            });
        });
    });
});

// Ruta para iniciar sesión
app.post('/iniciar-sesion', (req, res) => {
    const { usuario, contrasena } = req.body;

    // Verificar si el usuario existe en la base de datos
    const checkUserQuery = 'SELECT * FROM usuarios WHERE usuario = ?';
    connection.query(checkUserQuery, [usuario], (error, results) => {
        if (error) {
            console.error('Error al verificar el usuario:', error);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Comparar las contraseñas usando bcrypt
        bcrypt.compare(contrasena, results[0].contrasena, (err, isMatch) => {
            if (err) {
                console.error('Error al comparar las contraseñas:', err);
                return res.status(500).json({ error: 'Error en el servidor' });
            }

            if (!isMatch) {
                return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
            }

            // Si las credenciales son correctas, iniciar sesión
            res.json({ success: true });
        });
    });
});

// Servir archivos estáticos desde la carpeta Frontend
app.use(express.static(path.join(__dirname, 'Frontend')));

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
