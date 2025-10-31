const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8000;
const API_ADDR = process.env.GUESTBOOK_API_ADDR;

// Pug 템플릿 엔진 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// 🟢 public 폴더를 정적 파일 제공 폴더로 설정 (main.js, style.css 등을 위함)
app.use(express.static(path.join(__dirname, 'public')));

// 🟢 메인 페이지 라우트: 백엔드에서 데이터를 가져와 home.pug를 렌더링
app.get('/', async (req, res) => {
    try {
        const category = req.query.category || '전체';
        // 백엔드 API로 리뷰 목록 요청
        const response = await axios.get(`${API_ADDR}/api/reviews`, { params: { category } });
        // 가져온 데이터와 함께 페이지 렌더링
        res.render('home', {
            reviews: response.data,
            currentCategory: category
        });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send("Error fetching reviews from backend");
    }
});

app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});