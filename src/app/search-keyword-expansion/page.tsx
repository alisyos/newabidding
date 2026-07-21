import { SEARCH_CHANNELS } from "@/lib/channels";
import { ExpansionView } from "@/components/keyword-expansion/expansion-view";

export default function SearchKeywordExpansionPage() {
  return (
    <ExpansionView
      title="검색엔진 키워드 확장"
      description={
        <>
          네이버·다음·구글 검색창의 <b>자동완성 검색어</b>와 <b>연관검색어</b>를
          수집합니다. 한 번에 등록한 키워드 묶음 단위로 결과를 확인할 수 있습니다.
        </>
      }
      channels={SEARCH_CHANNELS}
      filePrefix="search_keyword_expansion"
    />
  );
}
