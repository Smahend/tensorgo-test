const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const session = require('express-session');
const CustomerRequest = require('./models/CustomerRequest');
const axios = require('axios');
require('dotenv').config();

const app = express();

// MongoDB connection
mongoose.connect('mongodb://localhost/customer_service', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = mongoose.model('User', new mongoose.Schema({
    googleId: String,
    email: String,
    name: String
}));

// Configure session
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (token, tokenSecret, profile, done) => {
    User.findOneAndUpdate(
        { googleId: profile.id },
        { email: profile.emails[0].value, name: profile.displayName },
        { upsert: true, new: true },
        (err, user) => {
            return done(err, user);
        }
    );
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

app.get('/api/current_user', (req, res) => {
    res.send(req.user);
});

app.post('/api/requests', (req, res) => {
    if (!req.user) {
        return res.status(401).send('Unauthorized');
    }

    const newRequest = new CustomerRequest({
        userId: req.user.id,
        category: req.body.category,
        comments: req.body.comments
    });

    newRequest.save()
        .then(request => res.status(201).json(request))
        .catch(err => res.status(400).json(err));
});

// Endpoint to retrieve customer service requests by category
app.get('/api/requests/:category', (req, res) => {
    CustomerRequest.find({ category: req.params.category })
        .then(requests => res.json(requests))
        .catch(err => res.status(400).json(err));
});

app.post('/api/requests', async (req, res) => {
    if (!req.user) {
        return res.status(401).send('Unauthorized');
    }

    const newRequest = new CustomerRequest({
        userId: req.user.id,
        category: req.body.category,
        comments: req.body.comments
    });

    try {
        const savedRequest = await newRequest.save();

        // Send request to Intercom
        await axios.post('https://api.intercom.io/messages', {
            message_type: 'inapp',
            body: req.body.comments,
            from: {
                type: 'user',
                id: req.user.id
            }
        }, {
            headers: {
                Authorization: `Bearer YOUR_INTERCOM_ACCESS_TOKEN`,
                Accept: 'application/json'
            }
        });

        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json(err);
    }
});

// Start server
app.listen(5000, () => console.log('Server running on http://localhost:5000'));
