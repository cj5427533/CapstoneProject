import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getMe, getAuthToken, API_BASE_URL } from '../utils/api';
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
  generateMockRatings,
  getSecurityAlerts,
  getSecurityMockAlerts
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
  loginStats?: {
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    successRate: string;
    todayTotalLogins: number;
    todaySuccessfulLogins: number;
    todaySuccessRate: string;
  };
  loginsByDate?: { date: string; total: number; success: number; failed: number }[];
  loginsByFailureReason?: { reason: string; count: number }[];
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
  activity?: {
    loginCount: number;
    lastLogin: string | null;
    searchCount: number;
    reportCount: number;
    ratingCount: number;
    postCount: number;
    commentCount: number;
    activityScore: number;
    activityLevel: 'INACTIVE' | 'LOW' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
    lastActivity: string | null;
  };
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
  
  const [currentTab, setCurrentTab] = useState<'stats' | 'shops' | 'reports' | 'ratings' | 'users' | 'community' | 'security'>('stats');
  
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
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [securitySummary, setSecuritySummary] = useState<{ total: number; high: number; medium: number; low: number } | null>(null);
  const [securityMockActive, setSecurityMockActive] = useState(false);
  const [editingShopId, setEditingShopId] = useState<number | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [mergingShopId, setMergingShopId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportFilter, setReportFilter] = useState<'all' | 'today' | 'pending' | 'approved' | 'rejected'>('all');
  const [shopFilter, setShopFilter] = useState<{ search: string; riskLevel: 'all' | 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' }>({ search: '', riskLevel: 'all' });
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [ratingSearchTerm, setRatingSearchTerm] = useState<string>('');
  const [communityPostSearchTerm, setCommunityPostSearchTerm] = useState<string>('');
  const [communityCommentSearchTerm, setCommunityCommentSearchTerm] = useState<string>('');
  const [shopPagination, setShopPagination] = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [reportPagination, setReportPagination] = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [userPagination, setUserPagination] = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [selectedUserActivity, setSelectedUserActivity] = useState<UserData | null>(null);

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

  // 쇼핑몰 데이터 로드 (Full-Text Search 지원)
  const loadShops = async (page: number = shopPagination.page) => {
    try {
      const shopsData = await getAdminShops({
        search: shopFilter.search || undefined,
        page: page,
        limit: 10
      });
      console.log('쇼핑몰 데이터:', shopsData);
      // API가 { shops: [...], pagination: {...} } 형태로 반환
      if (Array.isArray(shopsData)) {
        setShops(shopsData);
      } else {
        setShops(shopsData.shops || []);
        if (shopsData.pagination) {
          setShopPagination(shopsData.pagination);
        }
      }
    } catch (error) {
      console.error('쇼핑몰 조회 실패:', error);
      setShops([]);
    }
  };

  // 피해 사례 제보 데이터 로드 (Full-Text Search 지원)
  const loadReports = async (page: number = reportPagination.page) => {
    try {
      const { reports: fetchedReports, pagination } = await getAdminReports({
        search: reportSearchTerm || undefined,
        page,
        limit: 10
      });
      console.log('피해 사례 제보 데이터:', fetchedReports);
      const normalizedReports = Array.isArray(fetchedReports)
        ? fetchedReports
        : (Array.isArray((fetchedReports as any)?.reports) ? (fetchedReports as any).reports : []);
      setReports(normalizedReports);
      if (pagination) {
        setReportPagination({
          page: pagination.page || page,
          limit: pagination.limit || 10,
          total: pagination.total || normalizedReports.length,
          totalPages: pagination.totalPages || Math.max(1, Math.ceil((pagination.total || normalizedReports.length || 1) / (pagination.limit || 10)))
        });
      } else {
        setReportPagination({
          page,
          limit: 10,
          total: normalizedReports.length,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('피해 사례 제보 조회 실패:', error);
      setReports([]);
      setReportPagination(prev => ({ ...prev, page: 1, total: 0, totalPages: 0 }));
    }
  };

  // 평점 데이터 로드 (검색 지원)
  const loadRatings = async () => {
    try {
      const ratingsData = await getAdminRatings({
        search: ratingSearchTerm || undefined,
        page: 1,
        limit: 100
      });
      console.log('평점 데이터:', ratingsData);
      // API가 { ratings: [...], pagination: {...} } 형태로 반환
      if (Array.isArray(ratingsData)) {
        setRatings(ratingsData);
      } else if (ratingsData && typeof ratingsData === 'object' && 'ratings' in ratingsData) {
        setRatings(Array.isArray(ratingsData.ratings) ? ratingsData.ratings : []);
      } else {
        setRatings([]);
      }
    } catch (error) {
      console.error('평점 조회 실패:', error);
      setRatings([]);
    }
  };

  // 사용자 데이터 로드 (Full-Text Search 지원, 페이지네이션)
  const loadUsers = async (page: number = 1) => {
    try {
      const usersData = await getAdminUsers({
        search: userSearchTerm || undefined,
        page: page,
        limit: 10
      });
      console.log('사용자 데이터:', usersData);
      // API가 { users: [...], pagination: {...} } 형태로 반환
      if (Array.isArray(usersData)) {
        setUsers(usersData);
        setUserPagination({ page: 1, limit: 10, total: usersData.length, totalPages: 1 });
      } else {
        setUsers(usersData.users || []);
        setUserPagination(usersData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('사용자 조회 실패:', error);
      setUsers([]);
      setUserPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
    }
  };

  // 커뮤니티 게시글 로드 (검색 지원)
  const loadCommunityPosts = async () => {
    try {
      const postsData = await getAdminCommunityPosts({
        search: communityPostSearchTerm || undefined,
        page: 1,
        limit: 100
      });
      // API가 { posts: [...], pagination: {...} } 형태로 반환
      if (Array.isArray(postsData)) {
        setCommunityPosts(postsData);
      } else if (postsData && typeof postsData === 'object' && 'posts' in postsData) {
        setCommunityPosts(Array.isArray(postsData.posts) ? postsData.posts : []);
      } else {
        setCommunityPosts([]);
      }
    } catch (error) {
      console.error('커뮤니티 게시글 조회 실패:', error);
      setCommunityPosts([]);
    }
  };

  // 커뮤니티 댓글 로드 (검색 지원)
  const loadCommunityComments = async () => {
    try {
      const commentsData = await getAdminCommunityComments({
        search: communityCommentSearchTerm || undefined,
        page: 1,
        limit: 100
      });
      // API가 { comments: [...], pagination: {...} } 형태로 반환
      if (Array.isArray(commentsData)) {
        setCommunityComments(commentsData);
      } else if (commentsData && typeof commentsData === 'object' && 'comments' in commentsData) {
        setCommunityComments(Array.isArray(commentsData.comments) ? commentsData.comments : []);
      } else {
        setCommunityComments([]);
      }
    } catch (error) {
      console.error('커뮤니티 댓글 조회 실패:', error);
      setCommunityComments([]);
    }
  };

  // 보안 알림 로드
  const loadSecurityAlerts = async () => {
    try {
      const alertsData = await getSecurityAlerts();
      setSecurityAlerts(alertsData.alerts || []);
      setSecuritySummary(alertsData.summary || null);
      setSecurityMockActive(false);
    } catch (error) {
      console.error('보안 알림 조회 실패:', error);
      setSecurityAlerts([]);
      setSecuritySummary(null);
      setSecurityMockActive(false);
    }
  };

  const loadSecurityMockAlerts = async () => {
    try {
      const alertsData = await getSecurityMockAlerts();
      setSecurityAlerts(alertsData.alerts || []);
      setSecuritySummary(alertsData.summary || null);
      setSecurityMockActive(true);
      toast.info('보안 목업 데이터를 불러왔습니다.');
    } catch (error) {
      console.error('보안 목업 알림 조회 실패:', error);
      toast.error('보안 목업 데이터를 불러오지 못했습니다.');
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
      if (currentTab === 'shops') {
        setShopPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        await loadShops(1);
      }
      else if (currentTab === 'reports') {
        setReportPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        await loadReports(1);
      }
      else if (currentTab === 'ratings') await loadRatings();
      else if (currentTab === 'users') {
        setUserPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        await loadUsers(1);
      }
      else if (currentTab === 'community') {
        await loadCommunityPosts();
        await loadCommunityComments();
      }
      else if (currentTab === 'security') await loadSecurityAlerts();
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
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!response.ok) {
        // 네트워크 오류 체크
        if (!response.status) {
          throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
        }
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(errorData.message || `승인에 실패했습니다. (상태 코드: ${response.status})`);
      }

      await response.json();
      toast.success('피해 사례 제보가 승인되었습니다.');
      loadReports();
      loadAdminStats();
    } catch (error) {
      console.error('승인 처리 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      // 네트워크 오류 특별 처리
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || error instanceof TypeError) {
        toast.error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else {
        toast.error(`승인 처리에 실패했습니다: ${errorMessage}`);
      }
    }
  };

  // 피해 사례 제보 거부
  const handleRejectReport = async (reportId: number) => {
    if (!confirm('이 피해 사례 제보를 거부하시겠습니까?\n거부된 제보는 쇼핑몰 목록에 반영되지 않습니다.')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (!response.ok) {
        // 네트워크 오류 체크
        if (!response.status) {
          throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
        }
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(errorData.message || `거부에 실패했습니다. (상태 코드: ${response.status})`);
      }

      await response.json();
      toast.success('피해 사례 제보가 거부되었습니다.');
      loadReports();
      loadAdminStats();
    } catch (error) {
      console.error('거부 처리 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      // 네트워크 오류 특별 처리
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        toast.error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else {
        toast.error(`거부 처리에 실패했습니다: ${errorMessage}`);
      }
    }
  };

  // 신고 상태 변경
  const handleUpdateReportStatus = async (reportId: number, status: 'pending' | 'approved' | 'rejected') => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        // 네트워크 오류 체크
        if (!response.status) {
          throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
        }
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(errorData.message || `상태 변경에 실패했습니다. (상태 코드: ${response.status})`);
      }

      await response.json();
      const statusLabels = {
        pending: '대기중',
        approved: '승인',
        rejected: '거부'
      };
      toast.success(`피해 사례 제보 상태가 "${statusLabels[status]}"으로 변경되었습니다.`);
      loadReports();
      loadAdminStats();
      setSelectedReport(null);
    } catch (error) {
      console.error('상태 변경 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      // 네트워크 오류 특별 처리
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || error instanceof TypeError) {
        toast.error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else {
        toast.error(`상태 변경에 실패했습니다: ${errorMessage}`);
      }
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

  // 검색 실행 함수 (검색 버튼 클릭 시)
  const handleSearch = () => {
    if (currentTab === 'shops') {
      setShopPagination({ ...shopPagination, page: 1 });
      loadShops(1);
    } else if (currentTab === 'reports') {
      setReportPagination(prev => ({ ...prev, page: 1 }));
      loadReports(1);
    } else if (currentTab === 'users') {
      setUserPagination(prev => ({ ...prev, page: 1 }));
      loadUsers(1);
    } else if (currentTab === 'ratings') {
      loadRatings();
    } else if (currentTab === 'community') {
      loadCommunityPosts();
      loadCommunityComments();
    }
  };

  // Enter 키로 검색
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 필터된 쇼핑몰 목록 (서버 사이드 검색 사용, 클라이언트 필터링 제거)
  // 위험도 필터는 현재 백엔드에서 위험도 정보를 반환하지 않아 구현되지 않음
  const filteredShops = shops.filter(shop => {
    if (shopFilter.riskLevel !== 'all') {
      // 위험도 필터링 로직은 추후 구현 예정
      return true;
    }
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
            className="min-h-[44px] w-full sm:w-auto border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            로그아웃
          </Button>
        </div>
        
        {/* 탭 영역 */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'stats' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('stats')}
            >
              📊 <span className="hidden sm:inline">통계</span>
              <span className="sm:hidden">통계</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'shops' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('shops')}
            >
              🏪 <span className="hidden sm:inline">쇼핑몰 관리</span>
              <span className="sm:hidden">쇼핑몰</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'reports' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('reports')}
            >
              ⚠️ <span className="hidden md:inline">피해 사례 제보 관리</span>
              <span className="md:hidden">제보 관리</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'ratings' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('ratings')}
            >
              ⭐ <span className="hidden sm:inline">평점 관리</span>
              <span className="sm:hidden">평점</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'users' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('users')}
            >
              👥 <span className="hidden sm:inline">사용자 관리</span>
              <span className="sm:hidden">사용자</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'community' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('community')}
            >
              💬 <span className="hidden sm:inline">커뮤니티 관리</span>
              <span className="sm:hidden">커뮤니티</span>
            </Button>
            <Button
              className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all touch-manipulation whitespace-nowrap border border-gray-300 ${
                currentTab === 'security' 
                  ? 'bg-white text-gray-900 border-gray-400 shadow-sm' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentTab('security')}
            >
              🔒 <span className="hidden sm:inline">보안 모니터링</span>
              <span className="sm:hidden">보안</span>
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
              
              {/* 로그인 통계 카드 */}
              {stats?.loginStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
                  <Card className="bg-white border-green-200 border-2">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">총 로그인 수</h3>
                      <div className="text-3xl sm:text-4xl font-bold text-green-600">{stats.loginStats.totalLogins}</div>
                      <p className="text-xs text-gray-500 mt-1">성공률: {stats.loginStats.successRate}%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-green-200 border-2">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">성공한 로그인</h3>
                      <div className="text-3xl sm:text-4xl font-bold text-green-600">{stats.loginStats.successfulLogins}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-red-200 border-2">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">실패한 로그인</h3>
                      <div className="text-3xl sm:text-4xl font-bold text-red-600">{stats.loginStats.failedLogins}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-blue-200 border-2">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">오늘 로그인</h3>
                      <div className="text-3xl sm:text-4xl font-bold text-blue-600">{stats.loginStats.todayTotalLogins}</div>
                      <p className="text-xs text-gray-500 mt-1">성공률: {stats.loginStats.todaySuccessRate}%</p>
                    </CardContent>
                  </Card>
                </div>
              )}
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
              loginsByDate={stats?.loginsByDate}
              loginsByFailureReason={stats?.loginsByFailureReason}
            />
          </div>
        )}

        {/* 쇼핑몰 관리 탭 */}
        {currentTab === 'shops' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🏪 쇼핑몰 관리 ({shopPagination.total}개)</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder="URL 또는 이름 검색..."
                      value={shopFilter.search}
                      onChange={(e) => setShopFilter({ ...shopFilter, search: e.target.value })}
                      onKeyPress={handleSearchKeyPress}
                      className="w-full sm:w-64 min-h-[44px] bg-white"
                    />
                    <Button
                      onClick={handleSearch}
                      className="min-h-[44px] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 touch-manipulation rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      🔍 검색
                    </Button>
                  </div>
                  <select
                    value={shopFilter.riskLevel}
                    onChange={(e) => setShopFilter({ ...shopFilter, riskLevel: e.target.value as any })}
                    className="min-h-[44px] px-3 pr-10 py-2 rounded-md border border-gray-300 bg-white text-sm touch-manipulation appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right-3 bg-[length:12px_12px] cursor-pointer"
                  >
                    <option value="all">전체</option>
                    <option value="VERY_HIGH">매우높음</option>
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">주의필요</option>
                    <option value="LOW">낮음</option>
                    <option value="VERY_LOW">매우낮음</option>
                  </select>
                  <Button
                    onClick={handleDeleteUnknownShops}
                    className="min-h-[44px] w-full sm:w-auto border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900">{new Date(shop.created_at).toLocaleString('ko-KR')}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {editingShopId === shop.id ? (
                            <>
                              <button 
                                onClick={() => handleUpdateShopName(shop.id)}
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
                              >
                                저장
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingShopId(null);
                                  setEditingShopName('');
                                }}
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
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
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
                              >
                                병합
                              </button>
                              <button 
                                onClick={() => {
                                  setMergingShopId(null);
                                  setMergeTargetId('');
                                }}
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
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
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
                              >
                                수정
                              </button>
                              <button 
                                onClick={() => {
                                  setMergingShopId(shop.id);
                                  setMergeTargetId('');
                                }}
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
                              >
                                병합
                              </button>
                              <button 
                                onClick={() => handleDeleteShop(shop.id, shop.name || shop.url)}
                                className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
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
            
            {/* 페이지네이션 */}
            {shopPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  onClick={() => {
                    const newPage = shopPagination.page - 1;
                    if (newPage >= 1) {
                      loadShops(newPage);
                    }
                  }}
                  disabled={shopPagination.page === 1}
                  className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, shopPagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (shopPagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (shopPagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (shopPagination.page >= shopPagination.totalPages - 2) {
                      pageNum = shopPagination.totalPages - 4 + i;
                    } else {
                      pageNum = shopPagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => loadShops(pageNum)}
                        className={`min-h-[44px] px-4 py-2 border rounded-md text-sm font-medium transition-colors touch-manipulation ${
                          shopPagination.page === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => {
                    const newPage = shopPagination.page + 1;
                    if (newPage <= shopPagination.totalPages) {
                      loadShops(newPage);
                    }
                  }}
                  disabled={shopPagination.page === shopPagination.totalPages}
                  className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </Button>
                <span className="text-sm text-gray-600 ml-2">
                  {shopPagination.page} / {shopPagination.totalPages} 페이지
                </span>
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">⚠️ 피해 사례 제보 관리 ({reportPagination.total}개)</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder="내용, 카테고리, 제보자명 검색..."
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="w-full sm:w-64 min-h-[44px] bg-white"
                    />
                    <Button
                      onClick={handleSearch}
                      className="min-h-[44px] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 touch-manipulation rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      🔍 검색
                    </Button>
                  </div>
                  <select
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value as any)}
                    className="min-h-[44px] w-full sm:w-auto px-3 pr-10 py-2 rounded-md border border-gray-300 bg-white text-sm touch-manipulation appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right-3 bg-[length:12px_12px] cursor-pointer"
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
                            className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium transition-colors hover:bg-gray-50 touch-manipulation"
                          >
                            상세
                          </Button>
                          <select
                            value={report.status || 'pending'}
                            onChange={(e) => handleUpdateReportStatus(report.id, e.target.value as any)}
                            className="px-2 pr-8 py-1 rounded-md border border-gray-300 bg-white text-xs appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right-2 bg-[length:12px_12px] cursor-pointer"
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
            {reportPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  onClick={() => {
                    const newPage = reportPagination.page - 1;
                    if (newPage >= 1) {
                      loadReports(newPage);
                    }
                  }}
                  disabled={reportPagination.page === 1}
                  className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, reportPagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (reportPagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (reportPagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (reportPagination.page >= reportPagination.totalPages - 2) {
                      pageNum = reportPagination.totalPages - 4 + i;
                    } else {
                      pageNum = reportPagination.page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => loadReports(pageNum)}
                        className={`min-h-[44px] px-4 py-2 border rounded-md text-sm font-medium transition-colors touch-manipulation ${
                          reportPagination.page === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => {
                    const newPage = reportPagination.page + 1;
                    if (newPage <= reportPagination.totalPages) {
                      loadReports(newPage);
                    }
                  }}
                  disabled={reportPagination.page === reportPagination.totalPages}
                  className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </Button>
                <span className="text-sm text-gray-600 ml-2">
                  {reportPagination.page} / {reportPagination.totalPages} 페이지
                </span>
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
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">신고 상세 정보</h3>
                      <p className="text-sm text-gray-500 mt-1">신고 ID: #{selectedReport.id}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedReport(null)}
                    className="h-10 w-10 rounded-full hover:bg-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 기본 정보 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">쇼핑몰</label>
                    <p className="text-base font-semibold text-gray-900 break-words">
                      {selectedReport.shops?.name || selectedReport.shops?.url}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">제보자</label>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedReport.reporter_name || <span className="text-gray-500 italic">익명</span>}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">제보일</label>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(selectedReport.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">상태</label>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={
                          selectedReport.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1' 
                            : selectedReport.status === 'approved'
                            ? 'bg-green-100 text-green-800 border-green-300 px-3 py-1'
                            : 'bg-red-100 text-red-800 border-red-300 px-3 py-1'
                        }
                      >
                        {selectedReport.status === 'pending' ? '⏳ 대기중' : selectedReport.status === 'approved' ? '✅ 승인됨' : '❌ 거부됨'}
                      </Badge>
                      <select
                        value={selectedReport.status || 'pending'}
                        onChange={(e) => handleUpdateReportStatus(selectedReport.id, e.target.value as any)}
                        className="px-3 pr-10 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right-3 bg-[length:12px_12px] cursor-pointer"
                      >
                        <option value="pending">대기중</option>
                        <option value="approved">승인</option>
                        <option value="rejected">거부</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 카테고리 */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">카테고리</label>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      let categories: string[] = [];
                      try {
                        categories = JSON.parse(selectedReport.categories);
                      } catch {
                        categories = [selectedReport.categories];
                      }
                      return categories.map((cat: string, idx: number) => (
                        <Badge 
                          key={idx}
                          className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1 text-sm font-medium"
                        >
                          {cat}
                        </Badge>
                      ));
                    })()}
                  </div>
                </div>

                {/* 상세 설명 */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">상세 설명</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {selectedReport.description || <span className="text-gray-400 italic">상세 설명이 없습니다.</span>}
                    </p>
                  </div>
                </div>

                {/* 증빙 자료 */}
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
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">
                        증빙 자료 ({evidenceFiles.length}개)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {evidenceFiles.map((fileUrl: string, index: number) => {
                          const imageUrl = fileUrl.startsWith('http') 
                            ? fileUrl 
                            : `${apiUrl}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
                          
                          return (
                            <div key={index} className="relative group">
                              <img
                                src={imageUrl}
                                alt={`증빙 자료 ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-all hover:shadow-lg"
                                onClick={() => setSelectedImage(imageUrl)}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-md text-sm font-medium">
                                  클릭하여 확대
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setSelectedReport(null);
                      handleDeleteReport(selectedReport.id);
                    }}
                    variant="destructive"
                    className="flex-1 md:flex-initial min-h-[44px] px-6 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors touch-manipulation"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    삭제
                  </Button>
                  <Button
                    onClick={() => setSelectedReport(null)}
                    variant="outline"
                    className="flex-1 md:flex-initial min-h-[44px] px-6 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors touch-manipulation"
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder="리뷰 내용, 쇼핑몰명 검색..."
                      value={ratingSearchTerm}
                      onChange={(e) => setRatingSearchTerm(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="w-full sm:w-64 min-h-[44px] bg-white"
                    />
                    <Button
                      onClick={handleSearch}
                      className="min-h-[44px] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 touch-manipulation rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      🔍 검색
                    </Button>
                  </div>
                  <Button 
                    onClick={handleGenerateMockRatings}
                    className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation text-sm font-medium rounded-md transition-colors"
                  >
                    목업 리뷰 생성
                  </Button>
                </div>
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
                    {(Array.isArray(ratings) ? ratings : []).map((rating) => (
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
                          className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">👥 사용자 관리 ({userPagination.total}명)</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="사용자명, 이메일, 전화번호 검색..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full sm:w-64 min-h-[44px] bg-white"
                  />
                  <Button
                    onClick={handleSearch}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 touch-manipulation rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    🔍 검색
                  </Button>
                </div>
              </div>
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
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">사용자명</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">이메일</th>
                      <th className="hidden md:table-cell px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">전화번호</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">권한</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">활성도</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">활동</th>
                      <th className="hidden md:table-cell px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">가입일</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900 bg-gray-50 text-xs">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const activityLevelLabels = {
                        'VERY_ACTIVE': '매우 활성',
                        'ACTIVE': '활성',
                        'MODERATE': '보통',
                        'LOW': '낮음',
                        'INACTIVE': '비활성'
                      };
                      const activityLevelColors = {
                        'VERY_ACTIVE': 'bg-green-100 text-green-700 border-green-300',
                        'ACTIVE': 'bg-blue-100 text-blue-700 border-blue-300',
                        'MODERATE': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                        'LOW': 'bg-orange-100 text-orange-700 border-orange-300',
                        'INACTIVE': 'bg-gray-100 text-gray-700 border-gray-300'
                      };
                      
                      return (
                        <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900 text-sm">{user.id}</td>
                          <td className="px-3 py-2 text-gray-900 text-sm">{user.username}</td>
                          <td className="px-3 py-2 text-gray-900 text-sm max-w-xs truncate" title={user.email}>{user.email}</td>
                          <td className="hidden md:table-cell px-3 py-2 text-gray-900 text-sm">{user.phone_number}</td>
                          <td className="px-3 py-2">
                            <Badge 
                              className={
                                user.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-700 border-blue-300 text-xs' 
                                  : 'bg-gray-100 text-gray-700 border-gray-300 text-xs'
                              }
                            >
                              {user.role === 'admin' ? '관리자' : '일반 사용자'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {user.activity ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge className={`${activityLevelColors[user.activity.activityLevel as keyof typeof activityLevelColors] || 'bg-gray-100 text-gray-700'} text-xs`}>
                                  {activityLevelLabels[user.activity.activityLevel as keyof typeof activityLevelLabels] || user.activity.activityLevel}
                                </Badge>
                                <span className="text-xs text-gray-600">{user.activity.activityScore}점</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {user.activity ? (
                              <button
                                onClick={() => setSelectedUserActivity(user)}
                                className="px-2 py-1 text-xs border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 transition-colors"
                              >
                                활동 상세보기
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-3 py-2 text-gray-900 text-sm">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {user.role === 'admin' ? (
                                <button 
                                  onClick={() => handleUpdateUserRole(user.id, 'user')}
                                  className="px-2 py-1 text-xs border border-gray-300 bg-white text-gray-900 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={user.id === currentUser?.id}
                                >
                                  일반 사용자로 변경
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleUpdateUserRole(user.id, 'admin')}
                                  className="px-2 py-1 text-xs border border-gray-300 bg-white text-gray-900 rounded hover:bg-gray-50 transition-colors"
                                >
                                  관리자로 지정
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {userPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  onClick={() => {
                    const newPage = userPagination.page - 1;
                    if (newPage >= 1) {
                      loadUsers(newPage);
                    }
                  }}
                  disabled={userPagination.page === 1}
                  className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, userPagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (userPagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (userPagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (userPagination.page >= userPagination.totalPages - 2) {
                      pageNum = userPagination.totalPages - 4 + i;
                    } else {
                      pageNum = userPagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => loadUsers(pageNum)}
                        className={`min-h-[44px] px-4 py-2 border rounded-md text-sm font-medium transition-colors touch-manipulation ${
                          userPagination.page === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => {
                    const newPage = userPagination.page + 1;
                    if (newPage <= userPagination.totalPages) {
                      loadUsers(newPage);
                    }
                  }}
                  disabled={userPagination.page === userPagination.totalPages}
                  className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 touch-manipulation rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </Button>
                <span className="text-sm text-gray-600 ml-2">
                  {userPagination.page} / {userPagination.totalPages} 페이지
                </span>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {/* 사용자 활동 상세보기 모달 */}
        {selectedUserActivity && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedUserActivity(null)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">사용자 활동 상세</h3>
                  <button
                    onClick={() => setSelectedUserActivity(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">사용자명</p>
                      <p className="text-base font-semibold text-gray-900">{selectedUserActivity.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">이메일</p>
                      <p className="text-base font-semibold text-gray-900">{selectedUserActivity.email}</p>
                    </div>
                  </div>
                </div>

                {selectedUserActivity.activity ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">활동 통계</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔐</span>
                          <div>
                            <p className="text-sm text-gray-600">로그인</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedUserActivity.activity.loginCount}회</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔍</span>
                          <div>
                            <p className="text-sm text-gray-600">검색</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedUserActivity.activity.searchCount}회</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📝</span>
                          <div>
                            <p className="text-sm text-gray-600">신고</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedUserActivity.activity.reportCount}건</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⭐</span>
                          <div>
                            <p className="text-sm text-gray-600">평점</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedUserActivity.activity.ratingCount}건</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💬</span>
                          <div>
                            <p className="text-sm text-gray-600">커뮤니티</p>
                            <p className="text-lg font-semibold text-gray-900">
                              게시글 {selectedUserActivity.activity.postCount}건, 댓글 {selectedUserActivity.activity.commentCount}건
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📊</span>
                          <div>
                            <p className="text-sm text-gray-600">활동 점수</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedUserActivity.activity.activityScore}점</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">활동 정보</h4>
                      <div className="space-y-2">
                        {selectedUserActivity.activity.lastLogin && (
                          <div>
                            <p className="text-sm text-gray-600">마지막 로그인</p>
                            <p className="text-base text-gray-900">{new Date(selectedUserActivity.activity.lastLogin).toLocaleString('ko-KR')}</p>
                          </div>
                        )}
                        {selectedUserActivity.activity.lastActivity && (
                          <div>
                            <p className="text-sm text-gray-600">마지막 활동</p>
                            <p className="text-base text-gray-900">{new Date(selectedUserActivity.activity.lastActivity).toLocaleString('ko-KR')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">활동 데이터가 없습니다.</p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setSelectedUserActivity(null)}
                    className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-md"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">📝 게시글 관리 ({communityPosts.length}개)</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="제목, 내용 검색..."
                    value={communityPostSearchTerm}
                    onChange={(e) => setCommunityPostSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full sm:w-64 min-h-[44px] bg-white"
                  />
                  <Button
                    onClick={() => {
                      loadCommunityPosts();
                    }}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 touch-manipulation rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    🔍 검색
                  </Button>
                </div>
              </div>
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
                    {(Array.isArray(communityPosts) ? communityPosts : []).map((post) => (
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
                            className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">💭 댓글 관리 ({communityComments.length}개)</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="댓글 내용 검색..."
                    value={communityCommentSearchTerm}
                    onChange={(e) => setCommunityCommentSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full sm:w-64 min-h-[44px] bg-white"
                  />
                  <Button
                    onClick={() => {
                      loadCommunityComments();
                    }}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 touch-manipulation rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    🔍 검색
                  </Button>
                </div>
              </div>
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
                    {(Array.isArray(communityComments) ? communityComments : []).map((comment) => (
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
                            className="min-h-[44px] px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 touch-manipulation"
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

        {/* 보안 모니터링 탭 */}
        {currentTab === 'security' && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🔒 보안 모니터링</h2>
                    {securityMockActive && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                        목업 데이터
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={loadSecurityAlerts}
                      className="min-h-[40px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                    >
                      실데이터 새로고침
                    </Button>
                    <Button
                      onClick={loadSecurityMockAlerts}
                      className="min-h-[40px] px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md text-sm font-medium transition-colors"
                    >
                      목업 데이터 채우기
                    </Button>
                  </div>
                </div>
                {securitySummary && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md font-medium">
                      높음: {securitySummary.high}
                    </span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md font-medium">
                      중간: {securitySummary.medium}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">
                      총: {securitySummary.total}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {securityAlerts.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-gray-600">의심스러운 활동이 감지되지 않았습니다.</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Button
                      onClick={loadSecurityAlerts}
                      className="min-h-[40px] px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                    >
                      다시 확인
                    </Button>
                    <Button
                      onClick={loadSecurityMockAlerts}
                      className="min-h-[40px] px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md text-sm font-medium transition-colors"
                    >
                      목업 데이터 채우기
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityAlerts.map((alert, index) => {
                    const severityColors = {
                      HIGH: 'bg-red-50 border-red-200',
                      MEDIUM: 'bg-yellow-50 border-yellow-200',
                      LOW: 'bg-gray-50 border-gray-200'
                    };
                    const severityBadgeColors = {
                      HIGH: 'bg-red-100 text-red-700 border-red-300',
                      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                      LOW: 'bg-gray-100 text-gray-700 border-gray-300'
                    };
                    const typeLabels: { [key: string]: string } = {
                      'MULTIPLE_ACCOUNTS_FROM_SAME_IP': '같은 IP에서 다중 계정 시도',
                      'RAPID_FAILURES_BY_IP': 'IP 기반 반복 실패',
                      'RAPID_FAILURES_BY_USER': '사용자 기반 반복 실패',
                      'SUSPICIOUS_USER_AGENT': '의심스러운 User-Agent',
                      'BOT_PATTERN_SMS_AND_LOGIN': '봇 패턴 (SMS + 로그인)'
                    };
                    
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${severityColors[alert.severity as keyof typeof severityColors] || 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className={severityBadgeColors[alert.severity as keyof typeof severityBadgeColors] || 'bg-gray-100 text-gray-700'}>
                                {alert.severity === 'HIGH' ? '🔴 높음' : alert.severity === 'MEDIUM' ? '🟡 중간' : '⚪ 낮음'}
                              </Badge>
                              <span className="text-sm font-medium text-gray-700">
                                {typeLabels[alert.type] || alert.type}
                              </span>
                              {(alert.mock || securityMockActive) && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                                  Mock
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mb-2">{alert.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                              {alert.ip && (
                                <span>IP: <span className="font-mono">{alert.ip}</span></span>
                              )}
                              {alert.userId && (
                                <span>사용자 ID: {alert.userId}</span>
                              )}
                              {alert.uniqueUserCount && (
                                <span>다른 계정 수: {alert.uniqueUserCount}개</span>
                              )}
                              {alert.failureCount && (
                                <span>실패 횟수: {alert.failureCount}회</span>
                              )}
                              {alert.occurrenceCount && (
                                <span>발생 횟수: {alert.occurrenceCount}회</span>
                              )}
                              {alert.lastAttempt && (
                                <span>마지막 시도: {new Date(alert.lastAttempt).toLocaleString('ko-KR')}</span>
                              )}
                              {alert.lastSeen && (
                                <span>마지막 발견: {new Date(alert.lastSeen).toLocaleString('ko-KR')}</span>
                              )}
                            </div>
                            {alert.userAgent && (
                              <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">User-Agent:</p>
                                <p className="text-xs font-mono text-gray-700 break-all">{alert.userAgent}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
