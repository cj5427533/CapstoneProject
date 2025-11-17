import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface AdminDashboardChartsProps {
  reportsByDate?: { date: string; count: number }[];
  riskDistribution?: { level: string; count: number }[];
  reportsByCategory?: { category: string; count: number }[];
}

export function AdminDashboardCharts({
  reportsByDate,
  riskDistribution,
  reportsByCategory
}: AdminDashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 신고 추이 차트 */}
      {reportsByDate && reportsByDate.length > 0 && (
        <Card className="rounded-2xl shadow-md border-border">
          <CardHeader>
            <h3 className="text-lg font-bold text-foreground">📈 최근 14일 신고 추이</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportsByDate.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.date}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...reportsByDate.map(d => d.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 신뢰도 분포 차트 */}
      {riskDistribution && riskDistribution.length > 0 && (
        <Card className="rounded-2xl shadow-md border-border">
          <CardHeader>
            <h3 className="text-lg font-bold text-foreground">📊 신뢰도분포</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                // 신뢰도 점수 기준 5개 레벨
                // VERY_HIGH: 90점 이상 → 파란색 (#3B82F6) - "신뢰도 매우 높음"
                // HIGH: 70~89점 → 초록색 (#10B981) - "신뢰도 높음"
                // MEDIUM: 40~69점 → 주황색 (#F59E0B) - "주의 필요"
                // LOW: 20~39점 → 빨간색 (#EF4444) - "신뢰도 낮음"
                // VERY_LOW: 0~19점 → 빨간색 (#EF4444) - "신뢰도 매우 낮음"
                const levelColors: { [key: string]: string } = {
                  VERY_HIGH: '#3B82F6',  // 파란색 (neutral)
                  HIGH: '#10B981',       // 초록색 (safe)
                  MEDIUM: '#F59E0B',     // 주황색 (warning)
                  LOW: '#EF4444',        // 빨간색 (danger)
                  VERY_LOW: '#EF4444'    // 빨간색 (danger)
                };
                const levelLabels: { [key: string]: string } = {
                  VERY_HIGH: '신뢰도 매우 높음',
                  HIGH: '신뢰도 높음',
                  MEDIUM: '주의 필요',
                  LOW: '신뢰도 낮음',
                  VERY_LOW: '신뢰도 매우 낮음'
                };
                const total = riskDistribution.reduce((sum, r) => sum + r.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {levelLabels[item.level] || item.level}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.count}개 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
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
        <Card className="rounded-2xl shadow-md border-border lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-bold text-foreground">📋 신고 카테고리별 분포</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportsByCategory.map((item, index) => {
                const total = reportsByCategory.reduce((sum, r) => sum + r.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                
                return (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{item.category}</span>
                      <span className="text-sm text-muted-foreground">{item.count}건</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block">
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
       (!reportsByCategory || reportsByCategory.length === 0) && (
        <Card className="rounded-2xl shadow-md border-border lg:col-span-2">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">차트 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

