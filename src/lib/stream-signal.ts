// 스트리밍 수집 중단 신호 — 서버 전용.

/**
 * 클라이언트가 연결을 끊었을 때 스트림 콜백이 던지는 신호.
 *
 * 스크래퍼는 개별 오류를 삼키고 계속 진행하도록 만들어져 있어서,
 * "그만해도 된다"는 뜻은 일반 오류와 구분되는 타입으로 전달해야 한다.
 * 이게 없으면 사용자가 페이지를 떠난 뒤에도 크롤링이 끝까지 돌아
 * 서버 자원을 그대로 태운다.
 */
export class StreamClosedSignal extends Error {
  constructor() {
    super("STREAM_CLOSED");
    this.name = "StreamClosedSignal";
  }
}
