// 필요한 모듈을 가져옵니다.
const express = require("express");
const mysql = require("mysql2/promise"); // promise를 사용하는 mysql2 모듈
const bcrypt = require("bcrypt"); // 비밀번호 해시를 위한 bcrypt 모듈
const session = require("express-session"); // 사용자 세션 관리를 위한 express-session 모듈
require("dotenv").config(); // .env 파일에서 환경 변수를 불러옵니다.

//파일 업로드 기능을 위한 미들웨어
const multer = require("multer"); // multer 모듈 추가
const path = require("path");

// Express 애플리케이션을 초기화합니다.
const app = express();

// 서버 포트 설정
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// JSON 및 URL-encoded 데이터 파싱 미들웨어를 추가합니다.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 화면 엔진을 EJS로 설정하여 템플릿을 렌더링합니다.
app.set("view engine", "ejs");

// 정적 파일 경로 설정
app.use("/public", express.static("public"));

app.use(
	session({
		secret: "your_secret_key", // 비밀 키 설정
		resave: false,
		saveUninitialized: true,
		cookie: { secure: false }, // HTTPS 환경에서 secure: true 설정
	})
);

// MySQL 연결 풀 생성
const db = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
});

// Multer 파일 업로드 설정
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/"); // 파일 저장 경로
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname)); // 파일 이름 설정
	},
});
const upload = multer({ storage: storage }); // multer 설정 완료
const moment = require("moment"); // moment 모듈 가져오기 (시간 포맷을 위한)

// 인증 확인 미들웨어
function isAuthenticated(req, res, next) {
	if (req.session.userId) {
		return next();
	}
	res.status(401).send("You need to log in");
}

// 날짜 포맷 함수 추가
function formatDate(dateString) {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0"); // 월 2자리 포맷
	const day = String(date.getDate()).padStart(2, "0"); // 일 2자리 포맷
	return `${year}년 ${month}월 ${day}일`;
}

// 시간 차이 계산 함수 (서버에서 처리)
function timeAgo(createdAt) {
	const now = new Date();
	const diffInSeconds = Math.floor((now - new Date(createdAt)) / 1000);
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	const diffInHours = Math.floor(diffInMinutes / 60);
	const diffInDays = Math.floor(diffInHours / 24);

	if (diffInMinutes < 1) {
		return "방금 전";
	} else if (diffInMinutes < 60) {
		return `${diffInMinutes}분 전`;
	} else if (diffInHours < 24) {
		return `${diffInHours}시간 전`;
	} else {
		return `${diffInDays}일 전`;
	}
}

// 시간 표기 함수 수정
function formatTime(createdAt, format = "YYYY-MM-DD HH:mm") {
	return moment(createdAt).format(format);
}

// 로그인 페이지를 위한 GET 라우트
app.get("/login", (req, res) => {
	res.render("login");
});

// 로그인 요청 처리를 위한 POST 라우트
app.post("/login", async (req, res) => {
	const { username, password } = req.body;
	console.log("Username:", username, "Password:", password); // 디버그용 로그 추가

	try {
		// 데이터베이스에서 사용자 정보를 조회
		const [results] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

		if (results.length === 0) {
			res.status(401).send("Incorrect username or password");
			return;
		}

		console.log("Retrieved hash:", results[0].password); // 해시된 비밀번호 디버그 로그
		const isMatch = await bcrypt.compare(password, results[0].password);

		if (!isMatch) {
			res.status(401).send("Incorrect username or password");
			return;
		}

		// 로그인 성공 시 세션에 사용자 ID 저장
		req.session.userId = results[0].id;
		res.redirect("/"); //로그인 성공 시 메인 페이지 리디렉션
	} catch (err) {
		console.error("Error during login:", err);
		res.status(500).send("Login failed");
	}
});

// 로그아웃 라우터 설정
app.get("/logout", (req, res) => {
	// 세션 삭제 후 리다이렉트
	req.session.destroy((err) => {
		if (err) {
			console.error(err);
			return res.redirect("/"); // 오류 발생 시 홈으로 리다이렉트
		}
		res.clearCookie("connect.sid"); // 세션 쿠키 삭제
		res.redirect("/"); // 홈 페이지로 리다이렉트
	});
});

