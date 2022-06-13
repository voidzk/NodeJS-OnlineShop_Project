const { Schema } = require('mongoose');
const { validationResult } = require('express-validator');
const path = require('path');
const fileHelper = require('../util/file');

const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
    });
};
//!---------------------------------------------

exports.postAddProduct = (req, res, next) => {
    console.log('POST add product -->');
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    //----------------------------------------------
    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description,
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: [],
        });
    }
    //----------------------------------------------
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
        });
    }
    //--------------------------------------------
    const imageUrl = image.path;

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user,
    });
    return product
        .save()
        .then(result => {
            res.redirect('/admin/products');
        })
        .catch(err => {
            console.log('in catching error...');
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

//!--------------------------------------------------
exports.getProducts = (req, res, next) => {
    Product.find({ userId: req.user._id })
        .then(products => {
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products',
            });
        })
        .catch(err => {
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

//! --------------------------------------------------
exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;

    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;

    Product.findById(prodId)
        .then(product => {
            if (
                !product ||
                product.userId.toString() !== req.user._id.toString()
            ) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: [],
            });
        })
        .catch(err => {
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
//--------------------------------------------------
exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;

    const errors = validationResult(req);

    if (!prodId) {
        console.log('back off bro..');
        return res.redirect('/');
    }

    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: productUpdated.title,
                price: productUpdated.price,
                description: productUpdated.description,
                _id: prodId,
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
        });
    }
    //----------------------------------------------------
    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            // Object.keys(productUpdated).forEach(prop => {
            //     product[prop] = productUpdated[prop];
            // });
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDesc;
            if (image) {
                fileHelper.deleteFile(product.imageUrl);
                product.imageUrl = image.path;
            }
            return product.save().then(result => {
                console.log('UPDATED');
                res.redirect('/admin/products');
            });
        })

        .catch(err => {
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// ! --------------------------------------------------
// postDeleteProduct =()
exports.deleteProduct = (req, res, next) => {
    console.log('deleting product..');
    // const prodId = req.body.productId;
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return next(new Error('Product is not exist'));
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product.deleteOne({ _id: prodId, userId: req.user._id });
        })
        .then(() => {
            console.log('product deleted!');
            // res.redirect('/admin/products');
            res.status(200).json({ message: 'Success!' });
        })

        .catch(err => {
            // console.log(err);
            // const error = new Error(err);
            // error.httpStatusCode = 500;
            // return next(error);
            res.status(500).json({ message: 'Deleting failed..' });
        });
};
