// frontend/app.js (최종 완성본 - Pagination 추가)

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
const getReviewsData = async (category, tag, page) => { // 🟢 1. page 파라미터 추가
    try {
        // 🟢 2. params에 page 추가
        const response = await axios.get(`${API_ADDR}/reviews`, { params: { category, tag, page } });
        // 🟢 3. 백엔드가 보낸 전체 객체를 반환
        return response.data; 
    } catch (error) {
        console.error("Error fetching reviews from backend:", error.message);
        return { reviews: [], currentPage: 1, totalPages: 0 }; // 🟢 4. 에러 시 기본 객체 반환
    }
};

// 메인 페이지('/') 및 '새 리뷰' 페이지('/reviews/new') 라우트
const renderHomePage = async (req, res) => {
    // 🟢 5. page 쿼리 받기
    const category = req.query.category || '전체';
    const tag = req.query.tag || '';
    const page = req.query.page || '1'; 

    // 🟢 6. 쿼리 파라미터를 URLSearchParams로 관리 (페이지 링크 생성용)
    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('page'); // 기본 'page'는 제거
    const baseQuery = queryParams.toString() ? `&${queryParams.toString()}` : '';

    const data = await getReviewsData(category, tag, page);
    
    // 🟢 7. 템플릿에 모든 페이징 정보 전달
    res.render('home', {
        reviews: data.reviews,
        currentCategory: category,
        currentTag: tag,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        baseQuery: baseQuery // 🟢 8. 페이지 링크에 사용할 기본 쿼리 전달
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