// //계정 삭제를 처리하는 POST 라우트
// app.delete("/delete-account", async (req, res) => {
// 	try {
// 		const userId = req.session.userId; // 현재 세션의 사용자 ID 가져오기

// 		// 로그인 상태 확인
// 		if (!userId) {
// 			return res.status(401).json({ message: "Unauthorized: You must be logged in to delete your account." });
// 		}

// 		// 계정 삭제 쿼리 실행
// 		await db.query("DELETE FROM users WHERE id = ?", [userId]);

// 		// 세션 삭제
// 		req.session.destroy((err) => {
// 			if (err) {
// 				console.error("Error destroying session:", err);
// 			}
// 			console.log("삭제 성공");
// 			console.log("redirect 직전");
// 			res.redirect("/");
// 		});
// 	} catch (err) {
// 		console.error("Error deleting account:", err);
// 		res.status(500).json({ message: "An error occurred while deleting the account." });
// 	}
// });

//계정 삭제 및 로그아웃
app.delete("/delete-account", async (req, res) => {
	try {
		const userId = req.session.userId; // 현재 세션의 사용자 ID 가져오기

		// 계정 삭제 쿼리 실행
		await db.query("DELETE FROM users WHERE id = ?", [userId]);

		// 세션 삭제 및 로그아웃
		req.session.destroy((err) => {
			if (err) {
				console.error("Error destroying session:", err);
			}
			console.log("계정 삭제 성공");
			res.status(200).json({
				message: "Account deleted and logged out successfully.",
				redirectUrl: "/", // 리다이렉트할 URL
			});
		});
	} catch (err) {
		console.error("Error deleting account and logging out:", err);
		res.status(500).json({ message: "An error occurred while deleting the account." });
	}
});

app.get("/", async (req, res) => {
	try {
		const [articles] = await db.query(`
							SELECT 
									articles.id, 
									articles.title, 
									articles.content, 
									articles.category, 
									articles.created_at, 
									articles.views,
									articles.attachment,
									users.username AS author_name 
							FROM articles 
							JOIN users ON articles.author_id = users.id
							ORDER BY articles.created_at DESC
					`);
		const articlesArray = articles.map((article) => {
			article.timeAgo = timeAgo(article.created_at); // 기존 상대시간
			article.createdAtFormatted = formatDate(article.created_at); // 포맷된 날짜 추가
			return article;
		});
		const latestArticles = [...articlesArray];
		const topArticles = [...articlesArray].sort((a, b) => b.views - a.views).slice(0, 5);
		const mainArticle = [...articlesArray].sort((a, b) => b.views - a.views).slice(0, 1);
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}

		res.render("index", {
			articles: articlesArray,
			latestArticles,
			topArticles,
			mainArticle,
			sessionId,
		});
	} catch (err) {
		console.error("Error fetching articles:", err);
		res.status(500).send("기사를 불러오지 못합니다.");
	}
});

// 회원가입 페이지를 위한 GET 라우트
app.get("/register", (req, res) => {
	res.render("register");
});

app.post("/register", async (req, res) => {
	const { username, password } = req.body;

	try {
		const [existingUsername] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
		if (existingUsername.length > 0) {
			return res.status(400).render("already_exists");
		}
		const hashedPassword = await bcrypt.hash(password, 10);
		await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
		res.status(200).render("registration_success");
	} catch (err) {
		console.error("Error during registration:", err);
		return res.status(500).render("registration_failed");
	}
});

app.post("/registratoin_success", async (req, res) => {
	let sessionId = req.session.userId; // 세션에서 userId 가져오기

	if (!sessionId || sessionId === "undefined") {
		sessionId = "none";
	}
	const usernameId = await db.query("SELECT username, FROM users WHERE id = ?", [userId]);

	res.render("registratoin_success", usernameId);
});

