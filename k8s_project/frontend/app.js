// frontend/app.js (최종 완성본)

const express = require('express');
const path = require('path');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const PORT = process.env.PORT || 8000;
const API_ADDR = process.env.GUESTBOOK_API_ADDR;

// 템플릿 엔진 및 public 폴더 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

// API 프록시 설정 ( /api 로 시작하는 모든 요청을 백엔드로 전달)
app.use('/api', createProxyMiddleware({
    target: API_ADDR,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/', // '/api/reviews' -> '/reviews'로 변경하여 백엔드에 전달
    },
}));

// --- 페이지 렌더링 라우트 ---

// 1. 메인 페이지 ( / )
app.get('/', async (req, res) => {
    try {
        const category = req.query.category || '전체';
        // 백엔드 API로 리뷰 목록 요청
        const response = await axios.get(`${API_ADDR}/reviews`, { params: { category } });
        res.render('home', {
            reviews: response.data,
            currentCategory: category
        });
    } catch (error) {
        console.error("Error fetching reviews:", error.message);
        res.status(500).send("백엔드 서버에서 리뷰 목록을 가져오는 데 실패했습니다.");
    }
});

// 2. 새 리뷰 작성 페이지 ( /reviews/new )
// 🟢 URL 문제 해결: 이 주소로 직접 접속해도 메인 페이지와 동일한 템플릿을 렌더링합니다.
app.get('/reviews/new', async (req, res) => {
    try {
        const category = '전체';
        const response = await axios.get(`${API_ADDR}/reviews`, { params: { category } });
        res.render('home', {
            reviews: response.data,
            currentCategory: category
        });
    } catch (error) {
        console.error("Error fetching reviews:", error.message);
        res.status(500).send("백엔드 서버에서 리뷰 목록을 가져오는 데 실패했습니다.");
    }
});

// 3. 리뷰 수정 페이지 ( /reviews/:id/edit )
// 🟢 수정 기능 오류 해결: 이 주소로 접속하면,
app.get('/reviews/:id/edit', async (req, res) => {
    try {
        const { id } = req.params;
        // 1. 백엔드 API에서 특정 리뷰 1건의 데이터를 가져옵니다.
        const response = await axios.get(`${API_ADDR}/reviews/${id}`);
        // 2. 'edit.pug' 템플릿을 렌더링하면서, 가져온 데이터를 'review'라는 변수로 넘겨줍니다.
        res.render('edit', {
            review: response.data
        });
    } catch (error) {
        console.error("Error fetching single review:", error.message);
        res.status(504).send("백엔드에서 리뷰 정보를 가져오는 데 실패했습니다.");
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});