const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const https = require('https');

function enviarCorreoRecuperacion(correo, contrasena) {
    const data = JSON.stringify({
        service_id: 'service_3wuh0xr',
        template_id: 'template_s9ewxea',
        user_id: '-0Uj2D3OUJd4fDr6Dzdh2',
        template_params: {
            to_email: correo,
            contrasena: contrasena
        }
    });

    const options = {
        hostname: 'api.emailjs.com',
        path: '/api/v1.0/email/send',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            resolve(res.statusCode);
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}



const app = express();
app.use(cors());
app.use(express.json());

// RECUPERAR CONTRASEÑA
app.post('/recuperar', (req, res) => {
    const { correo } = req.body;
    if (!correo) {
        return res.json({ exito: false, mensaje: 'Ingresa tu correo' });
    }
    db.query(
        'SELECT contrasena FROM usuarios WHERE correo = ? AND activo = 1',
        [correo],
        async (err, results) => {
            if (err) return res.json({ exito: false, mensaje: 'Error del servidor' });
            if (results.length === 0) {
                return res.json({ exito: false, mensaje: 'Correo no encontrado' });
            }
            const contrasena = results[0].contrasena;
            try {
                await enviarCorreoRecuperacion(correo, contrasena);
                res.json({ exito: true, mensaje: 'Correo enviado exitosamente' });
            } catch (e) {
                res.json({ exito: false, mensaje: 'Error al enviar el correo' });
            }
        }
    );
});

const db = mysql.createConnection({
    host: 'zephyr.proxy.rlwy.net',
    port: 57888,
    user: 'root',
    password: 'ERWyaPEmUUCoGSQeedZnLlDRsUHntaRL',
    database: 'railway'
});

db.connect((err) => {
    if (err) {
        console.log('Error conectando:', err);
        return;
    }
    console.log('Conectado a MySQL');
});

// LOGIN
app.post('/login', (req, res) => {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
        return res.json({ exito: false, mensaje: 'Completa todos los campos' });
    }
    db.query(
        'SELECT id, nombre_completo FROM usuarios WHERE usuario = ? AND contrasena = ? AND activo = 1',
        [usuario, contrasena],
        (err, results) => {
            if (err) return res.json({ exito: false, mensaje: 'Error del servidor' });
            if (results.length > 0) {
                res.json({ exito: true, id: results[0].id, nombre: results[0].nombre_completo });
            } else {
                res.json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
            }
        }
    );
});

// LISTAR MASCOTAS
app.get('/mascotas', (req, res) => {
    db.query(
        'SELECT m.*, d.nombre as duenio_nombre, d.telefono, d.direccion FROM mascotas m INNER JOIN duenios d ON m.duenio_id = d.id',
        (err, results) => {
            if (err) return res.json({ error: err.message });
            res.json(results);
        }
    );
});

// CREAR MASCOTA
app.post('/mascotas', (req, res) => {
    console.log('Datos recibidos:', req.body);
    const { nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, nombre_duenio, telefono, direccion } = req.body;
    db.query(
        'INSERT INTO duenios (nombre, telefono, direccion) VALUES (?, ?, ?)',
        [nombre_duenio, telefono, direccion],
        (err, result) => {
            if (err) {
                console.log('Error duenio:', err.message);
                return res.json({ exito: false, error: err.message });
            }
            const duenio_id = result.insertId;
            console.log('Duenio creado con id:', duenio_id);
            db.query(
                'INSERT INTO mascotas (nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, duenio_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, duenio_id],
                (err, result) => {
                    if (err) {
                        console.log('Error mascota:', err.message);
                        return res.json({ exito: false, error: err.message });
                    }
                    console.log('Mascota creada con id:', result.insertId);
                    res.json({ exito: true, id: result.insertId });
                }
            );
        }
    );
});

// EDITAR MASCOTA
app.put('/mascotas/:id', (req, res) => {
    const { nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, nombre_duenio, telefono, direccion } = req.body;
    const id = req.params.id;
    db.query(
        'UPDATE mascotas SET nombre=?, especie=?, raza=?, sexo=?, fecha_nacimiento=?, peso_kg=? WHERE id=?',
        [nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, id],
        (err) => {
            if (err) return res.json({ exito: false, error: err.message });
            db.query('SELECT duenio_id FROM mascotas WHERE id=?', [id], (err, results) => {
                if (err) return res.json({ exito: false, error: err.message });
                const duenio_id = results[0].duenio_id;
                db.query(
                    'UPDATE duenios SET nombre=?, telefono=?, direccion=? WHERE id=?',
                    [nombre_duenio, telefono, direccion, duenio_id],
                    (err) => {
                        if (err) return res.json({ exito: false, error: err.message });
                        res.json({ exito: true });
                    }
                );
            });
        }
    );
});

// ELIMINAR MASCOTA
app.delete('/mascotas/:id', (req, res) => {
    db.query('DELETE FROM mascotas WHERE id=?', [req.params.id], (err) => {
        if (err) return res.json({ exito: false, error: err.message });
        res.json({ exito: true });
    });
});

// LISTAR CITAS
app.get('/citas', (req, res) => {
    db.query(
        'SELECT c.*, m.nombre as mascota_nombre, d.nombre as duenio_nombre FROM citas c INNER JOIN mascotas m ON c.mascota_id = m.id INNER JOIN duenios d ON m.duenio_id = d.id ORDER BY c.fecha, c.hora',
        (err, results) => {
            if (err) return res.json({ error: err.message });
            res.json(results);
        }
    );
});

// CREAR CITA
app.post('/citas', (req, res) => {
    const { mascota_id, fecha, hora, tipo_cita, observaciones, veterinario_id } = req.body;
    db.query(
        'INSERT INTO citas (mascota_id, fecha, hora, tipo_cita, observaciones, veterinario_id) VALUES (?, ?, ?, ?, ?, ?)',
        [mascota_id, fecha, hora, tipo_cita, observaciones, veterinario_id],
        (err, result) => {
            if (err) return res.json({ exito: false, error: err.message });
            res.json({ exito: true, id: result.insertId });
        }
    );
});

// EDITAR CITA
app.put('/citas/:id', (req, res) => {
    const { mascota_id, fecha, hora, tipo_cita, observaciones } = req.body;
    db.query(
        'UPDATE citas SET mascota_id=?, fecha=?, hora=?, tipo_cita=?, observaciones=? WHERE id=?',
        [mascota_id, fecha, hora, tipo_cita, observaciones, req.params.id],
        (err) => {
            if (err) return res.json({ exito: false, error: err.message });
            res.json({ exito: true });
        }
    );
});

// CANCELAR CITA
app.patch('/citas/:id/cancelar', (req, res) => {
    db.query(
        'UPDATE citas SET estado="Cancelada" WHERE id=?',
        [req.params.id],
        (err) => {
            if (err) return res.json({ exito: false, error: err.message });
            res.json({ exito: true });
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));