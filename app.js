/* eslint-disable no-unused-vars */

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
require('dotenv').config();
//----------------------------------

const errorController = require('./controllers/error');
const User = require('./models/user');
//--------------------------------------------------------------------
console.log(process.env);
const MONGODB_URI = process.env.MONGODB_URI;
const app = express();
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions',
});
const csrfProtection = csrf();
//----------------------------------------
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },

    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().slice(-6) + '-' + file.originalname);
    },
});

// @ts-ignore
const fileFilter = (req, file, cb) => {
    console.log(file.mimetype);
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
//----------------------------------------
app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
//-------------------------------------------------------

app.use(bodyParser.urlencoded({ extended: false }));

// app.use(multer({ storage: fileStorage }).single('image'));
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

//------------NOTE async function
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: store,
    })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});
//---------------------------------------------

//----------------

// @ts-ignore
app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }

    User.findById(req.session.user._id)
        .then(user => {
            if (!user) return next();

            req.user = user;
            next();
        })
        .catch(err => {
            console.log(err);
            next(new Error(err));
        });
});
//------------------------------------------
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500', errorController.get500);
app.use(errorController.get404);

//--------------------
let PORT = process.env.PORT || 3000;
app.use((error, req, res, next) => {
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
        isAuthenticated: true,
    });
});

mongoose
    .connect(MONGODB_URI)

    .then(res => {
        app.listen(PORT);
        console.log(`listening on ${PORT}...`);
    })

    .catch(err => console.log(err));
