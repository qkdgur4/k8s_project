const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8000;
const API_ADDR = process.env.GUESTBOOK_API_ADDR;

// Pug 템플릿 엔진 및 public 폴더 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

// 헬퍼 함수: 백엔드에서 리뷰 데이터를 가져옵니다.
const getReviewsData = async (category) => {
    try {
        const response = await axios.get(`${API_ADDR}/api/reviews`, { params: { category } });
        return response.data;
    } catch (error) {
        console.error("Error fetching reviews from backend:", error.message);
        return []; // 에러 발생 시 빈 배열 반환
    }
};

// 🟢 1. 메인 페이지('/') 라우트
app.get('/', async (req, res) => {
    const category = req.query.category || '전체';
    const reviews = await getReviewsData(category);
    res.render('home', {
        reviews: reviews,
        currentCategory: category
    });
});

// 🟢 2. '새 리뷰 쓰기' 페이지('/reviews/new') 라우트 추가!
// 이 주소로 직접 접속하거나 새로고침해도 메인 페이지와 동일한 데이터를 가지고
// 동일한 템플릿을 렌더링하여 SPA 경험을 유지합니다.
app.get('/reviews/new', async (req, res) => {
    const category = '전체'; // 새 글 작성 시에는 항상 전체 목록을 보여줌
    const reviews = await getReviewsData(category);
    res.render('home', {
        reviews: reviews,
        currentCategory: category
    });
});

app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});