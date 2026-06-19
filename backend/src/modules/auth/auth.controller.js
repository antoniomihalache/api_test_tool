import { AuthService } from './auth.service.js';

const svc = new AuthService();

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw Object.assign(new Error('email and password required'), { statusCode: 400 });
    const data = await svc.login(email, password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listAuthConfigs(req, res, next) {
  try {
    const data = await svc.listConfigs();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAuthConfig(req, res, next) {
  try {
    const data = await svc.getConfigById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAuthConfig(req, res, next) {
  try {
    const data = await svc.createConfig(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAuthConfig(req, res, next) {
  try {
    const data = await svc.updateConfig(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAuthConfig(req, res, next) {
  try {
    await svc.deleteConfig(req.params.id);
    res.json({ success: true, message: 'Auth config deleted' });
  } catch (err) {
    next(err);
  }
}
