const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { getUserCollection } = require('./database');
const { bootstrapUserDB } = require('./database');
const logger = require('../utils/logger');

function initPassport() {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const userCollection = getUserCollection();
                    const email = profile.emails?.[0]?.value;

                    if (!email) return done(new Error('No email returned from Google'));

                    // Upsert user by Google ID or email
                    let user = await userCollection.findOne({
                        $or: [{ googleId: profile.id }, { Email: email }],
                    });

                    if (!user) {
                        const dbName = `${email.split('@')[0].replace(/[^a-z0-9]/gi, '_')}_db`;
                        const newUser = {
                            Name: profile.displayName,
                            UserName: email.split('@')[0],
                            Email: email,
                            googleId: profile.id,
                            avatarUrl: profile.photos?.[0]?.value || null,
                            authProvider: 'google',
                            Database: dbName,
                            createdAt: new Date(),
                        };

                        await userCollection.insertOne(newUser);
                        await bootstrapUserDB(dbName);
                        user = newUser;
                        logger.info(`New Google user registered: ${email}`);
                    } else if (!user.googleId) {
                        // Existing password user linking Google account
                        await userCollection.updateOne(
                            { _id: user._id },
                            { $set: { googleId: profile.id, avatarUrl: profile.photos?.[0]?.value } }
                        );
                        user.googleId = profile.id;
                    }

                    return done(null, user);
                } catch (err) {
                    logger.error('Google OAuth error:', err);
                    return done(err);
                }
            }
        )
    );
}

module.exports = { initPassport };
