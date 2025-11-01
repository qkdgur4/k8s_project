// frontend/public/main.js (최종 완성본 - Tags 업그레이드)

// 폼 "제출" 이벤트
const reviewForm = document.getElementById('new-review-form');
if (reviewForm) {
  reviewForm.addEventListener('submit', (event) => {
    event.preventDefault(); // 기본 새로고침 동작 방지

    const formData = new FormData(reviewForm);
    
    // 🟢 1. 'tags'만 배열로 따로 추출합니다.
    const tags = formData.getAll('tags');
    
    // 🟢 2. 'tags'를 제외한 나머지 데이터를 객체로 만듭니다.
    const data = Object.fromEntries(formData.entries());
    
    // 🟢 3. 객체에 'tags' 배열을 다시 삽입합니다.
    data.tags = tags;

    // 🟢 4. 프론트엔드 유효성 검사 (태그 최소 1개)
    if (tags.length === 0) {
      alert('태그를 1개 이상 선택해주세요!');
      return; // 서버로 전송하지 않고 중단
    }

    // 백엔드 API로 데이터 전송
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), // 'tags' 배열이 포함된 객체를 전송
    })
    .then(async response => {
      if (response.ok) {
        alert('리뷰가 성공적으로 등록되었습니다!');
        window.location.href = '/'; 
      } else {
        const errorData = await response.json();
        alert('리뷰 등록 실패: ' + (errorData.error || '서버 응답 오류'));
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    });
  });
}

// 삭제 함수 (이전과 동일)
async function deleteReview(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const response = await fetch(`/api/reviews/${id}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      alert('삭제되었습니다!');
      window.location.reload();
    } else {
      alert('삭제 실패: 서버 응답 오류');
    }
  } catch (err) {
    alert('삭제 중 오류 발생: ' + err.message);
  }
}