const { Schema } = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
//-------------------------------------------------------------------22

let configOptions = {
    host: process.env.MAILER_HOST,
    port: 587,
    secure: false, // use TLS
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PW,
    },
};
const transporter = nodemailer.createTransport(configOptions);
//---------------------------------------------------------------------------------

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) message = message[0];
    else message = null;
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
        },
        validationErrors: [],
    });
};

exports.postLogin = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
            },
            validationErrors: errors.array(),
        });
    }
    let user = await User.findOne({ email: email });
    if (!user) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
                email: email,
                password: password,
            },
            validationErrors: [],
        });
    }

    //-------------------------------
    let IsPwValid = await bcrypt.compare(password, user.password);
    if (!IsPwValid) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
                email: email,
                password: password,
            },
            validationErrors: [],
        });
    }

    //-------------------------

    req.session.isLoggedIn = true;
    req.session.user = user;

    req.session.save(err => {
        if (err) console.log(err);
        console.log('logging in...');
        console.log('after saving', req.session.isLoggedIn);
        res.redirect('/');
    });
};
//-------------
exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) message = message[0];
    else message = null;
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: '',
        },
        validationErrors: [],
    });
};
exports.postSignup = async (req, res, next) => {
    console.log('signing up...');
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword,
            },
            validationErrors: errors.array(),
        });
    }

    let hashPw = await bcrypt.hash(password, 12);
    const user = new User({
        email: email,
        password: hashPw,
        cart: { items: [] },
    });
    await user.save().catch(err => {
        console.log('error happening trying to save user into DB');
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });

    transporter.sendMail(
        {
            to: email,
            from: 'shop@node-course.com',
            subject: 'Sign up sucessful!',
            html: '<h1> You successfully signed up!</h1>',
        },

        (err, data) => {
            if (err) console.log(err);
            else {
                console.log(data);
            }
        }
    );
    return res.redirect('/login');
};

exports.postLogout = (req, res, next) => {
    console.log(req.session);
    req.session.destroy(err => {
        if (err) console.log(err);
        console.log('logging out..');
        return res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) message = message[0];
    else message = null;
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message,
    });
};

exports.postReset = async (req, res, next) => {
    let user = await User.findOne({ email: req.body.email });
    console.log('awaiting..');
    if (!user) {
        req.flash('error', 'Email does not exist');
        return res.redirect('/reset');
    }
    console.log('DONE..');
    crypto.randomBytes(32, async (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }

        const token = buffer.toString('hex');
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 360000;
        let result = await user.save();
        transporter.sendMail(
            {
                to: req.body.email,
                from: 'void@node-course.com',
                subject: 'ShopWebsite-Password Reset',
                html: `
                <p> you requested password reset</p>
                <p>Click this link <a href="http://localhost:3000/reset/${token}">link</a> to set new password.</p>
                `,
            },

            (err, data) => {
                if (err) console.log(err);
                else {
                    console.log(data);
                    return res.redirect('/login');
                }
            }
        );
        res.redirect('/');
    });
};

exports.getNewPassword = async (req, res, next) => {
    const token = req.params.token;
    let user = await User.findOne({
        resetToken: token,
        resetTokenExpiration: { $gt: Date.now() },
    });
    if (!user) {
        req.flash('error', 'session error please try again');
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
    return res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New password',
        userId: user._id.toString(),
        passwordToken: token,
        errorMessage: null,
    });
};

exports.postNewPassword = async (req, res, next) => {
    const password = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;

    let user = await User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId,
    });
    if (!user) {
        req.flash('error', 'Authentication failed');
        return res.redirect('/login');
    }
    bcrypt.hash(password, 12, async (err, hash) => {
        if (err) return console.log(err);
        user.password = hash;
        user.resetToken = undefined;
        user.resetTokenExpiration = undefined;
        await user.save().catch(err => {
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
        res.redirect('/login');
    });
};
