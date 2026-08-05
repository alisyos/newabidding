// OpenAI 모델별 파라미터 지원 차이를 한곳에서 판정한다.
//
// gpt-5 계열·o 시리즈는 추론(reasoning) 모델이라 샘플링 파라미터가 고정값으로 잠겨 있다.
// temperature/top_p/presence_penalty/frequency_penalty 를 넘기면 400 unsupported_parameter 가
// 발생하며, 기본값(1)을 명시해도 필드 존재 자체를 거부한다. 대신 reasoning_effort 를 받는다.
//
// OPENAI_MODEL 로 모델을 교체할 수 있으므로 호출 코드가 모델명을 보고 분기하도록 한다.

/**
 * 추론 모델 여부 — true 면 temperature 미지원, reasoning_effort 지원.
 *
 * 주의: gpt-5.x-chat-latest 는 gpt-5 접두사를 쓰지만 비추론 채팅 모델이라
 * temperature 를 지원한다. 접두사만으로 판정하면 오분류하므로 먼저 제외한다.
 */
export function isReasoningModel(model: string): boolean {
  const m = model.trim().toLowerCase();
  if (m.includes("chat-latest")) return false;
  return /^(gpt-5|o[1-9])/.test(m);
}
