/**
 * Phase 8.3: Dashboard REST API Routes
 */

import { dashboard } from '../../dashboard/dashboard';

export const dashboardRoutes = {
  /**
   * GET /api/dashboard/stats
   * 전체 통계
   */
  getStats: () => {
    return dashboard.getStats();
  },

  /**
   * GET /api/dashboard/trends
   * 신뢰도 트렌드 (최근 7일)
   */
  getTrends: (days?: number) => {
    return dashboard.getTrends(days || 7);
  },

  /**
   * GET /api/dashboard/feedback-summary
   * 피드백 요약
   */
  getFeedbackSummary: (patternId?: string) => {
    return dashboard.getFeedbackSummary(patternId);
  },

  /**
   * GET /api/dashboard/pattern/:id
   * 패턴별 상세 정보
   */
  getPatternDetails: (patternId: string) => {
    return dashboard.getPatternDetails(patternId);
  },

  /**
   * GET /api/dashboard/learning-progress
   * 학습 진행률
   */
  getLearningProgress: () => {
    return dashboard.getLearningProgress();
  },

  /**
   * GET /api/dashboard/export/json
   * JSON 형식 내보내기
   */
  exportJSON: () => {
    return dashboard.exportToJSON();
  },

  /**
   * GET /api/dashboard/export/csv
   * CSV 형식 내보내기 (트렌드)
   */
  exportCSV: () => {
    return dashboard.exportTrendsToCSV();
  },
};
