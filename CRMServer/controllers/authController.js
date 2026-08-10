const bcrypt = require('bcryptjs');
const passport = require('passport');
const { generateToken, verifyToken } = require('../utils/jwt');
const { getUserCollection, bootstrapUserDB } = require('../config/database');
const { success, created, badRequest, unauthorized, serverError } = require('../utils/response');
const logger = require('../utils/logger');

const REFRESH_COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function buildTokenPayload(user) {
    return {
        id: user._id?.toString(),
        username: user.UserName,
        email: user.Email,
    };
}

// ─── Password Login ──────────────────────────────────────────────────────────

async function login(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) return badRequest(res, 'Username and password are required');

        const userCollection = getUserCollection();
        const user = await userCollection.findOne({ UserName: username });

        if (!user) return unauthorized(res, 'Invalid credentials');

        // Google-only accounts won't have a Password field
        if (!user.Password) return badRequest(res, 'This account uses Google login');

        const match = await bcrypt.compare(password, user.Password);
        if (!match) return unauthorized(res, 'Invalid credentials');

        const payload = buildTokenPayload(user);
        const accessToken = generateToken(payload, 'access');
        const refreshToken = generateToken(payload, 'refresh');

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
        return success(res, { accessToken, user: { name: user.Name, username: user.UserName, email: user.Email, avatarUrl: user.avatarUrl } });
    } catch (err) {
        logger.error('Login error:', err);
        return serverError(res, err);
    }
}

// ─── Register ────────────────────────────────────────────────────────────────

async function register(req, res) {
    try {
        const { fullname, username, email, password } = req.body;
        if (!fullname || !username || !email || !password) {
            return badRequest(res, 'All fields are required');
        }

        const userCollection = getUserCollection();

        const existing = await userCollection.findOne({
            $or: [{ UserName: username }, { Email: email }],
        });
        if (existing) return badRequest(res, 'Username or email already taken');

        const hashedPassword = await bcrypt.hash(password, 12);
        const dbName = `${username.replace(/[^a-z0-9]/gi, '_')}_db`;

        const newUser = {
            Name: fullname,
            UserName: username,
            Email: email,
            Password: hashedPassword,
            authProvider: 'local',
            Database: dbName,
            createdAt: new Date(),
        };

        await userCollection.insertOne(newUser);
        await bootstrapUserDB(dbName);

        logger.info(`New user registered: ${username}`);
        return created(res, { message: 'Registration successful' });
    } catch (err) {
        logger.error('Register error:', err);
        return serverError(res, err);
    }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

async function refresh(req, res) {
    const token = req.cookies?.refreshToken;
    if (!token) return unauthorized(res, 'No refresh token');

    try {
        const payload = verifyToken(token);
        if (payload.ttype !== 'refresh') return unauthorized(res, 'Invalid token type');

        const newAccessToken = generateToken(
            { id: payload.id, username: payload.username, email: payload.email },
            'access'
        );
        return success(res, { accessToken: newAccessToken });
    } catch (err) {
        if (err.name === 'TokenExpiredError') return unauthorized(res, 'Refresh token expired, please log in again');
        return unauthorized(res, 'Invalid refresh token');
    }
}

// ─── Logout ──────────────────────────────────────────────────────────────────

function logout(req, res) {
    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTS, maxAge: 0 });
    return success(res, { message: 'Logged out successfully' });
}

// ─── Google OAuth callbacks ───────────────────────────────────────────────────

function googleAuth(req, res, next) {
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
}

function googleCallback(req, res, next) {
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }, (err, user) => {
        if (err || !user) {
            logger.error('Google callback error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
        }

        const payload = buildTokenPayload(user);
        const accessToken = generateToken(payload, 'access');
        const refreshToken = generateToken(payload, 'refresh');

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);

        // Redirect to frontend with access token in query (frontend stores in memory)
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${accessToken}`);
    })(req, res, next);
}

// ─── Auth Check ──────────────────────────────────────────────────────────────

function checkAuth(req, res) {
    // req.user is already set by authMiddleware
    return success(res, { user: req.user });
}

module.exports = { login, register, refresh, logout, googleAuth, googleCallback, checkAuth };
