async function deleteReview(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`/reviews/${id}`, {
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
