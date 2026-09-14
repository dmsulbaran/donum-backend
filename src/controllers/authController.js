const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Iniciar sesión
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Por favor ingrese correo y contraseña'
            });
        }

        // Buscar usuario en PostgreSQL
        const result = await db.query(
            'SELECT id, name, email, phone, role, password_hash FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Credenciales inválidas. Usuario no encontrado.'
            });
        }

        const user = result.rows[0];

        // Validar contraseña con bcrypt
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Contraseña incorrecta'
            });
        }

        const sessionToken = `donum_sess_${user.id}_${Date.now()}`;

        return res.status(200).json({
            status: 'success',
            message: 'Sesión iniciada con éxito',
            token: sessionToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor en autenticación'
        });
    }
};

// Registro de nuevo usuario
const register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Nombre, correo y contraseña son obligatorios'
            });
        }

        // Verificar si ya existe
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Este correo electrónico ya está registrado'
            });
        }

        // Encriptar la contraseña de forma segura con bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar en PostgreSQL con el hash seguro
        const insertResult = await db.query(
            `INSERT INTO users (name, email, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, 'customer')
             RETURNING id, name, email, phone, role, created_at`,
            [name.trim(), email.toLowerCase().trim(), phone || '', hashedPassword]
        );

        const newUser = insertResult.rows[0];
        const sessionToken = `donum_sess_${newUser.id}_${Date.now()}`;

        return res.status(201).json({
            status: 'success',
            message: 'Cuenta creada con éxito en Donum',
            token: sessionToken,
            user: newUser
        });

    } catch (error) {
        console.error('Error en register:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al registrar el usuario'
        });
    }
};

// Obtener sesión activa
const getSession = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(200).json({
                authenticated: false,
                user: null
            });
        }

        // Extraer id del token simulado donum_sess_<id>_<timestamp>
        const token = authHeader.replace('Bearer ', '');
        const match = token.match(/donum_sess_(\d+)_/);

        if (match && match[1]) {
            const userId = parseInt(match[1], 10);
            const userRes = await db.query(
                'SELECT id, name, email, phone, role FROM users WHERE id = $1',
                [userId]
            );

            if (userRes.rows.length > 0) {
                return res.status(200).json({
                    authenticated: true,
                    user: userRes.rows[0]
                });
            }
        }

        // Sesión anónima o demo válida si no hay match
        return res.status(200).json({
            authenticated: false,
            user: null
        });

    } catch (error) {
        return res.status(200).json({
            authenticated: false,
            user: null
        });
    }
};

module.exports = { login, register, getSession };