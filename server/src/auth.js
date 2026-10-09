import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import { HttpError, publicUser } from './security.js';

// Verificar siempre: algoritmo, emisor, audiencia y caducidad. Los permisos
// actuales se cargan de PostgreSQL y no se aceptan desde el cuerpo o el JWT.
export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Inicia sesión para continuar.');
    let claims;
    try { claims = jwt.verify(header.slice(7), config.jwtSecret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience }); }
    catch { throw new HttpError(401, 'La sesión no es válida o ha caducado.'); }
    if (!claims.sub || !claims.exp) throw new HttpError(401, 'La sesión no es válida.');
    const result = await pool.query('SELECT * FROM public.auth_user($1::uuid)', [claims.sub]);
    const user = result.rows[0];
    if (!user || user.status !== 'active') throw new HttpError(401, 'La cuenta no está activa.');
    req.user = user;
    next();
  } catch (error) { next(error); }
}

export function requireStaff(req, res, next) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) return next(new HttpError(403, 'Esta operación requiere permisos de administrador.'));
  next();
}

export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Inténtalo en unos minutos.' } });

let dummyHash;
export async function login(req, res) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || email.length > 320 || !password || password.length > 1024) throw new HttpError(400, 'Introduce un correo y una contraseña válidos.');
  const { rows } = await pool.query('SELECT * FROM public.auth_lookup($1::text)', [email]);
  const user = rows[0];
  dummyHash ||= await argon2.hash('dummy-password-unavailable-account', { type: argon2.argon2id });
  const matches = await argon2.verify(user?.password_hash || dummyHash, password);
  if (!user || user.status !== 'active' || !matches) throw new HttpError(401, 'Correo o contraseña incorrectos.');
  const token = jwt.sign({}, config.jwtSecret, { algorithm: 'HS256', subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: '8h' });
  res.json({ token, user: publicUser(user) });
}