//프로필 페이지를 위한 GET 라우트
app.get("/profile/:id", async (req, res) => {
	const userId = req.params.id; // URL에서 사용자 ID 추출

	try {
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}
		// SQL 쿼리를 사용하여 사용자 정보 가져오기
		const [userinfo] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
		const [articles] = await db.query("SELECT * FROM articles WHERE author_id = ? ", [userId]);

		if (userinfo.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		const articlesArray = articles.map((article) => {
			article.timeAgo = timeAgo(article.created_at); // 기존 상대시간
			article.createdAtFormatted = formatDate(article.created_at); // 포맷된 날짜 추가
			return article;
		});
		const article = [...articlesArray];

		// 사용자 정보 반환
		res.render("profile", {
			user: userinfo[0],
			articles: articlesArray,
			article,
			sessionId,
		}); // profile.ejs로 데이터 전달
	} catch (err) {
		console.error("Error fetching user data:", err);
		res.status(500).json({ error: "Failed to fetch user data" });
	}
});

//프로필 페이지를 위한 GET 라우트
app.get("/profile/:id/edit", isAuthenticated, async (req, res) => {
	const userId = req.params.id; // URL에서 사용자 ID 추출

	try {
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}
		// SQL 쿼리를 사용하여 사용자 정보 가져오기
		const [userinfo] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
		const [articles] = await db.query("SELECT * FROM articles WHERE author_id = ? ", [userId]);

		if (userinfo.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		const articlesArray = articles.map((article) => {
			article.timeAgo = timeAgo(article.created_at); // 기존 상대시간
			article.createdAtFormatted = formatDate(article.created_at); // 포맷된 날짜 추가
			return article;
		});
		const article = [...articlesArray];

		// 사용자 정보 반환
		res.render("edit_profile", {
			user: userinfo[0],
			articles: articlesArray,
			article,
			sessionId,
		}); // profile.ejs로 데이터 전달
	} catch (err) {
		console.error("Error fetching user data:", err);
		res.status(500).json({ error: "Failed to fetch user data" });
	}
});

//전체 프로필 페이지를 위한 GET 라우트
app.get("/profiles", async (req, res) => {
	try {
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}

		// 모든 사용자와 게시물 데이터 가져오기
		const [users] = await db.query("SELECT * FROM users");
		const [allArticles] = await db.query("SELECT * FROM articles");

		// 작성자별로 게시물 수 집계
		const articleCountByUserId = allArticles.reduce((acc, article) => {
			const authorId = article.author_id;
			acc[authorId] = (acc[authorId] || 0) + 1; // 작성자 ID별로 갯수 추가
			return acc;
		}, {});

		// 유저 데이터에 작성 글 수 추가
		const usersWithArticleCount = users.map((user) => ({
			...user,
			articleCount: articleCountByUserId[user.id] || 0, // 작성자가 작성한 글 수 (없으면 0)
		}));

		// 사용자 정보와 게시물 반환
		res.render("all_profile", {
			users: usersWithArticleCount,
			sessionId,
		}); // all_profile.ejs로 데이터 전달
	} catch (err) {
		console.error("Error fetching profiles data:", err);
		res.status(500).json({ error: "Failed to fetch profiles data" });
	}
});

// 게시글 작성 폼을 렌더링하는 GET 라우트 (로그인 확인)
app.get("/articles/new", isAuthenticated, (req, res) => {
	try {
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}

		res.render("new_article", { sessionId });
	} catch (err) {
		console.error("Error fetching userId:", err);
		res.status(500).json({ message: "Failed to fetch userId" });
	}
});

// 게시글 작성 요청을 처리하는 POST 라우트
app.post("/articles", isAuthenticated, upload.single("attachment"), async (req, res) => {
	const { title, content, category } = req.body;
	const authorId = req.session.userId;
	const filePath = req.file ? req.file.path : null;

	try {
		await db.query("INSERT INTO articles (title, content, author_id, category, attachment) VALUES (?, ?, ?, ?, ?)", [
			title,
			content,
			authorId,
			category,
			filePath,
		]);
		console.log(`filePath : ${filePath}`);

		res.redirect("/");
	} catch (err) {
		console.error("Error during article creation:", err);
		res.status(500).send("Failed to create article");
	}
});

