const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 기본 라우트
app.get('/', (req, res) => {
    res.send(
        `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Main Page</title>
                <link rel="stylesheet" href="main_styles.css" />
            </head>
            <body>
                <div class="title-bar">
                    <h1>404 Not Found</h1>
                </div>
            </body>
        </html>
        `
        );
});

app.get('/upload', (req, res) => {
    res.send(`
    <!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title>뉴스 올리기</title>
		<link rel="stylesheet" href="upload_styles.css" />
	</head>
	<body></body>
</html>
    `);
});

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Login Page</title>
                <script src="login_script.js"></script>
                <link rel="stylesheet" href="login_styles.css" />
            </head>
            <body>
                <img src="logo.png" alt="Logo" class="kjdlogo" />
                
                <div class="wrapper">
                    <form action="/login" method="POST">
                        <h1>로그인</h1>
        
                        <div class="input-box">
                            <input type="text" name="username" placeholder="아이디" required />
                        </div>
        
                        <div class="input-box">
                            <input type="password" name="password" placeholder="비밀번호" required />
                        </div>
        
                        <button type="submit" class="btn" onclick="showAlert()">로그인</button>
        
                        <div class="register-link">
                            <p>계정이 없으십니까? <a href="#">가입하기</a></p>
                        </div>
                    </form>
                </div>
        
                <img src="/picture1.png" alt="Logo" class="logo" />
            </body>
        </html>
    `);
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
