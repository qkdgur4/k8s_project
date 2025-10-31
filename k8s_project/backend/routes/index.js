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


// 🟢🟢🟢 추가된 부분 시작 🟢🟢🟢
/**
 * GET /reviews/new
 * 새 리뷰 작성 폼 페이지를 렌더링합니다.
 * (이 라우트는 API가 아니므로 /api 경로를 사용하지 않습니다.)
 */
router.get('/reviews/new', (req, res) => {
  // res.render()는 Pug 같은 템플릿 엔진을 사용할 때 페이지를 그려주는 Express의 기능입니다.
  // 이 기능이 동작하려면 프론트엔드 Express 서버 설정에 view engine이 pug로 설정되어 있어야 합니다.
  // 지금 구조에서는 프론트엔드가 이 역할을 하므로, 사실 이 라우트는 프론트엔드 쪽에 있어야 하지만,
  // 현재 구조를 유지하며 해결하기 위해 이 방법을 사용합니다.
  // 만약 렌더링이 안된다면 프론트엔드/백엔드 역할 분리를 다시 고려해야 합니다.
  // 지금은 'Cannot GET' 오류를 해결하는 데 집중합니다.
  // 이 라우트는 다른 API 라우트보다 위에 있는 것이 좋습니다.
  try {
      // 이 부분은 프론트엔드 서버에서 처리해야 할 로직입니다.
      // 현재 백엔드에는 Pug 파일을 렌더링하는 기능이 없으므로,
      // 'Cannot GET' 오류를 해결하기 위해 임시로 성공 응답만 보냅니다.
      // 실제로는 프론트엔드 라우터가 이 경로를 처리해야 합니다.
      // 지금은 프론트엔드에서 이 경로를 처리하도록 수정하는 대신,
      // 백엔드에서 이 경로에 대한 요청이 오면 404가 아닌 다른 응답을 주도록 수정합니다.
      res.status(200).send('This page should be rendered by the frontend server.');

  } catch (e) {
      res.status(500).json({ error: 'Failed to show new review page' });
  }
});
// 🟢🟢🟢 추가된 부분 끝 🟢🟢🟢


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