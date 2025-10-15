import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminStats,
  getAdminShops,
  updateShopName,
  deleteShop,
  getAdminReports,
  deleteReport,
  getAdminRatings,
  deleteRating,
  getAdminUsers,
  mergeShops
} from '../utils/api';

interface AdminStats {
  totalShops: number;
  totalReports: number;
  totalRatings: number;
  totalUsers: number;
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
  shops: {
    id: number;
    url: string;
    name: string | null;
  };
}

interface RatingData {
  id: number;
  shop_id: number;
  rating: number;
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
  created_at: string;
}

export function AdminPage() {
  const navigate = useNavigate();
  
  // localhost 체크 (즉시 실행)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  
  console.log('AdminPage - hostname:', hostname);
  console.log('AdminPage - isLocalhost:', isLocalhost);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [currentTab, setCurrentTab] = useState<'stats' | 'shops' | 'reports' | 'ratings' | 'users'>('stats');
  
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
  const [editingShopId, setEditingShopId] = useState<number | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [mergingShopId, setMergingShopId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // localhost가 아닌 경우 처리
  useEffect(() => {
    if (!isLocalhost) {
      alert('관리자 페이지는 localhost에서만 접속할 수 있습니다.');
      const timer = setTimeout(() => {
        navigate('/');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLocalhost, navigate]);

  // 관리자 인증 체크
  useEffect(() => {
    if (!isLocalhost) return;
    
    const adminAuth = localStorage.getItem('admin_authenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, [isLocalhost]);

  // 관리자 통계 로드
  const loadAdminStats = async () => {
    try {
      const statsData = await getAdminStats();
      setStats(statsData);
    } catch (error) {
      console.error('관리자 통계 로드 실패:', error);
    }
  };

  // 쇼핑몰 데이터 로드
  const loadShops = async () => {
    try {
      const shopsData = await getAdminShops();
      setShops(shopsData);
    } catch (error) {
      console.error('쇼핑몰 조회 실패:', error);
    }
  };

  // 신고 데이터 로드
  const loadReports = async () => {
    try {
      const reportsData = await getAdminReports();
      setReports(reportsData);
    } catch (error) {
      console.error('신고 조회 실패:', error);
    }
  };

  // 평점 데이터 로드
  const loadRatings = async () => {
    try {
      const ratingsData = await getAdminRatings();
      setRatings(ratingsData);
    } catch (error) {
      console.error('평점 조회 실패:', error);
    }
  };

  // 사용자 데이터 로드
  const loadUsers = async () => {
    try {
      const usersData = await getAdminUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('사용자 조회 실패:', error);
    }
  };

  // 탭 변경
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadTabData = async () => {
      if (currentTab === 'shops') await loadShops();
      else if (currentTab === 'reports') await loadReports();
      else if (currentTab === 'ratings') await loadRatings();
      else if (currentTab === 'users') await loadUsers();
      else if (currentTab === 'stats') await loadAdminStats();
    };
    
    loadTabData();
  }, [currentTab, isAuthenticated]);

  // 관리자 로그인 처리
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === 'admin123') {
      localStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
    } else {
      alert('관리자 키가 올바르지 않습니다.');
    }
  };

  // 관리자 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    window.location.href = '/';
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
    if (!confirm(`'${shopName}' 쇼핑몰을 삭제하시겠습니까?\n연관된 신고와 평점도 모두 삭제됩니다.`)) {
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

  // 신고 삭제
  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('이 신고를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteReport(reportId);
      alert('신고가 삭제되었습니다.');
      loadReports();
      loadAdminStats();
    } catch (error) {
      alert('신고 삭제에 실패했습니다.');
    }
  };

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
      `✅ 양방향 병합: 두 쇼핑몰의 모든 데이터(신고, 평점)가 통합됩니다.\n` +
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

  // localhost가 아닌 경우 접근 차단
  if (!isLocalhost) {
    return (
      <div className="admin-auth-page">
        <div className="admin-login-container">
          <h1>⚠️ 접근 제한</h1>
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            관리자 페이지는 localhost에서만 접속할 수 있습니다.
          </p>
          <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#666' }}>
            홈페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 폼 표시
  if (!isAuthenticated) {
    return (
      <div className="admin-auth-page">
        <div className="admin-login-container">
          <h1>관리자 인증</h1>
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label htmlFor="adminKey">관리자 키</label>
              <input
                type="password"
                id="adminKey"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="관리자 키를 입력하세요"
                required
                className="form-input"
              />
            </div>
            <button type="submit" className="login-button">
              관리자 로그인
            </button>
          </form>
          <p className="redirect-notice">
            관리자 키: admin123
          </p>
        </div>
      </div>
    );
  }

  // 관리자 대시보드
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>🔧 관리자 페이지</h1>
        <button onClick={handleLogout} className="logout-button">
          로그아웃
        </button>
      </div>
      
      <div className="admin-tabs">
        <button 
          className={`tab-button ${currentTab === 'stats' ? 'active' : ''}`}
          onClick={() => setCurrentTab('stats')}
        >
          📊 통계
        </button>
        <button 
          className={`tab-button ${currentTab === 'shops' ? 'active' : ''}`}
          onClick={() => setCurrentTab('shops')}
        >
          🏪 쇼핑몰 관리
        </button>
        <button 
          className={`tab-button ${currentTab === 'reports' ? 'active' : ''}`}
          onClick={() => setCurrentTab('reports')}
        >
          ⚠️ 신고 관리
        </button>
        <button 
          className={`tab-button ${currentTab === 'ratings' ? 'active' : ''}`}
          onClick={() => setCurrentTab('ratings')}
        >
          ⭐ 평점 관리
        </button>
        <button 
          className={`tab-button ${currentTab === 'users' ? 'active' : ''}`}
          onClick={() => setCurrentTab('users')}
        >
          👥 사용자 관리
        </button>
      </div>

      <div className="admin-content">
        {/* 통계 탭 */}
        {currentTab === 'stats' && (
          <div className="admin-section">
            <h2>📊 시스템 통계</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>총 쇼핑몰 수</h3>
                <span className="stat-number">{stats.totalShops}</span>
              </div>
              <div className="stat-card">
                <h3>총 신고 수</h3>
                <span className="stat-number">{stats.totalReports}</span>
              </div>
              <div className="stat-card">
                <h3>총 평점 수</h3>
                <span className="stat-number">{stats.totalRatings}</span>
              </div>
              <div className="stat-card">
                <h3>총 사용자 수</h3>
                <span className="stat-number">{stats.totalUsers}</span>
              </div>
            </div>
          </div>
        )}

        {/* 쇼핑몰 관리 탭 */}
        {currentTab === 'shops' && (
          <div className="admin-section">
            <h2>🏪 쇼핑몰 관리 ({shops.length}개)</h2>
            <div className="data-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>URL</th>
                    <th>이름</th>
                    <th>부모 쇼핑몰</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop.id} style={{ backgroundColor: shop.parent_shop_id ? '#fff9e6' : 'transparent' }}>
                      <td>{shop.id}</td>
                      <td className="url-cell">
                        <a href={`/search?url=${encodeURIComponent(shop.url)}`} target="_blank" rel="noopener noreferrer">
                          {shop.url}
                        </a>
                      </td>
                      <td>
                        {editingShopId === shop.id ? (
                          <input
                            type="text"
                            value={editingShopName}
                            onChange={(e) => setEditingShopName(e.target.value)}
                            className="edit-input"
                            autoFocus
                          />
                        ) : (
                          shop.name || '(이름 없음)'
                        )}
                      </td>
                      <td>
                        {shop.parent_shop_id ? (
                          <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>
                            → #{shop.parent_shop_id} 에 병합됨
                          </span>
                        ) : (
                          <span style={{ color: '#888' }}>-</span>
                        )}
                      </td>
                      <td>{new Date(shop.created_at).toLocaleString('ko-KR')}</td>
                      <td>
                        {editingShopId === shop.id ? (
                          <>
                            <button 
                              onClick={() => handleUpdateShopName(shop.id)}
                              className="action-btn save"
                            >
                              저장
                            </button>
                            <button 
                              onClick={() => {
                                setEditingShopId(null);
                                setEditingShopName('');
                              }}
                              className="action-btn cancel"
                            >
                              취소
                            </button>
                          </>
                        ) : mergingShopId === shop.id ? (
                          <div className="merge-input-group">
                            <input
                              type="number"
                              value={mergeTargetId}
                              onChange={(e) => setMergeTargetId(e.target.value)}
                              placeholder="대상 ID"
                              className="merge-input"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleMergeShops(shop.id)}
                              className="action-btn save"
                            >
                              병합
                            </button>
                            <button 
                              onClick={() => {
                                setMergingShopId(null);
                                setMergeTargetId('');
                              }}
                              className="action-btn cancel"
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
                              className="action-btn edit"
                            >
                              수정
                            </button>
                            <button 
                              onClick={() => {
                                setMergingShopId(shop.id);
                                setMergeTargetId('');
                              }}
                              className="action-btn merge"
                            >
                              병합
                            </button>
                            <button 
                              onClick={() => handleDeleteShop(shop.id, shop.name || shop.url)}
                              className="action-btn delete"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 신고 관리 탭 */}
        {currentTab === 'reports' && (
          <div className="admin-section">
            <h2>⚠️ 신고 관리 ({reports.length}개)</h2>
            <div className="data-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>쇼핑몰</th>
                    <th>카테고리</th>
                    <th>설명</th>
                    <th>신고자</th>
                    <th>신고일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.id}</td>
                      <td className="shop-cell">{report.shops?.name || report.shops?.url}</td>
                      <td>{JSON.parse(report.categories).join(', ')}</td>
                      <td className="desc-cell">{report.description}</td>
                      <td>{report.reporter_name || '익명'}</td>
                      <td>{new Date(report.created_at).toLocaleString('ko-KR')}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteReport(report.id)}
                          className="action-btn delete"
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
        )}

        {/* 평점 관리 탭 */}
        {currentTab === 'ratings' && (
          <div className="admin-section">
            <h2>⭐ 평점 관리 ({ratings.length}개)</h2>
            <div className="data-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>쇼핑몰</th>
                    <th>평점</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((rating) => (
                    <tr key={rating.id}>
                      <td>{rating.id}</td>
                      <td className="shop-cell">{rating.shops?.name || rating.shops?.url}</td>
                      <td>
                        <span className="rating-stars">
                          {'⭐'.repeat(rating.rating)}
                        </span>
                        {rating.rating}점
                      </td>
                      <td>{new Date(rating.created_at).toLocaleString('ko-KR')}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteRating(rating.id)}
                          className="action-btn delete"
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
        )}

        {/* 사용자 관리 탭 */}
        {currentTab === 'users' && (
          <div className="admin-section">
            <h2>👥 사용자 관리 ({users.length}명)</h2>
            <div className="data-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>사용자명</th>
                    <th>이메일</th>
                    <th>전화번호</th>
                    <th>가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.phone_number}</td>
                      <td>{new Date(user.created_at).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
