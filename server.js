require('dotenv').config();
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'respira_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const secureCookie = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});
app.use(express.json({ limit: '32kb' }));

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function readSessionToken(req) {
    const cookies = req.headers.cookie || '';
    const cookie = cookies.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
    return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : '';
}

function setSessionCookie(res, token) {
    const secure = secureCookie ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_LIFETIME_MS / 1000}${secure}`);
}

function clearSessionCookie(res) {
    const secure = secureCookie ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

function sessionHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function authenticate(req, res, next) {
    const token = readSessionToken(req);
    if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    try {
        const result = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.correo
             FROM respira_sessions s
             JOIN respira_users u ON u.id_usuario = s.id_usuario
             WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
            [sessionHash(token)]
        );
        if (!result.rowCount) {
            clearSessionCookie(res);
            return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.' });
        }
        req.user = result.rows[0];
        next();
    } catch (error) {
        next(error);
    }
}

app.get(['/favoritos.html', '/carrito.html', '/checkout.html'], async (req, res, next) => {
    const token = readSessionToken(req);
    const returnPath = encodeURIComponent(req.originalUrl);
    const redirectToLogin = () => res.redirect(302, `/cuenta.html?return=${returnPath}`);
    if (!token) return redirectToLogin();

    try {
        const result = await pool.query(
            'SELECT 1 FROM respira_sessions WHERE token_hash = $1 AND expires_at > NOW()',
            [sessionHash(token)]
        );
        if (!result.rowCount) {
            clearSessionCookie(res);
            return redirectToLogin();
        }
        res.sendFile(path.join(__dirname, 'public', path.basename(req.path)));
    } catch (error) {
        next(error);
    }
});

app.use(express.static(path.join(__dirname, 'public')));

function validEmail(value) {
    return typeof value === 'string' && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function validPhone(value) {
    return typeof value === 'string' && /^\d{7,15}$/.test(value);
}

async function initializeSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS respira_users (
            id_usuario BIGSERIAL PRIMARY KEY,
            nombre VARCHAR(120) NOT NULL,
            correo VARCHAR(160) NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS respira_users_email_unique
            ON respira_users (LOWER(correo));
        CREATE TABLE IF NOT EXISTS respira_sessions (
            token_hash CHAR(64) PRIMARY KEY,
            id_usuario BIGINT NOT NULL REFERENCES respira_users(id_usuario) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS respira_sessions_expiry_idx ON respira_sessions (expires_at);
        CREATE TABLE IF NOT EXISTS respira_favorites (
            id_usuario BIGINT NOT NULL REFERENCES respira_users(id_usuario) ON DELETE CASCADE,
            id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id_usuario, id_producto)
        );
        CREATE TABLE IF NOT EXISTS respira_cart (
            id_usuario BIGINT NOT NULL REFERENCES respira_users(id_usuario) ON DELETE CASCADE,
            id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
            cantidad INTEGER NOT NULL CHECK (cantidad > 0),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id_usuario, id_producto)
        );
        ALTER TABLE pedidos
            ADD COLUMN IF NOT EXISTS id_usuario BIGINT REFERENCES respira_users(id_usuario) ON DELETE SET NULL;
    `);
    await pool.query('DELETE FROM respira_sessions WHERE expires_at <= NOW()');
}

