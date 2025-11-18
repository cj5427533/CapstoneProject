import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getMe } from '../utils/api';
import {
  getAdminStats,
  getAdminShops,
  updateShopName,
  deleteShop,
  deleteUnknownShops,
  getAdminReports,
  deleteReport,
  getAdminRatings,
  deleteRating,
  getAdminUsers,
  updateUserRole,
  mergeShops,
  getAdminCommunityPosts,
  deleteAdminCommunityPost,
  getAdminCommunityComments,
  deleteAdminCommunityComment,
  generateMockRatings
} from '../utils/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';

interface AdminStats {
  totalShops: number;
  totalReports: number;
  totalRatings: number;
  totalUsers: number;
  reportsByDate?: { date: string; count: number }[];
  riskDistribution?: { level: string; count: number }[];
  reportsByCategory?: { category: string; count: number }[];
}

interface Shop {
  id: number;
  url: string;
  name: string | null;
  parent_shop_id: number | null;
  created_at: string;
}

interface Report {
  id: number;
  shop_id: number;
  categories: string;
  description: string;
  reporter_name: string | null;
  created_at: string;
  status?: string; // pending, approved, rejected
  shops: {
    id: number;
    url: string;
    name: string | null;
  };
  evidenceFiles?: string[]; // 증빙 자료 파일 URL 배열
}

interface RatingData {
  id: number;
  shop_id: number;
  rating: number;
  comment?: string | null;
  created_at: string;
  shops: {
    id: number;
    url: string;
    name: string | null;
  };
}

interface UserData {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  role?: 'user' | 'admin';
  created_at: string;
}

interface CommunityPost {
  id: number;
  title: string;
  content: string;
  author: string;
  author_email: string;
  user_id: number;
  views: number;
  likes: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

interface CommunityComment {
  id: number;
  content: string;
  author: string;
  author_email: string;
  user_id: number;
  post_id: number;
  post_title: string;
  created_at: string;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser, loading, logout, updateUser } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<'stats' | 'shops' | 'reports' | 'ratings' | 'users' | 'community'>('stats');
  
