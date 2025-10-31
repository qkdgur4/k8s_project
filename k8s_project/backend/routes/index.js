const express = require('express');
const router = express.Router();
const {
  saveReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview
} = require('./messages');

// GET /reviews : 리뷰 목록 조회
router.get('/reviews', async (req, res) => {
  try {
    const { category } = req.query;
    const reviews = await getReviews(category);
    res.status(200).json(reviews);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /reviews : 새 리뷰 생성
router.post('/reviews', async (req, res) => {
  try {
    console.log("Received data to save:", req.body); // 🟢 데이터 확인용 로그
    const newDoc = await saveReview(req.body);
    res.status(201).json(newDoc);
  } catch (e) {
    console.error('POST /api/reviews error:', e); // 🟢 에러 확인용 로그
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// DELETE /reviews/:id : 리뷰 삭제
router.delete('/reviews/:id', async (req, res) => {
  try {
    const deleted = await deleteReview(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// (수정 기능은 아직 사용하지 않지만, 코드는 남겨둡니다)
router.get('/reviews/:id', async (req, res) => { /* ... */ });
router.put('/reviews/:id', async (req, res) => { /* ... */ });

module.exports = router;