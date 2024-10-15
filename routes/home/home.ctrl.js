"use strict";


const upload = (req, res) => {
    res.render("home/upload");
};

const mainPage = (req, res) => {
    res.render("home/index");
};

const login = (req, res) => {
    res.render("home/login")
};

const news = (req, res) => {
    res.render("home/news")
};


module.exports = {
    upload,
    mainPage,
    login,
    news,
};
