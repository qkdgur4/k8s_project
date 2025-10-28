const express = require('express');
// [수정] messages.js에서 getAllReviews 대신 getReviews 함수를 가져옵니다.
const { saveReview, getReviews } = require('./messages');

const router = express.Router();

// --- '한입로그' 리뷰 API 엔드포인트 ---

/**
 * [수정됨] GET /api/reviews?category=<카테고리명>
 * 모든 리뷰 또는 특정 카테고리의 리뷰를 조회하는 API입니다.
 */
router.get('/api/reviews', async (req, res) => {
    // URL 쿼리 스트링에서 category 값을 가져옵니다. (예: /api/reviews?category=한식)
    const { category } = req.query;
    
    console.log(`received request: GET /api/reviews, category: ${category || 'All'}`);
    try {
        // 가져온 category 값을 getReviews 함수에 전달합니다.
        const reviews = await getReviews(category);
        res.status(200).json(reviews);
    } catch (err) {
        console.error('Error in GET /api/reviews:', err);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * POST /api/reviews
 * 새로운 리뷰를 생성하는 API입니다.
 */
router.post('/api/reviews', async (req, res) => {
    console.log(`received request: POST /api/reviews, body:`, req.body);
    try {
        const newReview = await saveReview(req.body);
        // 성공적으로 리소스가 생성되었음을 의미하는 201 상태 코드를 반환합니다.
        res.status(201).json(newReview);
    } catch (err) {
        console.error('Error saving submit data:', err);
        res.status(500).json({ error: 'Server error while saving data' });
    }
});

module.exports = router;

