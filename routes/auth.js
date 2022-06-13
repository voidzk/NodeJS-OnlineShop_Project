const express = require('express');
const { check, body } = require('express-validator');
const User = require('../models/user');
const authController = require('../controllers/auth');

const router = express();

router.get('/login', authController.getLogin);
router.post(
    '/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
            .normalizeEmail(),
        body('password', 'Password has to be valid.')
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
    ],
    authController.postLogin
);
//---------------------------------------------
router.get('/signup', authController.getSignup);
router.post(
    '/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Please enter a valid E-mail')
            .custom(async (value, { req }) => {
                if (value === 'custom@custom.com') {
                    throw new Error('no customs allowed sir..');
                }
                isExist = await User.findOne({ email: value });
                if (isExist) {
                    return Promise.reject('Email Already exist');
                }
                return true;
            })
            .normalizeEmail(),
        body(
            'password',
            'password must be text,numbers and at least 5 charcters'
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
        body('confirmPassword')
            .trim()
            .custom((value, { req }) => {
                if (value !== req.body.password)
                    throw new Error('Password does not match!');

                return true;
            }),
    ],
    authController.postSignup
);
//---------------------------------------------------
router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);
module.exports = router;