app.get('/api/productos', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p
            JOIN categorias c ON p.id_categoria = c.id_categoria
            ORDER BY p.id_producto
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

app.post(['/api/auth/registro', '/api/auth/register'], async (req, res, next) => {
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (nombre.length < 2 || nombre.length > 120 || !validEmail(correo)
        || typeof password !== 'string' || password.length < 10 || password.length > 128) {
        return res.status(400).json({ error: 'Revisa tu nombre, correo y contraseña (mínimo 10 caracteres).' });
    }

    try {
        const salt = crypto.randomBytes(16);
        const passwordHash = Buffer.from(await scrypt(password, salt, 64)).toString('hex');
        const result = await pool.query(
            `INSERT INTO respira_users (nombre, correo, password_hash)
             VALUES ($1, $2, $3) RETURNING id_usuario, nombre, correo`,
            [nombre, correo, `${salt.toString('hex')}:${passwordHash}`]
        );
        const user = result.rows[0];
        const token = crypto.randomBytes(32).toString('base64url');
        await pool.query(
            'INSERT INTO respira_sessions (token_hash, id_usuario, expires_at) VALUES ($1, $2, $3)',
            [sessionHash(token), user.id_usuario, new Date(Date.now() + SESSION_LIFETIME_MS)]
        );
        setSessionCookie(res, token);
        res.status(201).json({ usuario: { id: user.id_usuario, nombre: user.nombre, correo: user.correo } });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
        next(error);
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!validEmail(correo) || typeof password !== 'string' || password.length > 128) {
        return res.status(400).json({ error: 'Correo o contraseña inválidos.' });
    }
    try {
        const result = await pool.query(
            'SELECT id_usuario, nombre, correo, password_hash FROM respira_users WHERE LOWER(correo) = $1',
            [correo]
        );
        if (!result.rowCount) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        const user = result.rows[0];
        const [saltHex, savedHashHex] = user.password_hash.split(':');
        const candidate = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), 64));
        const savedHash = Buffer.from(savedHashHex, 'hex');
        if (candidate.length !== savedHash.length || !crypto.timingSafeEqual(candidate, savedHash)) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }
        const token = crypto.randomBytes(32).toString('base64url');
        await pool.query(
            'INSERT INTO respira_sessions (token_hash, id_usuario, expires_at) VALUES ($1, $2, $3)',
            [sessionHash(token), user.id_usuario, new Date(Date.now() + SESSION_LIFETIME_MS)]
        );
        setSessionCookie(res, token);
        res.json({ usuario: { id: user.id_usuario, nombre: user.nombre, correo: user.correo } });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/recuperar', async (req, res, next) => {
    const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
    if (!validEmail(correo)) return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });

    try {
        await pool.query('SELECT 1 FROM respira_users WHERE LOWER(correo) = $1', [correo]);
        res.json({
            exito: true,
            mensaje: 'Si existe una cuenta con ese correo, se prepararía un enlace de recuperación. El envío es simulado y no se envía un correo real.'
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/auth/me', async (req, res, next) => {
    const token = readSessionToken(req);
    if (!token) return res.json({ usuario: null });
    try {
        const result = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.correo
             FROM respira_sessions s
             JOIN respira_users u ON u.id_usuario = s.id_usuario
             WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
            [sessionHash(token)]
        );
        if (!result.rowCount) {
            clearSessionCookie(res);
            return res.json({ usuario: null });
        }
        const user = result.rows[0];
        res.json({ usuario: { id: user.id_usuario, nombre: user.nombre, correo: user.correo } });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/logout', async (req, res, next) => {
    const token = readSessionToken(req);
    try {
        if (token) await pool.query('DELETE FROM respira_sessions WHERE token_hash = $1', [sessionHash(token)]);
        clearSessionCookie(res);
        res.json({ exito: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/favoritos', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM respira_favorites f
            JOIN productos p ON p.id_producto = f.id_producto
            JOIN categorias c ON c.id_categoria = p.id_categoria
            WHERE f.id_usuario = $1
            ORDER BY f.created_at DESC
        `, [req.user.id_usuario]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

app.put('/api/favoritos/:idProducto', authenticate, async (req, res, next) => {
    const idProducto = Number(req.params.idProducto);
    if (!Number.isSafeInteger(idProducto) || idProducto < 1) return res.status(400).json({ error: 'Producto inválido.' });
    try {
        const result = await pool.query(
            `INSERT INTO respira_favorites (id_usuario, id_producto)
             SELECT $1, id_producto FROM productos WHERE id_producto = $2
             ON CONFLICT (id_usuario, id_producto) DO NOTHING
             RETURNING id_producto`,
            [req.user.id_usuario, idProducto]
        );
        const exists = result.rowCount || (await pool.query('SELECT 1 FROM productos WHERE id_producto = $1', [idProducto])).rowCount;
        if (!exists) return res.status(404).json({ error: 'No encontramos ese producto.' });
        res.json({ exito: true });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/favoritos/:idProducto', authenticate, async (req, res, next) => {
    const idProducto = Number(req.params.idProducto);
    if (!Number.isSafeInteger(idProducto) || idProducto < 1) return res.status(400).json({ error: 'Producto inválido.' });
    try {
        await pool.query('DELETE FROM respira_favorites WHERE id_usuario = $1 AND id_producto = $2', [req.user.id_usuario, idProducto]);
        res.json({ exito: true });
    } catch (error) {
        next(error);
    }
});

app.get('/api/carrito', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre, cart.cantidad AS cantidad_carrito
            FROM respira_cart cart
            JOIN productos p ON p.id_producto = cart.id_producto
            JOIN categorias c ON c.id_categoria = p.id_categoria
            WHERE cart.id_usuario = $1
            ORDER BY cart.updated_at DESC
        `, [req.user.id_usuario]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

app.get('/api/pedidos', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.id_pedido, p.total, p.estado,
                   COALESCE(
                       json_agg(json_build_object(
                           'nombre', pr.nombre,
                           'cantidad', dp.cantidad,
                           'precio_unitario', dp.precio_unitario
                       ) ORDER BY dp.id_producto) FILTER (WHERE dp.id_producto IS NOT NULL),
                       '[]'::json
                   ) AS productos
            FROM pedidos p
            LEFT JOIN detalle_pedidos dp ON dp.id_pedido = p.id_pedido
            LEFT JOIN productos pr ON pr.id_producto = dp.id_producto
            WHERE p.id_usuario = $1
            GROUP BY p.id_pedido
            ORDER BY p.id_pedido DESC
        `, [req.user.id_usuario]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

app.put('/api/carrito/:idProducto', authenticate, async (req, res, next) => {
    const idProducto = Number(req.params.idProducto);
    const cantidad = Number(req.body?.cantidad);
    if (!Number.isSafeInteger(idProducto) || idProducto < 1
        || !Number.isSafeInteger(cantidad) || cantidad < 1) {
        return res.status(400).json({ error: 'El producto o la cantidad no son válidos.' });
    }
    let client;
    let transactionStarted = false;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        const product = await client.query('SELECT stock FROM productos WHERE id_producto = $1 FOR UPDATE', [idProducto]);
        if (!product.rowCount) throw httpError(404, 'No encontramos ese producto.');
        if (Number(product.rows[0].stock) < cantidad) throw httpError(409, 'No hay stock suficiente para esa cantidad.');
        await client.query(
            `INSERT INTO respira_cart (id_usuario, id_producto, cantidad, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id_usuario, id_producto)
             DO UPDATE SET cantidad = EXCLUDED.cantidad, updated_at = NOW()`,
            [req.user.id_usuario, idProducto, cantidad]
        );
        await client.query('COMMIT');
        transactionStarted = false;
        res.json({ exito: true });
    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error al revertir la actualización del carrito:', rollbackError);
            }
        }
        next(error);
    } finally {
        client?.release();
    }
});

app.delete('/api/carrito/:idProducto', authenticate, async (req, res, next) => {
    const idProducto = Number(req.params.idProducto);
    if (!Number.isSafeInteger(idProducto) || idProducto < 1) return res.status(400).json({ error: 'Producto inválido.' });
    try {
        await pool.query('DELETE FROM respira_cart WHERE id_usuario = $1 AND id_producto = $2', [req.user.id_usuario, idProducto]);
        res.json({ exito: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/checkout', authenticate, async (req, res, next) => {
    const cliente = req.body?.cliente;
    if (!cliente || typeof cliente !== 'object'
        || !validPhone(cliente.telefono)
        || typeof cliente.direccion !== 'string' || cliente.direccion.trim().length < 5 || cliente.direccion.trim().length > 220
    ) {
        return res.status(400).json({ exito: false, error: 'El teléfono o la dirección no son válidos.' });
    }

    let client;
    let transactionStarted = false;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        const cartResult = await client.query(
            `SELECT p.id_producto, p.precio, p.stock, cart.cantidad
             FROM respira_cart cart
             JOIN productos p ON p.id_producto = cart.id_producto
             WHERE cart.id_usuario = $1
             FOR UPDATE OF cart, p`,
            [req.user.id_usuario]
        );
        if (!cartResult.rowCount) throw httpError(400, 'Tu carrito está vacío.');
        let totalPedido = 0;
        for (const product of cartResult.rows) {
            const quantity = Number(product.cantidad);
            if (!product || Number(product.stock) < quantity) throw httpError(409, 'El stock cambió. Actualiza el carrito e inténtalo nuevamente.');
            totalPedido += Number(product.precio) * quantity;
        }
        if (!Number.isFinite(totalPedido) || totalPedido <= 0) throw httpError(400, 'El total del pedido no es válido.');

        const clienteRes = await client.query(
            `INSERT INTO clientes (nombre_completo, correo, telefono, direccion)
             VALUES ($1, $2, $3, $4) RETURNING id_cliente`,
            [req.user.nombre, req.user.correo, cliente.telefono, cliente.direccion.trim()]
        );
        const pedidoRes = await client.query(
            `INSERT INTO pedidos (id_cliente, id_usuario, total, estado)
             VALUES ($1, $2, $3, 'Simulado') RETURNING id_pedido`,
            [clienteRes.rows[0].id_cliente, req.user.id_usuario, totalPedido]
        );
        const idPedido = pedidoRes.rows[0].id_pedido;
        for (const product of cartResult.rows) {
            const id = Number(product.id_producto);
            const quantity = Number(product.cantidad);
            const price = Number(product.precio);
            await client.query(
                `INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [idPedido, id, quantity, price]
            );
            await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2 AND stock >= $1',
                [quantity, id]
            );
        }
        await client.query(
            `INSERT INTO pagos (id_pedido, metodo_pago, tarjeta_enmascarada, monto, estado_pago)
             VALUES ($1, 'Simulación', 'Sin tarjeta', $2, 'Simulado')`,
            [idPedido, totalPedido]
        );
        await client.query('DELETE FROM respira_cart WHERE id_usuario = $1', [req.user.id_usuario]);
        await client.query('COMMIT');
        transactionStarted = false;
        res.json({
            exito: true,
            mensaje: '¡Pago realizado con éxito! Tu pedido ha sido registrado y procesado correctamente.',
            idPedido,
            total: totalPedido
        });
    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error al revertir el pedido:', rollbackError);
            }
        }
        if (error.status) return res.status(error.status).json({ exito: false, error: error.message });
        next(error);
    } finally {
        if (client) client.release();
    }
});

app.use((error, req, res, next) => {
    console.error('Error de API:', error);
    if (res.headersSent) return next(error);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
        ? error.status
        : 500;
    res.status(status).json({
        error: status === 500 ? 'Ocurrió un error interno. Inténtalo nuevamente.' : error.message
    });
});

const PORT = process.env.PORT || 3001;
initializeSchema()
    .then(() => app.listen(PORT, () => console.log(`Servidor respira+ listo en http://localhost:${PORT}`)))
    .catch(error => {
        console.error('No se pudo inicializar la base de datos de cuentas/favoritos:', error);
        process.exitCode = 1;
    });
