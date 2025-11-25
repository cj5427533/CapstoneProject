import React, { useState } from 'react';
import { mockShops } from '../../data/mockData';

interface MockShopSelectorProps {
  onShopSelect: (shopId: string) => void;
  selectedShopId?: string;
}

export const MockShopSelector: React.FC<MockShopSelectorProps> = ({
  onShopSelect,
  selectedShopId
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedShop = selectedShopId ? mockShops.find(shop => shop.id === selectedShopId) : null;

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return '✅';
      case 'MEDIUM':
        return '⚠️';
      case 'HIGH':
        return '🚨';
      default:
        return '❓';
    }
  };

  return (
    <div className="mock-shop-selector mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          목업 쇼핑몰 선택
        </h3>
        
        {/* 현재 선택된 쇼핑몰 */}
        {selectedShop && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">현재 선택된 쇼핑몰:</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedShop.name}</p>
                <p className="text-sm text-gray-600">{selectedShop.url}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded border ${getRiskLevelColor(selectedShop.riskLevel)}`}>
                  {getRiskLevelIcon(selectedShop.riskLevel)} {selectedShop.riskLevel}
                </span>
                <span className="text-sm text-gray-500">
                  리스크 점수: {selectedShop.riskScore}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 쇼핑몰 선택 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {selectedShop ? `${selectedShop.name} (${selectedShop.riskLevel})` : '쇼핑몰을 선택하세요'}
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {isOpen ? '▲' : '▼'}
            </span>
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {mockShops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => {
                    onShopSelect(shop.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    selectedShopId === shop.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{shop.name}</p>
                      <p className="text-sm text-gray-600">{shop.url}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded border ${getRiskLevelColor(shop.riskLevel)}`}>
                        {getRiskLevelIcon(shop.riskLevel)} {shop.riskLevel}
                      </span>
                      <span className="text-sm text-gray-500">
                        {shop.riskScore}/100
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 설명 */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            💡 <strong>학습 가이드:</strong>
          </p>
          <ul className="text-blue-700 text-xs mt-1 space-y-1">
            <li>• <strong>LOW (안전):</strong> 정상적인 리뷰 패턴과 적은 신고 수</li>
            <li>• <strong>MEDIUM (주의):</strong> 일부 의심스러운 패턴과 중간 수준의 신고</li>
            <li>• <strong>HIGH (주의):</strong> 명백한 페이크 리뷰와 주의한 신고 다수</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

