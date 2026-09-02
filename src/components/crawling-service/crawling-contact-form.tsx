"use client";

// S12 최종 CTA — 문의 폼.
//
// [목업] 실제 전송은 하지 않는다. 제출하면 클라이언트에서 검증한 뒤 인라인 확인 메시지로
// 폼을 교체한다. 서버 연동이 필요해지면 handleSubmit 안의 TODO 지점에
// POST /api/crawling-inquiry 를 넣으면 된다.
//
// 프로젝트 규약대로 React Hook Form 을 쓰지 않고 validateCrawlingInquiry 의
// 인라인 오류 맵을 쓴다. (src/components/youtube-monitoring 과 동일한 패턴)

import { useRef, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CrawlingSection } from "@/components/crawling-service/crawling-section";
import { trackLandingEvent } from "@/lib/crawling-analytics";
import {
  CYCLE_OPTIONS,
  EMPTY_INQUIRY,
  validateCrawlingInquiry,
} from "@/lib/crawling-inquiry";
import {
  CONTACT_HEADLINE,
  CONTACT_MICROCOPY,
  CONTACT_PRIVACY_LABEL,
  CONTACT_SUBCOPY,
  CONTACT_SUBMIT_LABEL,
  CONTACT_SUCCESS_BODY,
  CONTACT_SUCCESS_TITLE,
} from "@/lib/crawling-landing";
import type { CollectCycle, CrawlingInquiryInput } from "@/types/crawling-landing";
import { cn } from "@/lib/utils";

/** 오류 발생 시 포커스를 옮길 순서 (폼에 보이는 순서와 같아야 한다) */
const FIELD_ORDER = ["targetUrls", "dataFields", "contact", "agreed"] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-destructive">{message}</p>;
}

export function CrawlingContactForm() {
  const [form, setForm] = useState<CrawlingInquiryInput>(EMPTY_INQUIRY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // form_start 는 세션당 1회만 보내야 폼 시작 대비 완료율 지표가 망가지지 않는다
  const startedRef = useRef(false);

  const patchForm = (patch: Partial<CrawlingInquiryInput>) => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackLandingEvent("form_start");
    }
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateCrawlingInquiry(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      const firstInvalid = FIELD_ORDER.find((field) => validation[field]);
      if (firstInvalid) {
        document.getElementById(`inquiry-${firstInvalid}`)?.focus();
      }
      return;
    }

    // TODO: 실제 전송 연동 지점 — 여기서 문의 내용을 서버로 보낸다.
    trackLandingEvent("form_submit", { cycle: form.cycle });
    setSubmitted(true);
    toast.success("무료 기술검토 신청이 접수되었습니다.");
  };

  const resetForm = () => {
    setForm(EMPTY_INQUIRY);
    setErrors({});
    setSubmitted(false);
    startedRef.current = false;
  };

  return (
    <CrawlingSection
      id="contact"
      eyebrow="무료 기술검토 신청"
      title={CONTACT_HEADLINE}
      description={CONTACT_SUBCOPY}
    >
      <div className="mx-auto max-w-2xl">
        {submitted ? (
          // 감사 페이지로 이동시키지 않고 폼 자리를 인라인 확인 메시지로 교체한다
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-emerald-900">
              {CONTACT_SUCCESS_TITLE}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-emerald-800">
              {CONTACT_SUCCESS_BODY}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="mt-6 bg-white"
            >
              다시 문의하기
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="space-y-6">
              {/* 1. 수집하고 싶은 사이트 주소 */}
              <div>
                <Label htmlFor="inquiry-targetUrls">
                  수집하고 싶은 사이트 주소
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Textarea
                  id="inquiry-targetUrls"
                  rows={3}
                  value={form.targetUrls}
                  onChange={(e) => patchForm({ targetUrls: e.target.value })}
                  placeholder={"https://example.com/list\n여러 개면 줄바꿈으로 구분해주세요."}
                  aria-invalid={Boolean(errors.targetUrls)}
                  className="mt-2"
                />
                <FieldError message={errors.targetUrls} />
              </div>

              {/* 2. 필요한 데이터 항목 */}
              <div>
                <Label htmlFor="inquiry-dataFields">
                  필요한 데이터 항목
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Textarea
                  id="inquiry-dataFields"
                  rows={2}
                  value={form.dataFields}
                  onChange={(e) => patchForm({ dataFields: e.target.value })}
                  placeholder="상품명, 가격, 리뷰 수"
                  aria-invalid={Boolean(errors.dataFields)}
                  className="mt-2"
                />
                <FieldError message={errors.dataFields} />
              </div>

              {/* 3. 수집 주기 (선택) */}
              <div>
                <Label>
                  수집 주기
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    선택
                  </span>
                </Label>
                <RadioGroup
                  value={form.cycle}
                  onValueChange={(value) =>
                    patchForm({ cycle: value as CollectCycle })
                  }
                  className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {CYCLE_OPTIONS.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`inquiry-cycle-${option.value}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-normal transition-colors",
                        form.cycle === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <RadioGroupItem
                        id={`inquiry-cycle-${option.value}`}
                        value={option.value}
                      />
                      {option.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* 4. 연락처 */}
              <div>
                <Label htmlFor="inquiry-contact">
                  연락처
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="inquiry-contact"
                  value={form.contact}
                  onChange={(e) => patchForm({ contact: e.target.value })}
                  placeholder="이메일 또는 휴대폰 번호"
                  aria-invalid={Boolean(errors.contact)}
                  className="mt-2"
                />
                <FieldError message={errors.contact} />
              </div>

              {/* 개인정보 수집·이용 동의 */}
              <div>
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="inquiry-agreed"
                    checked={form.agreed}
                    onCheckedChange={(checked) =>
                      patchForm({ agreed: checked === true })
                    }
                    aria-invalid={Boolean(errors.agreed)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="inquiry-agreed"
                    className="text-xs font-normal leading-relaxed text-slate-600"
                  >
                    {CONTACT_PRIVACY_LABEL}
                  </Label>
                </div>
                <FieldError message={errors.agreed} />
              </div>
            </div>

            <Button
              type="submit"
              className="mt-8 h-12 w-full bg-blue-600 text-base hover:bg-blue-500"
            >
              {CONTACT_SUBMIT_LABEL}
            </Button>

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              {CONTACT_MICROCOPY}
            </p>

            {/* 폼 작성을 기피하는 층을 위한 보조 채널 */}
            <div className="mt-6 border-t border-slate-100 pt-6 text-center">
              <a
                // [목업] 실제 카카오 상담 채널 주소로 교체할 자리.
                // 지금은 href 가 "#" 이라 기본 동작을 막지 않으면 최상단으로 튄다.
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  trackLandingEvent("kakao_click");
                }}
                className="inline-flex items-center gap-2 text-sm text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                <MessageCircle className="h-4 w-4" />
                카카오톡으로 상담하기
              </a>
            </div>
          </form>
        )}
      </div>
    </CrawlingSection>
  );
}
