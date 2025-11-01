// frontend/app.js (진짜 최종 완성본)

const express = require('express');
const path = require('path');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const PORT = process.env.PORT || 8000;
const API_ADDR = process.env.GUESTBOOK_API_ADDR;

// Pug 템플릿 엔진 및 public 폴더 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

// API 프록시 설정 ('/api'로 시작하는 '브라우저'의 요청을 백엔드로 전달)
// 이 부분은 main.js의 fetch 요청을 위해 반드시 필요합니다.
app.use('/api', createProxyMiddleware({
    target: API_ADDR,
    changeOrigin: true,
    // 🟢 중요: 프록시가 /api 경로를 제거하지 않도록 pathRewrite 규칙을 수정합니다.
    // 하지만 우리는 백엔드에서 /api를 제거했으므로, 이 규칙이 더 이상 복잡할 필요가 없습니다.
    // 더 간단한 방법은 백엔드에 /api를 다시 추가하는 것이지만, 지금은 프론트에서 해결하겠습니다.
    pathRewrite: {
        '^/api': '/', // '/api/reviews' -> '/reviews'
    },
}));

// 헬퍼 함수: 백엔드에서 리뷰 데이터를 가져옵니다.
const getReviewsData = async (category) => {
    try {
        // 🟢🟢🟢 바로 여기가 수정된 부분입니다! /api를 제거했습니다. 🟢🟢🟢
        const response = await axios.get(`${API_ADDR}/reviews`, { params: { category } });
        return response.data;
    } catch (error) {
        console.error("Error fetching reviews from backend:", error.message);
        return [];
    }
};

// 메인 페이지('/') 및 '새 리뷰' 페이지('/reviews/new') 라우트
const renderHomePage = async (req, res) => {
    const category = req.query.category || '전체';
    const reviews = await getReviewsData(category);
    res.render('home', {
        reviews: reviews,
        currentCategory: category
    });
};

app.get('/', renderHomePage);
app.get('/reviews/new', renderHomePage);


app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});