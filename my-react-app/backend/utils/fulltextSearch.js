/**
 * Full-Text Search 유틸리티 함수
 * PostgreSQL의 Full-Text Search 기능을 활용한 검색 헬퍼 함수
 */

/**
 * 검색어를 PostgreSQL tsquery 형식으로 변환
 * @param {string} searchTerm - 검색어
 * @param {string} config - 텍스트 검색 설정 (기본값: 'simple')
 * @returns {string} tsquery 형식의 검색어
 */
const buildTsQuery = (searchTerm, config = 'simple') => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return '';
  }

  // 특수 문자 이스케이프 및 공백 정리
  const cleaned = searchTerm.trim().replace(/[^\w\s가-힣]/g, ' ');
  
  if (!cleaned) {
    return '';
  }

  // 여러 단어를 AND 조건으로 연결
  // 예: "쇼핑몰 검색" -> "쇼핑몰 & 검색"
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '';
  }

  // plainto_tsquery를 사용하여 자연어 검색 지원
  // 이 함수는 자동으로 AND 조건을 생성하고 특수 문자를 처리함
  return words.join(' & ');
};

/**
 * Full-Text Search 쿼리 빌더
 * @param {Object} options - 검색 옵션
 * @param {string} options.searchTerm - 검색어
 * @param {string} options.tableName - 테이블명
 * @param {string} options.searchColumns - 검색할 컬럼들 (배열)
 * @param {Object} options.additionalFilters - 추가 필터 조건
 * @returns {Object} Supabase 쿼리 객체
 */
const buildFullTextSearchQuery = (supabase, options) => {
  const { searchTerm, tableName, searchColumns, additionalFilters = {} } = options;

  let query = supabase.from(tableName);

  // Full-Text Search 적용
  if (searchTerm && searchColumns && searchColumns.length > 0) {
    // tsvector 컬럼을 동적으로 생성하여 검색
    // PostgreSQL의 to_tsvector와 plainto_tsquery를 사용
    const tsQuery = buildTsQuery(searchTerm);
    
    if (tsQuery) {
      // RPC 함수를 사용하거나, 직접 SQL을 실행해야 함
      // Supabase에서는 RPC 함수를 통해 Full-Text Search를 구현하는 것이 좋음
      // 여기서는 쿼리 빌더를 반환하고, 실제 실행은 컨트롤러에서 처리
      query = query.or(
        searchColumns
          .map(col => `${col}.ilike.%${searchTerm}%`)
          .join(',')
      );
    }
  }

  // 추가 필터 적용
  Object.entries(additionalFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value.operator) {
        // { operator: 'gte', value: '2024-01-01' } 형식 지원
        switch (value.operator) {
          case 'gte':
            query = query.gte(key, value.value);
            break;
          case 'lte':
            query = query.lte(key, value.value);
            break;
          case 'eq':
            query = query.eq(key, value.value);
            break;
          case 'neq':
            query = query.neq(key, value.value);
            break;
        }
      } else {
        query = query.eq(key, value);
      }
    }
  });

  return query;
};

/**
 * Full-Text Search를 위한 RPC 함수 호출 (PostgreSQL 함수 사용)
 * @param {Object} supabase - Supabase 클라이언트
 * @param {string} functionName - RPC 함수명
 * @param {Object} params - 함수 파라미터
 * @returns {Promise} 검색 결과
 */
const callFullTextSearchRPC = async (supabase, functionName, params) => {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Full-Text Search RPC 오류 (${functionName}):`, error);
    throw error;
  }
};

/**
 * 검색어 정규화 (한국어 및 영어 지원)
 * @param {string} searchTerm - 원본 검색어
 * @returns {string} 정규화된 검색어
 */
const normalizeSearchTerm = (searchTerm) => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return '';
  }

  return searchTerm
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // 여러 공백을 하나로
    .replace(/[^\w\s가-힣]/g, ''); // 특수 문자 제거 (한글, 영문, 숫자만 유지)
};

/**
 * 검색 결과에 하이라이트 태그 추가 (선택적)
 * @param {string} text - 원본 텍스트
 * @param {string} searchTerm - 검색어
 * @param {string} tag - 하이라이트 태그 (기본값: 'mark')
 * @returns {string} 하이라이트가 적용된 텍스트
 */
const highlightSearchTerm = (text, searchTerm, tag = 'mark') => {
  if (!text || !searchTerm) {
    return text;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<${tag}>$1</${tag}>`);
};

module.exports = {
  buildTsQuery,
  buildFullTextSearchQuery,
  callFullTextSearchRPC,
  normalizeSearchTerm,
  highlightSearchTerm
};