  const [stats, setStats] = useState<AdminStats>({
    totalShops: 0,
    totalReports: 0,
    totalRatings: 0,
    totalUsers: 0
  });
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityComments, setCommunityComments] = useState<CommunityComment[]>([]);
  const [editingShopId, setEditingShopId] = useState<number | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [mergingShopId, setMergingShopId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportFilter, setReportFilter] = useState<'all' | 'today' | 'pending' | 'approved' | 'rejected'>('all');
  const [shopFilter, setShopFilter] = useState<{ search: string; riskLevel: 'all' | 'safe' | 'caution' | 'dangerous' | 'critical' }>({ search: '', riskLevel: 'all' });

  // 관리자 인증 체크 (role 기반)
  useEffect(() => {
    if (!loading && (!isAuthenticated || currentUser?.role !== 'admin')) {
      toast.error('관리자 권한이 필요합니다.');
      navigate('/');
    }
  }, [loading, isAuthenticated, currentUser?.role, navigate]);

  // 관리자 통계 로드
  const loadAdminStats = async () => {
    try {
      console.log('통계 데이터 로드 시작...');
      const statsData = await getAdminStats();
      console.log('통계 데이터 응답:', statsData);
      
      // statsData가 유효한지 확인하고 기본값 설정
      const newStats = {
        totalShops: statsData?.totalShops ?? 0,
        totalReports: statsData?.totalReports ?? 0,
        totalRatings: statsData?.totalRatings ?? 0,
        totalUsers: statsData?.totalUsers ?? 0,
        reportsByDate: statsData?.reportsByDate || [],
        riskDistribution: statsData?.riskDistribution || [],
        reportsByCategory: statsData?.reportsByCategory || []
      };
      
      console.log('설정할 통계 데이터:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('관리자 통계 로드 실패:', error);
      // 에러 발생 시 기본값 유지
    }
  };

  // 쇼핑몰 데이터 로드
  const loadShops = async () => {
    try {
      const shopsData = await getAdminShops();
      console.log('쇼핑몰 데이터:', shopsData);
      setShops(Array.isArray(shopsData) ? shopsData : []);
    } catch (error) {
      console.error('쇼핑몰 조회 실패:', error);
      setShops([]);
    }
  };

  // 피해 사례 제보 데이터 로드
  const loadReports = async () => {
    try {
      const reportsData = await getAdminReports();
      console.log('피해 사례 제보 데이터:', reportsData);
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (error) {
      console.error('피해 사례 제보 조회 실패:', error);
      setReports([]);
    }
  };

  // 평점 데이터 로드
  const loadRatings = async () => {
    try {
      const ratingsData = await getAdminRatings();
      console.log('평점 데이터:', ratingsData);
      setRatings(Array.isArray(ratingsData) ? ratingsData : []);
    } catch (error) {
      console.error('평점 조회 실패:', error);
      setRatings([]);
    }
  };

  // 사용자 데이터 로드
  const loadUsers = async () => {
    try {
      const usersData = await getAdminUsers();
      console.log('사용자 데이터:', usersData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('사용자 조회 실패:', error);
      setUsers([]);
    }
  };

  // 커뮤니티 게시글 로드
  const loadCommunityPosts = async () => {
    try {
      const postsData = await getAdminCommunityPosts();
      setCommunityPosts(postsData);
    } catch (error) {
      console.error('커뮤니티 게시글 조회 실패:', error);
    }
  };

  // 커뮤니티 댓글 로드
  const loadCommunityComments = async () => {
    try {
      const commentsData = await getAdminCommunityComments();
      setCommunityComments(commentsData);
    } catch (error) {
      console.error('커뮤니티 댓글 조회 실패:', error);
    }
  };

  // 사용자 권한 변경
  const handleUpdateUserRole = async (userId: number, newRole: 'user' | 'admin') => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const roleText = newRole === 'admin' ? '관리자' : '일반 사용자';
    if (!confirm(`'${targetUser.username}' (${targetUser.email})의 권한을 ${roleText}로 변경하시겠습니까?`)) {
      return;
    }

    try {
      await updateUserRole(userId, newRole);
      alert(`사용자 권한이 ${roleText}로 변경되었습니다.`);
      loadUsers();
      
      // 변경된 사용자가 현재 로그인한 사용자라면 AuthContext의 사용자 정보도 업데이트
      if (currentUser && currentUser.id === userId) {
        try {
          const meResponse = await getMe();
          if (meResponse.user) {
            updateUser(meResponse.user);
          }
        } catch (error) {
          console.error('현재 사용자 정보 업데이트 실패:', error);
          // 사용자 정보 업데이트 실패해도 권한 변경은 성공했으므로 계속 진행
        }
      }
    } catch (error: any) {
      console.error('사용자 권한 변경 실패:', error);
      alert('사용자 권한 변경에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  // 초기 로드 및 탭 변경
  useEffect(() => {
    if (!loading && !isAuthenticated) return;
    if (currentUser?.role !== 'admin') return;
    
    const loadTabData = async () => {
      if (currentTab === 'shops') await loadShops();
      else if (currentTab === 'reports') await loadReports();
      else if (currentTab === 'ratings') await loadRatings();
      else if (currentTab === 'users') await loadUsers();
      else if (currentTab === 'community') {
        await loadCommunityPosts();
        await loadCommunityComments();
      }
      else if (currentTab === 'stats') await loadAdminStats();
    };
    
    loadTabData();
  }, [currentTab, loading, isAuthenticated, currentUser?.role]);

  // 인증 후 초기 통계 로드
  useEffect(() => {
    if (!loading && isAuthenticated && currentUser?.role === 'admin' && currentTab === 'stats') {
      loadAdminStats();
    }
  }, [loading, isAuthenticated, currentUser?.role, currentTab]);

  // 관리자 로그아웃 (일반 로그아웃과 동일하게 처리)
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 쇼핑몰 이름 수정
  const handleUpdateShopName = async (shopId: number) => {
    if (!editingShopName.trim()) {
      alert('쇼핑몰 이름을 입력해주세요.');
      return;
    }

    try {
      await updateShopName(shopId, editingShopName);
      alert('쇼핑몰 이름이 수정되었습니다.');
      setEditingShopId(null);
      setEditingShopName('');
      loadShops();
      loadAdminStats();
    } catch (error) {
      alert('쇼핑몰 이름 수정에 실패했습니다.');
    }
  };

  // 쇼핑몰 삭제
  const handleDeleteShop = async (shopId: number, shopName: string) => {
    if (!confirm(`'${shopName}' 쇼핑몰을 삭제하시겠습니까?\n연관된 피해 사례 제보와 평점도 모두 삭제됩니다.`)) {
      return;
    }

    try {
      await deleteShop(shopId);
      alert('쇼핑몰이 삭제되었습니다.');
      loadShops();
      loadAdminStats();
    } catch (error) {
      alert('쇼핑몰 삭제에 실패했습니다.');
    }
  };

  // 알 수 없는 쇼핑몰 일괄 삭제
  const handleDeleteUnknownShops = async () => {
    const unknownShops = shops.filter(shop => !shop.name || shop.name === '알 수 없는 쇼핑몰');
    
    if (unknownShops.length === 0) {
      alert('삭제할 알 수 없는 쇼핑몰이 없습니다.');
      return;
    }

    if (!confirm(
      `알 수 없는 쇼핑몰 ${unknownShops.length}개를 삭제하시겠습니까?\n\n` +
      `삭제 대상:\n` +
      `${unknownShops.slice(0, 5).map(s => `- ${s.url}${s.name ? ` (${s.name})` : ''}`).join('\n')}` +
      `${unknownShops.length > 5 ? `\n... 외 ${unknownShops.length - 5}개` : ''}\n\n` +
      `연관된 피해 사례 제보와 평점도 모두 삭제됩니다.`
    )) {
      return;
    }

    try {
      const result = await deleteUnknownShops();
      alert(result.message || `${result.deletedCount}개의 알 수 없는 쇼핑몰이 삭제되었습니다.`);
      loadShops();
      loadAdminStats();
    } catch (error: any) {
      alert('알 수 없는 쇼핑몰 삭제에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  // 피해 사례 제보 삭제
  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('이 피해 사례 제보를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteReport(reportId);
      alert('피해 사례 제보가 삭제되었습니다.');
      loadReports();
      loadAdminStats();
    } catch (error) {
      alert('피해 사례 제보 삭제에 실패했습니다.');
    }
  };

  // 피해 사례 제보 승인
  const handleApproveReport = async (reportId: number) => {
    if (!confirm('이 피해 사례 제보를 승인하시겠습니까?\n승인된 제보는 쇼핑몰 목록에 반영됩니다.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(errorData.message || '승인에 실패했습니다.');
      }

      await response.json();
      alert('피해 사례 제보가 승인되었습니다.');
      loadReports();
      loadAdminStats();
    } catch (error) {
      console.error('승인 처리 오류:', error);
      alert('승인 처리에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 피해 사례 제보 거부
  const handleRejectReport = async (reportId: number) => {
    if (!confirm('이 피해 사례 제보를 거부하시겠습니까?\n거부된 제보는 쇼핑몰 목록에 반영되지 않습니다.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(errorData.message || '거부에 실패했습니다.');
      }

      await response.json();
      alert('피해 사례 제보가 거부되었습니다.');
      loadReports();
      loadAdminStats();
    } catch (error) {
      console.error('거부 처리 오류:', error);
      alert('거부 처리에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 신고 상태 변경
  const handleUpdateReportStatus = async (reportId: number, status: 'pending' | 'approved' | 'rejected') => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(errorData.message || '상태 변경에 실패했습니다.');
      }

      await response.json();
      loadReports();
      loadAdminStats();
      setSelectedReport(null);
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 필터된 신고 목록
  const filteredReports = reports.filter(report => {
    if (reportFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reportDate = new Date(report.created_at);
      reportDate.setHours(0, 0, 0, 0);
      if (reportDate.getTime() !== today.getTime()) return false;
    } else if (reportFilter !== 'all') {
      if (report.status !== reportFilter) return false;
    }
    return true;
  });

  // 필터된 쇼핑몰 목록
  const filteredShops = shops.filter(shop => {
    if (shopFilter.search) {
      const searchLower = shopFilter.search.toLowerCase();
      const urlMatch = shop.url.toLowerCase().includes(searchLower);
      const nameMatch = (shop.name || '').toLowerCase().includes(searchLower);
      if (!urlMatch && !nameMatch) return false;
    }
    // 매우주의도 필터는 현재 구현되지 않았으므로 일단 통과
    return true;
  });

  // 평점 삭제
  const handleDeleteRating = async (ratingId: number) => {
    if (!confirm('이 평점을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteRating(ratingId);
      alert('평점이 삭제되었습니다.');
      loadRatings();
      loadAdminStats();
    } catch (error) {
      alert('평점 삭제에 실패했습니다.');
    }
  };

  // 목업 리뷰 생성
  const handleGenerateMockRatings = async () => {
    if (!confirm('목업 쇼핑몰에 테스트 리뷰 데이터를 생성하시겠습니까?\n(리뷰가 이미 있는 쇼핑몰은 스킵됩니다.)')) return;
    
    try {
      const result = await generateMockRatings();
      alert(`목업 리뷰 생성 완료: ${result.created?.length || 0}개 쇼핑몰에 리뷰가 생성되었습니다.`);
      loadRatings();
      loadAdminStats();
    } catch (error: any) {
      console.error('목업 리뷰 생성 실패:', error);
      alert(error.message || '목업 리뷰 생성에 실패했습니다.');
    }
  };

  // 쇼핑몰 병합
  const handleMergeShops = async (childId: number) => {
    const targetId = parseInt(mergeTargetId);
    
    if (!targetId || isNaN(targetId)) {
      alert('병합할 대상 쇼핑몰 ID를 입력해주세요.');
      return;
    }

    if (targetId === childId) {
      alert('같은 쇼핑몰은 병합할 수 없습니다.');
      return;
    }

    const targetShop = shops.find(s => s.id === targetId);
    const childShop = shops.find(s => s.id === childId);
    
    if (!targetShop) {
      alert('대상 쇼핑몰을 찾을 수 없습니다.');
      return;
    }

    if (!confirm(
      `'${childShop?.name || childShop?.url}'를\n` +
      `'${targetShop.name || targetShop.url}' (ID: ${targetId})와 병합하시겠습니까?\n\n` +
      `✅ 양방향 병합: 두 쇼핑몰의 모든 데이터(피해 사례 제보, 평점)가 통합됩니다.\n` +
      `✅ 어느 URL로 접속해도 통합된 데이터를 볼 수 있습니다.\n` +
      `✅ 데이터는 삭제되지 않고 병합됩니다.`
    )) {
      return;
    }

    try {
      await mergeShops(targetId, childId);
      alert('쇼핑몰이 성공적으로 병합되었습니다.');
      setMergingShopId(null);
      setMergeTargetId('');
      loadShops();
      loadAdminStats();
    } catch (error) {
      alert('쇼핑몰 병합에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 커뮤니티 게시글 삭제
  const handleDeleteCommunityPost = async (postId: number, title: string) => {
    if (!confirm(`게시글 "${title}"을(를) 삭제하시겠습니까?\n연관된 댓글도 모두 삭제됩니다.`)) {
      return;
    }

    try {
      await deleteAdminCommunityPost(postId);
      alert('게시글이 삭제되었습니다.');
      loadCommunityPosts();
      loadCommunityComments();
    } catch (error) {
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  // 커뮤니티 댓글 삭제
  const handleDeleteCommunityComment = async (commentId: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteAdminCommunityComment(commentId);
      alert('댓글이 삭제되었습니다.');
      loadCommunityComments();
      loadCommunityPosts();
    } catch (error) {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center border border-gray-200">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않았거나 관리자가 아닌 경우
  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

  // 관리자 대시보드
  return (
    <div className="min-h-screen bg-white">
      {/* 고정 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">여기몰까 Admin Console</h1>
            <Badge className="text-xs bg-green-100 text-green-700 border-green-300">관리자</Badge>
          </div>
          <Button 
            onClick={handleLogout} 
            className="min-h-[44px] w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation"
          >
            로그아웃
          </Button>
        </div>
        
        {/* 탭 영역 */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap ${
                currentTab === 'stats' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
              onClick={() => setCurrentTab('stats')}
            >
              📊 <span className="hidden sm:inline">통계</span>
              <span className="sm:hidden">통계</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap ${
                currentTab === 'shops' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
              onClick={() => setCurrentTab('shops')}
            >
              🏪 <span className="hidden sm:inline">쇼핑몰 관리</span>
              <span className="sm:hidden">쇼핑몰</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap ${
                currentTab === 'reports' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
              onClick={() => setCurrentTab('reports')}
            >
              ⚠️ <span className="hidden md:inline">피해 사례 제보 관리</span>
              <span className="md:hidden">제보 관리</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap ${
                currentTab === 'ratings' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
              onClick={() => setCurrentTab('ratings')}
            >
              ⭐ <span className="hidden sm:inline">평점 관리</span>
              <span className="sm:hidden">평점</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap ${
                currentTab === 'users' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
              onClick={() => setCurrentTab('users')}
            >
              👥 <span className="hidden sm:inline">사용자 관리</span>
              <span className="sm:hidden">사용자</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap ${
                currentTab === 'community' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
              onClick={() => setCurrentTab('community')}
            >
              💬 <span className="hidden sm:inline">커뮤니티 관리</span>
              <span className="sm:hidden">커뮤니티</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-8">
        {/* 통계 탭 */}
        {currentTab === 'stats' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">📊 시스템 통계</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="bg-white border-blue-200 border-2">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">총 쇼핑몰 수</h3>
                    <div className="text-3xl sm:text-4xl font-bold text-blue-600">{stats?.totalShops ?? 0}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-red-200 border-2">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">총 피해 사례 제보 수</h3>
                    <div className="text-3xl sm:text-4xl font-bold text-red-600">{stats?.totalReports ?? 0}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-gray-200 border-2">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">총 평점 수</h3>
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900">{stats?.totalRatings ?? 0}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-gray-200 border-2">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">총 사용자 수</h3>
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900">{stats?.totalUsers ?? 0}</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 통계 차트 섹션 */}
        {currentTab === 'stats' && (
          <div className="mt-8">
            <AdminDashboardCharts
              reportsByDate={stats?.reportsByDate}
              riskDistribution={stats?.riskDistribution}
              reportsByCategory={stats?.reportsByCategory}
            />
          </div>
        )}

        {/* 쇼핑몰 관리 탭 */}
        {currentTab === 'shops' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🏪 쇼핑몰 관리 ({shops.length}개)</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="URL 또는 이름 검색..."
                    value={shopFilter.search}
                    onChange={(e) => setShopFilter({ ...shopFilter, search: e.target.value })}
                    className="w-full sm:w-64 min-h-[44px]"
                  />
                  <select
                    value={shopFilter.riskLevel}
                    onChange={(e) => setShopFilter({ ...shopFilter, riskLevel: e.target.value as any })}
                    className="min-h-[44px] px-3 py-2 rounded-md border border-gray-300 bg-white text-sm touch-manipulation"
                  >
                    <option value="all">전체 매우주의도</option>
                    <option value="safe">안전</option>
                    <option value="caution">주의</option>
                    <option value="dangerous">매우주의</option>
                    <option value="critical">주의</option>
                  </select>
                  <Button
                    onClick={handleDeleteUnknownShops}
                    className="min-h-[44px] w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 touch-manipulation"
                  >
                    알 수 없는 쇼핑몰 삭제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
            {filteredShops.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">쇼핑몰 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 bg-gray-50">ID</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 bg-gray-50">URL</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 bg-gray-50">이름</th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50">부모 쇼핑몰</th>
                        <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50">등록일</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 bg-gray-50">관리</th>
                      </tr>
                    </thead>
                  <tbody>
                    {filteredShops.map((shop) => (
                    <tr key={shop.id} className={`border-b border-gray-200 hover:bg-gray-50 ${shop.parent_shop_id ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{shop.id}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <a 
                          href={`/search?url=${encodeURIComponent(shop.url)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all text-xs sm:text-sm"
                        >
                          {shop.url}
                        </a>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                        {editingShopId === shop.id ? (
                          <div className="space-y-2">
                          <input
                            type="text"
                            value={editingShopName}
                            onChange={(e) => setEditingShopName(e.target.value)}
                              placeholder="쇼핑몰 이름을 입력하세요 (예: 신지모루)"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-base transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            autoFocus
                          />
                            <p className="text-xs text-gray-500">
                              현재 URL: {shop.url}
                            </p>
                          </div>
                        ) : (
                          <div>
                            {shop.name && shop.name !== shop.url ? (
                              <span className="font-medium">{shop.name}</span>
                            ) : shop.name ? (
                              <span className="text-gray-500 italic">{shop.name} (URL과 동일)</span>
                            ) : (
                              <span className="text-gray-500 italic">(이름 없음 - URL: {shop.url})</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm">
                        {shop.parent_shop_id ? (
                          <span className="text-orange-600 font-bold">
                            → #{shop.parent_shop_id} 에 병합됨
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900">{new Date(shop.created_at).toLocaleString('ko-KR')}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {editingShopId === shop.id ? (
                            <>
                              <button 
                                onClick={() => handleUpdateShopName(shop.id)}
                                className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-green-700 touch-manipulation"
                              >
                                저장
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingShopId(null);
                                  setEditingShopName('');
                                }}
                                className="min-h-[44px] px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-600 touch-manipulation"
                              >
                                취소
                              </button>
                            </>
                          ) : mergingShopId === shop.id ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={mergeTargetId}
                                onChange={(e) => setMergeTargetId(e.target.value)}
                                placeholder="대상 ID"
                                className="w-24 px-2 py-1.5 border-2 border-gray-300 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleMergeShops(shop.id)}
                                className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-green-700 touch-manipulation"
                              >
                                병합
                              </button>
                              <button 
                                onClick={() => {
                                  setMergingShopId(null);
                                  setMergeTargetId('');
                                }}
                                className="min-h-[44px] px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-600 touch-manipulation"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingShopId(shop.id);
                                  setEditingShopName(shop.name || '');
                                }}
                                className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 touch-manipulation"
                              >
                                수정
                              </button>
                              <button 
                                onClick={() => {
                                  setMergingShopId(shop.id);
                                  setMergeTargetId('');
                                }}
                                className="min-h-[44px] px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-yellow-700 touch-manipulation"
                              >
                                병합
                              </button>
                              <button 
                                onClick={() => handleDeleteShop(shop.id, shop.name || shop.url)}
                                className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700 touch-manipulation"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {/* 신고 관리 탭 */}
        {currentTab === 'reports' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">⚠️ 피해 사례 제보 관리 ({filteredReports.length}개)</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value as any)}
                    className="min-h-[44px] w-full sm:w-auto px-3 py-2 rounded-md border border-gray-300 bg-white text-sm touch-manipulation"
                  >
                    <option value="all">전체</option>
                    <option value="today">오늘 신고</option>
                    <option value="pending">대기중</option>
                    <option value="approved">승인됨</option>
                    <option value="rejected">거부됨</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">피해 사례 제보 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">쇼핑몰</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">카테고리</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">제보자</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">제보일</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">상태</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 text-xs">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                    <tr 
                      key={report.id} 
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="px-3 py-2 text-gray-900 text-sm">{report.id}</td>
                      <td className="px-3 py-2 text-gray-900 text-sm max-w-xs truncate" title={report.shops?.name || report.shops?.url}>
                        {report.shops?.name || report.shops?.url}
                      </td>
                      <td className="px-3 py-2 text-gray-900 text-sm">
                        {(() => {
                          try {
                            return JSON.parse(report.categories).join(', ');
                          } catch {
                            return report.categories;
                          }
                        })()}
                      </td>
                      <td className="px-3 py-2 text-gray-900 text-sm">{report.reporter_name || '익명'}</td>
                      <td className="px-3 py-2 text-gray-900 text-sm">{new Date(report.created_at).toLocaleString('ko-KR')}</td>
                      <td className="px-3 py-2">
                        <Badge 
                          className={
                            report.status === 'pending' 
                              ? 'bg-warning/20 text-warning border-warning' 
                              : report.status === 'approved'
                              ? 'bg-success/20 text-success border-success'
                              : 'bg-destructive/20 text-destructive border-destructive'
                          }
                        >
                          {report.status === 'pending' ? '대기중' : report.status === 'approved' ? '승인' : '거부'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReport(report)}
                          >
                            상세
                          </Button>
                          <select
                            value={report.status || 'pending'}
                            onChange={(e) => handleUpdateReportStatus(report.id, e.target.value as any)}
                            className="px-2 py-1 rounded-md border border-gray-300 bg-white text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="pending">대기중</option>
                            <option value="approved">승인</option>
                            <option value="rejected">거부</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {/* 신고 상세 보기 모달 */}
        {selectedReport && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReport(null)}
          >
            <Card 
              className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">신고 상세 정보</h3>
                  <Button variant="ghost" onClick={() => setSelectedReport(null)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">신고 ID</label>
                  <p className="text-gray-900">{selectedReport.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">쇼핑몰</label>
                  <p className="text-gray-900">{selectedReport.shops?.name || selectedReport.shops?.url}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">카테고리</label>
                  <p className="text-gray-900">
                    {(() => {
                      try {
                        return JSON.parse(selectedReport.categories).join(', ');
                      } catch {
                        return selectedReport.categories;
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">상세 설명</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-100 p-3 rounded-md">{selectedReport.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">제보자</label>
                  <p className="text-gray-900">{selectedReport.reporter_name || '익명'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">제보일</label>
                  <p className="text-gray-900">{new Date(selectedReport.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">상태</label>
                  <div className="mt-2">
                    <select
                      value={selectedReport.status || 'pending'}
                      onChange={(e) => handleUpdateReportStatus(selectedReport.id, e.target.value as any)}
                      className="px-3 py-2 rounded-md border border-gray-300 bg-white"
                    >
                      <option value="pending">대기중</option>
                      <option value="approved">승인</option>
                      <option value="rejected">거부</option>
                    </select>
                  </div>
                </div>
                {(() => {
                  let evidenceFiles: string[] = [];
                  if (selectedReport.evidenceFiles) {
                    if (typeof selectedReport.evidenceFiles === 'string') {
                      try {
                        evidenceFiles = JSON.parse(selectedReport.evidenceFiles);
                      } catch (e) {
                        evidenceFiles = [];
                      }
                    } else if (Array.isArray(selectedReport.evidenceFiles)) {
                      evidenceFiles = selectedReport.evidenceFiles;
                    }
                  }
                  
                  if (evidenceFiles.length === 0) return null;
                  
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                  
                  return (
                    <div>
                      <label className="text-sm font-medium text-gray-600">증빙 자료 ({evidenceFiles.length}개)</label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {evidenceFiles.map((fileUrl: string, index: number) => {
                          const imageUrl = fileUrl.startsWith('http') 
                            ? fileUrl 
                            : `${apiUrl}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
                          
                          return (
                            <img
                              key={index}
                              src={imageUrl}
                              alt={`증빙 자료 ${index + 1}`}
                              className="w-full h-auto rounded-md border border-gray-300 cursor-pointer"
                              onClick={() => setSelectedImage(imageUrl)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setSelectedReport(null);
                      handleDeleteReport(selectedReport.id);
                    }}
                    variant="destructive"
                  >
                    삭제
                  </Button>
                  <Button
                    onClick={() => setSelectedReport(null)}
                    variant="outline"
                  >
                    닫기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 평점 관리 탭 */}
        {currentTab === 'ratings' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">⭐ 평점 관리 ({ratings.length}개)</h2>
                <Button 
                  onClick={handleGenerateMockRatings}
                  className="min-h-[44px] px-4 py-2 bg-green-600 text-white hover:bg-green-700 touch-manipulation text-sm sm:text-base"
                >
                  목업 리뷰 생성
                </Button>
              </div>
            </CardHeader>
            <CardContent>
            {ratings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">평점 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">쇼핑몰</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">평점</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">리뷰 내용</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">등록일</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((rating) => (
                    <tr key={rating.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{rating.id}</td>
                      <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{rating.shops?.name || rating.shops?.url}</td>
                      <td className="px-4 py-3 text-gray-900">
                        <span className="text-yellow-500">
                          {'⭐'.repeat(rating.rating)}
                        </span>
                        {rating.rating}점
                      </td>
                      <td className="px-4 py-3 text-gray-900 max-w-md break-words">
                        {rating.comment ? (
                          <span className={rating.comment.includes('[테스트 데이터]') ? 'text-orange-600 font-bold' : ''}>
                            {rating.comment}
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">리뷰 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{new Date(rating.created_at).toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => handleDeleteRating(rating.id)}
                          className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700 touch-manipulation"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {/* 사용자 관리 탭 */}
        {currentTab === 'users' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">👥 사용자 관리 ({users.length}명)</h2>
            </CardHeader>
            <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">사용자 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">사용자명</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">이메일</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">전화번호</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">권한</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">가입일</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{user.id}</td>
                      <td className="px-4 py-3 text-gray-900">{user.username}</td>
                      <td className="px-4 py-3 text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-gray-900">{user.phone_number}</td>
                      <td className="px-4 py-3">
                        <Badge 
                          className={
                            user.role === 'admin' 
                              ? 'bg-blue-100 text-blue-700 border-blue-300' 
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }
                        >
                          {user.role === 'admin' ? '관리자' : '일반 사용자'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{new Date(user.created_at).toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {user.role === 'admin' ? (
                            <button 
                              onClick={() => handleUpdateUserRole(user.id, 'user')}
                              className="min-h-[44px] px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-600 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={user.id === currentUser?.id}
                            >
                              일반 사용자로 변경
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateUserRole(user.id, 'admin')}
                              className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 touch-manipulation"
                            >
                              관리자로 지정
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {/* 커뮤니티 관리 탭 */}
        {currentTab === 'community' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">💬 커뮤니티 관리</h2>
            </CardHeader>
            <CardContent>
            
            {/* 게시글 관리 */}
            <div className="mb-12">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">📝 게시글 관리 ({communityPosts.length}개)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">제목</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">내용 미리보기</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">작성자</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">조회수</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">좋아요</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">댓글수</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">작성일</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityPosts.map((post) => (
                      <tr key={post.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{post.id}</td>
                        <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={post.title}>
                          {post.title.length > 30 ? post.title.substring(0, 30) + '...' : post.title}
                        </td>
                        <td className="px-4 py-3 text-gray-900 max-w-md truncate" title={post.content}>
                          {post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {post.author}
                          <br />
                          <span className="text-sm text-gray-500">{post.author_email}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{post.views}</td>
                        <td className="px-4 py-3 text-gray-900">{post.likes}</td>
                        <td className="px-4 py-3 text-gray-900">{post.comments_count}</td>
                        <td className="px-4 py-3 text-gray-900">{new Date(post.created_at).toLocaleString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => handleDeleteCommunityPost(post.id, post.title)}
                            className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700 touch-manipulation"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 댓글 관리 */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">💭 댓글 관리 ({communityComments.length}개)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">댓글 내용</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">작성자</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">게시글 제목</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">작성일</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityComments.map((comment) => (
                      <tr key={comment.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{comment.id}</td>
                        <td className="px-4 py-3 text-gray-900 max-w-md truncate" title={comment.content}>
                          {comment.content.length > 50 ? comment.content.substring(0, 50) + '...' : comment.content}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {comment.author}
                          <br />
                          <span className="text-sm text-gray-500">{comment.author_email}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={comment.post_title}>
                          {comment.post_title.length > 30 ? comment.post_title.substring(0, 30) + '...' : comment.post_title}
                        </td>
                        <td className="px-4 py-3 text-gray-900">{new Date(comment.created_at).toLocaleString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => handleDeleteCommunityComment(comment.id)}
                            className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700 touch-manipulation"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </CardContent>
          </Card>
        )}
      </div>
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="image-modal-close" onClick={() => setSelectedImage(null)}>×</span>
            <img src={selectedImage} alt="증빙 자료" className="image-modal-image" />
          </div>
        </div>
      )}
      <style>{`
        .evidence-images {
          margin-top: 1rem;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .images-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .evidence-thumbnail {
          border: 2px solid #ddd;
          border-radius: 4px;
          transition: transform 0.2s;
          object-fit: cover;
          cursor: pointer;
          max-width: 150px;
          max-height: 150px;
        }

        .evidence-thumbnail:hover {
          transform: scale(1.05);
          border-color: #6495ED;
        }

        .image-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          cursor: pointer;
          padding: 20px;
        }

        .image-modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-modal-close {
          position: absolute;
          top: -50px;
          right: 0;
          color: white;
          font-size: 3rem;
          cursor: pointer;
          z-index: 10001;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: background 0.2s;
          line-height: 1;
        }

        .image-modal-close:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        .image-modal-image {
          max-width: 100%;
          max-height: 90vh;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          object-fit: contain;
        }

        .action-buttons-vertical {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: stretch;
        }

        .action-buttons-vertical .action-btn {
          width: 100%;
          min-width: 80px;
          padding: 0.5rem 1rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