// 게시글 수정 폼을 렌더링하는 GET 라우트
app.get("/articles/:id/edit", isAuthenticated, async (req, res) => {
	const articleId = req.params.id;
	try {
		const [results] = await db.query("SELECT * FROM articles WHERE id = ? AND author_id = ?", [articleId, req.session.userId]);
		if (results.length === 0) {
			return res.status(403).send("Unauthorized to edit this article");
		}
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}

		res.render("edit_article", { article: results[0], sessionId });
	} catch (err) {
		console.error("Error during article edit fetch:", err);
		res.status(500).send("Failed to retrieve article");
	}
});

// 게시글 수정을 처리하는 POST 라우트
app.post("/articles/:id/edit", isAuthenticated, async (req, res) => {
	const articleId = req.params.id;
	const { title, content } = req.body;
	try {
		const [result] = await db.query("UPDATE articles SET title = ?, content = ? WHERE id = ? AND author_id = ?", [
			title,
			content,
			articleId,
			req.session.userId,
		]);
		if (result.affectedRows === 0) {
			return res.status(403).send("Unauthorized to edit this article");
		}
		res.redirect(`/articles/${articleId}`);
	} catch (err) {
		console.error("Error during article update:", err);
		res.status(500).send("Failed to update article");
	}
});

//게시글 삭제를 처리하는 POST 라우트
app.post("/articles/:id/delete", isAuthenticated, async (req, res) => {
	const articleId = req.params.id;
	try {
		const [result] = await db.query("DELETE FROM articles WHERE id = ? AND author_id = ?", [articleId, req.session.userId]);
		if (result.affectedRows === 0) {
			return res.status(403).send("Unauthorized to delete this article");
		}
		res.redirect("/");
	} catch (err) {
		console.error("Error during article deletion:", err);
		res.status(500).send("Failed to delete article");
	}
});

app.get("/articles/category/:category", async (req, res) => {
	const category = req.params.category;
	try {
		const [articles] = await db.query("SELECT * FROM articles WHERE category = ? ORDER BY created_at DESC", [category]);
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}

		res.render("category_articles", { articles, category, sessionId });
	} catch (err) {
		console.error("Error fetching articles by category:", err);
		res.status(500).send("Failed to load articles by category");
	}
});
const fs = require("fs"); // 파일 시스템 모듈을 가져옵니다

app.use("/uploads", express.static("uploads"));

// 개별 게시글을 보여주는 GET 라우트
app.get("/articles/:id", async (req, res) => {
	const articleId = req.params.id;
	try {
		let sessionId = req.session.userId; // 세션에서 userId 가져오기

		if (!sessionId || sessionId === "undefined") {
			sessionId = "none";
		}

		await db.query("UPDATE articles SET views = views + 1 WHERE id = ?", [articleId]);
		console.log(`Views incremented for article ID: ${articleId}`);

		const [results] = await db.query(
			`
			SELECT articles.*, users.username AS author_name 
            FROM articles 
            JOIN users ON articles.author_id = users.id 
            WHERE articles.id = ?`,
			[articleId]
		);

		if (results.length === 0) {
			return res.status(404).send("Article not found");
		}

		// createdAt 필드를 원하는 포맷으로 변환하여 추가
		const article = results[0];
		article.createdAtFormatted = moment(article.created_at).format("YYYY-MM-DD HH:mm");

		res.render("view_article", { article, useId: req.session.userId, sessionId });
	} catch (err) {
		console.error("Error fetching article:", err);
		res.status(500).send("Failed to load article");
	}
});

// 서버를 시작하고 설정된 포트에서 요청을 수신합니다.
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});

// 서버 시작 시 'uploads' 폴더가 존재하지 않으면 생성합니다
if (!fs.existsSync("uploads")) {
	fs.mkdirSync("uploads");
}
