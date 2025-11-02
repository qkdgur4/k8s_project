// frontend/app.js (최종 완성본 - 'pathRewrite' 삭제)

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

// 1. "인증" API (로그인, 회원가입)
// 이 요청들은 /api가 없으므로, 백엔드에 그대로 전달합니다.
app.post('/register', createProxyMiddleware({ target: API_ADDR, changeOrigin: true }));
app.post('/login', createProxyMiddleware({ target: API_ADDR, changeOrigin: true }));

// 2. "/api"로 시작하는 모든 요청 (리뷰, 삭제, 수정 등)
app.use('/api', createProxyMiddleware({
    target: API_ADDR,
    changeOrigin: true,
    // 🟢🟢🟢 바로 여기가 수정된 부분입니다! 🟢🟢🟢
    // 'pathRewrite' 규칙을 완전히 삭제합니다.
    // 이제 브라우저가 보낸 /api/reviews 요청이
    // 백엔드에 그대로 /api/reviews 로 전달됩니다.
}));


// --- 헬퍼 함수: 백엔드에서 리뷰 데이터 가져오기 ---
const getReviewsData = async (category, tag, page) => {
    try {
        // 이 요청은 서버(app.js)가 직접 백엔드로 보내는 것이므로,
        // 프록시를 거치지 않고, 백엔드의 '공개' 주소인 /reviews로 바로 요청합니다.
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

// 'GET' 요청은 'renderHomePage'가 모두 처리
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

        // 🟢🟢🟢 여기도 수정된 부분입니다! 🟢🟢🟢
        // 이 요청도 서버(app.js)가 직접 백엔드로 보냅니다.
        // 프록시를 거치지 않으므로, 백엔드의 실제 '보호된' API 주소인
        // /api/reviews/:id 로 요청해야 합니다.
        const response = await axios.get(`${API_ADDR}/api/reviews/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.render('edit', {
            review: response.data
        });
    } catch (error) {
        console.error("Error fetching single review:", error.message);
        if (error.response) {
            res.status(error.response.status).send(error.response.data.error || "수정할 리뷰 정보를 가져오는 데 실패했습니다.");
        } else {
            res.status(504).send("백엔드 서버에 연결할 수 없습니다.");
        }
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});