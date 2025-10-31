// backend/routes/index.js

const express = require('express');
const router = express.Router();

const {
  saveReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview
} = require('./messages');




/**
 * GET /api/reviews?category=<카테고리명>
 * 전체/카테고리별 리뷰 조회 (최신순)
 */
router.get('/api/reviews', async (req, res) => {
  try {
    const { category } = req.query;
    const reviews = await getReviews(category);
    res.status(200).json(reviews);
  } catch (e) {
    console.error('GET /api/reviews error:', e);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/reviews
 * 리뷰 생성
 */
router.post('/api/reviews', async (req, res) => {
  try {
    const newDoc = await saveReview(req.body);
    // 🟢 중요: 리뷰 저장 후, 메인 페이지로 리다이렉트 시키거나 성공 메시지를 보낼 수 있습니다.
    // 여기서는 JSON 응답을 유지합니다.
    res.status(201).json(newDoc);
  } catch (e) {
    console.error('POST /api/reviews error:', e);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// ... (GET /:id, PUT /:id, DELETE /:id 라우트는 동일하게 유지) ...
router.get('/api/reviews/:id', async (req, res) => {
  try {
    const doc = await getReviewById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('GET /api/reviews/:id error:', e);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

router.put('/api/reviews/:id', async (req, res) => {
  try {
    const updated = await updateReview(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    console.error('PUT /api/reviews/:id error:', e);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

router.delete('/api/reviews/:id', async (req, res) => {
  try {
    const deleted = await deleteReview(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/reviews/:id error:', e);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});


module.exports = router;