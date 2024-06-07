const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const session = require('express-session');
const User = require('./models/User'); // Create User model

const app = express();

// Configure session
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (token, tokenSecret, profile, done) => {
    User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return done(err, user);
    });
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

// Routes for Google OAuth
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

module.exports = app;
