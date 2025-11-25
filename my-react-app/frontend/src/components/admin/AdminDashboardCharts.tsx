import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface AdminDashboardChartsProps {
  reportsByDate?: { date: string; count: number }[];
  riskDistribution?: { level: string; count: number }[];
  reportsByCategory?: { category: string; count: number }[];
  loginsByDate?: { date: string; total: number; success: number; failed: number }[];
  loginsByFailureReason?: { reason: string; count: number }[];
}

export function AdminDashboardCharts({
  reportsByDate,
  riskDistribution,
  reportsByCategory,
  loginsByDate,
  loginsByFailureReason
}: AdminDashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* 신고 추이 차트 */}
      {reportsByDate && reportsByDate.length > 0 && (
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
          <CardHeader className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">📈 최근 14일 신고 추이</h3>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {reportsByDate.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">{item.date}</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...reportsByDate.map(d => d.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 w-6 sm:w-8 text-right flex-shrink-0">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 신뢰도 분포 차트 */}
      {riskDistribution && riskDistribution.length > 0 && (
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
          <CardHeader className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">📊 신뢰도분포</h3>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {riskDistribution
                .sort((a, b) => {
                  // 레벨 순서: VERY_HIGH → HIGH → MEDIUM → LOW → VERY_LOW
                  const order: { [key: string]: number } = {
                    VERY_HIGH: 0,
                    HIGH: 1,
                    MEDIUM: 2,
                    LOW: 3,
                    VERY_LOW: 4
                  };
                  return (order[a.level] ?? 99) - (order[b.level] ?? 99);
                })
                .map((item, index) => {
                // 신뢰도 점수 기준 4개 레벨
                // VERY_HIGH: 90~100점 → 파란색 (#3B82F6) - "매우안전"
                // HIGH: 70~89점 → 초록색 (#10B981) - "안전"
                // MEDIUM: 40~69점 → 노란색 (#F59E0B) - "주의"
                // LOW: 0~39점 → 주황색 (#F97316) - "의심"
                const levelColors: { [key: string]: string } = {
                  VERY_HIGH: '#3B82F6',  // 파란색 - 매우안전
                  HIGH: '#10B981',       // 초록색 - 안전
                  MEDIUM: '#F59E0B',     // 노란색 - 주의
                  LOW: '#F97316',        // 주황색 - 의심
                  VERY_LOW: '#F97316'    // 주황색 - 의심
                };
                const levelLabels: { [key: string]: string } = {
                  VERY_HIGH: '매우안전',
                  HIGH: '안전',
                  MEDIUM: '주의',
                  LOW: '의심',
                  VERY_LOW: '의심'
                };
                const total = riskDistribution.reduce((sum, r) => sum + r.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-900">
                        {levelLabels[item.level] || item.level}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        {item.count}개 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-2">
                      <div
                        className="h-2.5 sm:h-2 rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: levelColors[item.level] || '#6B7280',
                          minWidth: percentage > 0 ? '2px' : '0px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 신고 카테고리별 분포 */}
      {reportsByCategory && reportsByCategory.length > 0 && (
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">📋 신고 카테고리별 분포</h3>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {reportsByCategory.map((item, index) => {
                const total = reportsByCategory.reduce((sum, r) => sum + r.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                
                return (
                  <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate pr-2">{item.category}</span>
                      <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">{item.count}건</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 mt-1 block">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로그인 추이 차트 */}
      {loginsByDate && loginsByDate.length > 0 && (
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">🔐 최근 14일 로그인 추이</h3>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {loginsByDate.map((item, index) => {
                const maxCount = Math.max(...loginsByDate.map(d => d.total), 1);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">{item.date}</span>
                      <div className="flex items-center gap-3 text-xs sm:text-sm">
                        <span className="text-green-600">성공: {item.success}</span>
                        <span className="text-red-600">실패: {item.failed}</span>
                        <span className="text-gray-900 font-medium">총: {item.total}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[60px] relative overflow-hidden">
                        {item.success > 0 && (
                          <div
                            className="bg-green-600 h-3 rounded-l-full absolute left-0"
                            style={{
                              width: `${(item.success / maxCount) * 100}%`
                            }}
                          />
                        )}
                        {item.failed > 0 && (
                          <div
                            className="bg-red-600 h-3 rounded-r-full absolute"
                            style={{
                              width: `${(item.failed / maxCount) * 100}%`,
                              left: `${(item.success / maxCount) * 100}%`
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로그인 실패 사유별 분포 */}
      {loginsByFailureReason && loginsByFailureReason.length > 0 && (
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">⚠️ 로그인 실패 사유별 분포</h3>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {loginsByFailureReason.map((item, index) => {
                const total = loginsByFailureReason.reduce((sum, r) => sum + r.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                const reasonLabels: { [key: string]: string } = {
                  'INVALID_PASSWORD': '잘못된 비밀번호',
                  'USER_NOT_FOUND': '사용자 없음',
                  'ACCOUNT_DELETED': '삭제된 계정',
                  'OTHER': '기타'
                };
                
                return (
                  <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate pr-2">
                        {reasonLabels[item.reason] || item.reason}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">{item.count}건</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 mt-1 block">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터가 없는 경우 */}
      {(!reportsByDate || reportsByDate.length === 0) &&
       (!riskDistribution || riskDistribution.length === 0) &&
       (!reportsByCategory || reportsByCategory.length === 0) &&
       (!loginsByDate || loginsByDate.length === 0) &&
       (!loginsByFailureReason || loginsByFailureReason.length === 0) && (
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white lg:col-span-2">
          <CardContent className="p-6 sm:p-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">차트 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

