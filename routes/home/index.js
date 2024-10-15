"use strict";
const express = require("express");
const router = express.Router();

const ctrl = require("./home.ctrl")

// 기본 라우트
//메인페이지
router.get('/', ctrl.mainPage);

//업로드
router.get('/upload', ctrl.upload);

//로그인
router.get('/login', ctrl.login);

//기사
router.get('/news', ctrl.news);

module.exports = router;