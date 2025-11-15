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

      {/* 위험도 분포 차트 */}
      {riskDistribution && riskDistribution.length > 0 && (
        <Card className="rounded-2xl shadow-md border-border">
          <CardHeader>
            <h3 className="text-lg font-bold text-foreground">⚠️ 위험도 분포</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskDistribution.map((item, index) => {
                const levelColors: { [key: string]: string } = {
                  SAFE: 'bg-green-500',
                  CAUTION: 'bg-yellow-500',
                  DANGEROUS: 'bg-orange-500',
                  CRITICAL: 'bg-red-500'
                };
                const levelLabels: { [key: string]: string } = {
                  SAFE: '안전',
                  CAUTION: '주의',
                  DANGEROUS: '위험',
                  CRITICAL: '심각'
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
                        className={`${levelColors[item.level] || 'bg-gray-500'} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
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

