const express = require('express');
const router = express.Router();

// messages.js 가 같은 폴더(routes)에 있으므로 ./messages
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
    const { category } = req.query;              // ex) /api/reviews?category=한식
    const reviews = await getReviews(category);  // '전체' 또는 undefined면 전체 조회
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
    res.status(201).json(newDoc);
  } catch (e) {
    console.error('POST /api/reviews error:', e);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

/**
 * GET /api/reviews/:id
 * 단건 조회
 */
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

/**
 * PUT /api/reviews/:id
 * 리뷰 수정
 */
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

/**
 * DELETE /api/reviews/:id
 * 리뷰 삭제
 */
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
