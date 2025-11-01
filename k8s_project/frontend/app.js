// frontend/app.js (최종 완성본 - Tag Filter 추가)

const express = require('express');
const path = require('path');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const PORT = process.env.PORT || 8000;
const API_ADDR = process.env.GUESTBOOK_API_ADDR;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', createProxyMiddleware({
    target: API_ADDR,
    changeOrigin: true,
    pathRewrite: { '^/api': '/' },
}));

// 헬퍼 함수: 백엔드에서 리뷰 데이터를 가져옵니다.
const getReviewsData = async (category, tag) => { // 🟢 1. tag 파라미터 추가
    try {
        // 🟢 2. params에 tag 추가
        const response = await axios.get(`${API_ADDR}/reviews`, { params: { category, tag } });
        return response.data;
    } catch (error) {
        console.error("Error fetching reviews from backend:", error.message);
        return [];
    }
};

// 메인 페이지('/') 및 '새 리뷰' 페이지('/reviews/new') 라우트
const renderHomePage = async (req, res) => {
    // 🟢 3. category와 tag를 모두 받음
    const category = req.query.category || '전체';
    const tag = req.query.tag || '';
    
    // 🟢 4. 둘 다 헬퍼 함수로 전달
    const reviews = await getReviewsData(category, tag);
    
    // 🟢 5. 템플릿에 currentTag 전달
    res.render('home', {
        reviews: reviews,
        currentCategory: category,
        currentTag: tag
    });
};

app.get('/', renderHomePage);
app.get('/reviews/new', renderHomePage);

// '리뷰 수정' 페이지
app.get('/reviews/:id/edit', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`${API_ADDR}/reviews/${id}`);
        res.render('edit', {
            review: response.data
        });
    } catch (error) {
        console.error("Error fetching single review:", error.message);
        res.status(504).send("백엔드에서 리뷰 정보를 가져오는 데 실패했습니다.");
    }
});

app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});