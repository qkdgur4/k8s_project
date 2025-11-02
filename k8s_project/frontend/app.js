// frontend/app.js (최종 완성본 - 프록시 수정)

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

// --- API 프록시 설정 ---
// 🟢 1. "인증" API (로그인, 회원가입)는 /api가 없으므로 따로 처리
app.use('/register', createProxyMiddleware({ target: API_ADDR, changeOrigin: true }));
app.use('/login', createProxyMiddleware({ target: API_ADDR, changeOrigin: true }));

// 🟢 2. /api 로 시작하는 모든 요청 (리뷰, 삭제, 수정 등)
app.use('/api', createProxyMiddleware({
    target: API_ADDR,
    changeOrigin: true,
    // 🟢 3. 'pathRewrite'를 삭제! 
    // 이제 /api/reviews 요청이 백엔드에 그대로 /api/reviews로 전달됩니다.
}));


// --- 헬퍼 함수: 백엔드에서 리뷰 데이터 가져오기 ---
const getReviewsData = async (category, tag, page) => {
    try {
        // 🟢 4. 백엔드는 /reviews (공개)로 목록을 받으므로, 이 주소는 그대로 둡니다.
        const response = await axios.get(`${API_ADDR}/reviews`, { params: { category, tag, page } });
        return response.data;
    } catch (error) {
        console.error("Error fetching reviews from backend:", error.message);
        return { reviews: [], currentPage: 1, totalPages: 0 };
    }
};

// --- 페이지 렌더링 라우트 ---
const renderHomePage = async (req, res) => {
    const category = req.query.category || '전체';
    const tag = req.query.tag || '';
    const page = req.query.page || '1';
    
    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('page');
    const baseQuery = queryParams.toString() ? `&${queryParams.toString()}` : '';

    const data = await getReviewsData(category, tag, page);
    
    res.render('home', {
        reviews: data.reviews,
        currentCategory: category,
        currentTag: tag,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        baseQuery: baseQuery
    });
};

app.get('/', renderHomePage);
app.get('/reviews/new', renderHomePage);
app.get('/login', renderHomePage);
app.get('/register', renderHomePage);

// '리뷰 수정' 페이지
app.get('/reviews/:id/edit', async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.query.token;

        if (!token) {
            return res.status(401).send("로그인이 필요합니다. (토큰 없음)");
        }
        
        // 🟢 5. 수정 페이지는 /api/reviews/:id (보호됨)로 API 요청
        const response = await axios.get(`${API_ADDR}/api/reviews/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.render('edit', {
            review: response.data
        });
    } catch (error) {
        console.error("Error fetching single review:", error.message);
        res.status(504).send("수정할 리뷰 정보를 가져오는 데 실패했습니다.");
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});