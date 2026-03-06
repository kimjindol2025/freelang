/**
 * FreeLang v2 - scikit-learn 호환 함수
 *
 * Phase 1: Preprocessing (6개)
 * - StandardScaler: fit, transform, fit_transform
 * - MinMaxScaler: fit, transform
 * - train_test_split
 *
 * Phase 2: Linear Models (5개)
 * - Linear Regression: fit, predict
 * - Logistic Regression: fit, predict, predict_proba
 *
 * Phase 3: KMeans Clustering (4개 함수)
 * Phase 4: K-Nearest Neighbors (4개 함수)
 *
 * 총 19개 함수
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * 확장 ML 함수 등록
 */
export function registerSklearnFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // Phase 1: Preprocessing 함수 (6개)
  // ════════════════════════════════════════════════════════════════

  /**
   * StandardScaler - fit
   * 표준화를 위한 mean과 std 계산
   * 입력: X (2D 배열 - n_samples x n_features)
   * 출력: {mean: Array, std: Array}
   */
  registry.register({
    name: 'sklearn_scaler_fit',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      if (!X || X.length === 0) {
        throw new Error('sklearn_scaler_fit: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;
      const mean: number[] = new Array(n_features).fill(0);
      const std: number[] = new Array(n_features).fill(0);

      // 각 특성별 평균 계산
      for (let j = 0; j < n_features; j++) {
        let sum = 0;
        for (let i = 0; i < n_samples; i++) {
          sum += X[i][j];
        }
        mean[j] = sum / n_samples;
      }

      // 각 특성별 표준편차 계산
      for (let j = 0; j < n_features; j++) {
        let variance = 0;
        for (let i = 0; i < n_samples; i++) {
          variance += Math.pow(X[i][j] - mean[j], 2);
        }
        std[j] = Math.sqrt(variance / n_samples);
      }

      return { mean, std };
    }
  });

  /**
   * StandardScaler - transform
   * mean과 std를 사용하여 데이터 표준화
   * 입력: X (2D 배열), params ({mean, std})
   * 출력: X_scaled (2D 배열)
   */
  registry.register({
    name: 'sklearn_scaler_transform',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const params = args[1] as any;
      const { mean, std } = params;

      if (!X || X.length === 0) {
        throw new Error('sklearn_scaler_transform: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;
      const X_scaled: number[][] = [];

      for (let i = 0; i < n_samples; i++) {
        X_scaled[i] = [];
        for (let j = 0; j < n_features; j++) {
          const stdVal = std[j] === 0 ? 1 : std[j]; // 0 나누기 방지
          X_scaled[i][j] = (X[i][j] - mean[j]) / stdVal;
        }
      }

      return X_scaled;
    }
  });

  /**
   * StandardScaler - fit_transform
   * fit과 transform을 한 번에 수행
   * 입력: X (2D 배열)
   * 출력: {X_scaled, scaler} (X_scaled: 2D 배열, scaler: {mean, std})
   */
  registry.register({
    name: 'sklearn_scaler_fit_transform',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];

      if (!X || X.length === 0) {
        throw new Error('sklearn_scaler_fit_transform: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;
      const mean: number[] = new Array(n_features).fill(0);
      const std: number[] = new Array(n_features).fill(0);

      // fit: mean 계산
      for (let j = 0; j < n_features; j++) {
        let sum = 0;
        for (let i = 0; i < n_samples; i++) {
          sum += X[i][j];
        }
        mean[j] = sum / n_samples;
      }

      // fit: std 계산
      for (let j = 0; j < n_features; j++) {
        let variance = 0;
        for (let i = 0; i < n_samples; i++) {
          variance += Math.pow(X[i][j] - mean[j], 2);
        }
        std[j] = Math.sqrt(variance / n_samples);
      }

      // transform: 데이터 표준화
      const X_scaled: number[][] = [];
      for (let i = 0; i < n_samples; i++) {
        X_scaled[i] = [];
        for (let j = 0; j < n_features; j++) {
          const stdVal = std[j] === 0 ? 1 : std[j];
          X_scaled[i][j] = (X[i][j] - mean[j]) / stdVal;
        }
      }

      return {
        X_scaled,
        scaler: { mean, std }
      };
    }
  });

  /**
   * MinMaxScaler - fit
   * 정규화를 위한 min과 max 계산
   * 입력: X (2D 배열)
   * 출력: {min: Array, max: Array}
   */
  registry.register({
    name: 'sklearn_minmax_fit',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      if (!X || X.length === 0) {
        throw new Error('sklearn_minmax_fit: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_features = X[0].length;
      const min: number[] = new Array(n_features).fill(Infinity);
      const max: number[] = new Array(n_features).fill(-Infinity);

      // 각 특성별 min/max 계산
      for (const row of X) {
        for (let j = 0; j < n_features; j++) {
          min[j] = Math.min(min[j], row[j]);
          max[j] = Math.max(max[j], row[j]);
        }
      }

      return { min, max };
    }
  });

  /**
   * MinMaxScaler - transform
   * min과 max를 사용하여 데이터 정규화 (0-1 범위)
   * 입력: X (2D 배열), params ({min, max})
   * 출력: X_normalized (2D 배열)
   */
  registry.register({
    name: 'sklearn_minmax_transform',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const params = args[1] as any;
      const { min, max } = params;

      if (!X || X.length === 0) {
        throw new Error('sklearn_minmax_transform: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;
      const X_normalized: number[][] = [];

      for (let i = 0; i < n_samples; i++) {
        X_normalized[i] = [];
        for (let j = 0; j < n_features; j++) {
          const range = max[j] - min[j];
          const rangeVal = range === 0 ? 1 : range; // 0 나누기 방지
          X_normalized[i][j] = (X[i][j] - min[j]) / rangeVal;
        }
      }

      return X_normalized;
    }
  });

  /**
   * train_test_split
   * 데이터를 학습/테스트 세트로 분할
   * 입력: X (2D 배열), y (1D 배열), test_size (float, 기본 0.2), random_seed (int, 선택)
   * 출력: {X_train, X_test, y_train, y_test}
   */
  registry.register({
    name: 'sklearn_train_test_split',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const y = args[1] as number[];
      const test_size = args[2] !== undefined ? args[2] : 0.2;
      const random_seed = args[3];

      if (!X || !y || X.length === 0 || y.length === 0 || X.length !== y.length) {
        throw new Error('sklearn_train_test_split: X와 y의 길이가 일치하지 않습니다');
      }

      const n_samples = X.length;
      const n_test = Math.floor(n_samples * test_size);
      const n_train = n_samples - n_test;

      // 인덱스 배열 생성 및 무작위 섞기
      const indices = Array.from({ length: n_samples }, (_, i) => i);

      // Simple shuffle (Knuth shuffle with or without seed)
      if (random_seed !== undefined) {
        // Seeded random을 위한 간단한 구현
        let seed = random_seed;
        for (let i = n_samples - 1; i > 0; i--) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const j = Math.floor((seed / 0x7fffffff) * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
      } else {
        // 표준 Math.random() 사용
        for (let i = n_samples - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
      }

      // 분할
      const train_indices = indices.slice(0, n_train);
      const test_indices = indices.slice(n_train);

      const X_train: number[][] = [];
      const X_test: number[][] = [];
      const y_train: number[] = [];
      const y_test: number[] = [];

      for (const idx of train_indices) {
        X_train.push(X[idx]);
        y_train.push(y[idx]);
      }

      for (const idx of test_indices) {
        X_test.push(X[idx]);
        y_test.push(y[idx]);
      }

      return { X_train, X_test, y_train, y_test };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 2: Linear Models (5개)
  // ════════════════════════════════════════════════════════════════

  /**
   * Linear Regression - fit
   * 정규 방정식을 사용한 선형 회귀 학습
   * θ = (X^T X)^-1 X^T y
   * 입력: X (2D 배열), y (1D 배열)
   * 출력: {coef: Array, intercept: number}
   */
  registry.register({
    name: 'sklearn_linear_fit',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const y = args[1] as number[];

      if (!X || !y || X.length === 0 || y.length === 0 || X.length !== y.length) {
        throw new Error('sklearn_linear_fit: X와 y의 길이가 일치하지 않습니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;

      // 절편항(bias)을 위해 X에 1을 추가 (augmented matrix)
      const X_aug: number[][] = [];
      for (let i = 0; i < n_samples; i++) {
        X_aug[i] = [1, ...X[i]];
      }

      // X_aug^T 계산
      const X_aug_T: number[][] = [];
      for (let j = 0; j < n_features + 1; j++) {
        X_aug_T[j] = [];
        for (let i = 0; i < n_samples; i++) {
          X_aug_T[j][i] = X_aug[i][j];
        }
      }

      // X_aug^T @ X_aug 계산
      const XTX: number[][] = [];
      for (let i = 0; i < n_features + 1; i++) {
        XTX[i] = [];
        for (let j = 0; j < n_features + 1; j++) {
          let sum = 0;
          for (let k = 0; k < n_samples; k++) {
            sum += X_aug_T[i][k] * X_aug[k][j];
          }
          XTX[i][j] = sum;
        }
      }

      // X_aug^T @ y 계산
      const XTy: number[] = [];
      for (let i = 0; i < n_features + 1; i++) {
        let sum = 0;
        for (let k = 0; k < n_samples; k++) {
          sum += X_aug_T[i][k] * y[k];
        }
        XTy[i] = sum;
      }

      // (X_aug^T @ X_aug)^-1 계산 (Gauss-Jordan elimination)
      const n = n_features + 1;
      const aug: number[][] = [];
      for (let i = 0; i < n; i++) {
        aug[i] = [...XTX[i], ...new Array(n).fill(0)];
        aug[i][n + i] = 1;
      }

      for (let i = 0; i < n; i++) {
        let pivot = i;
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
        }
        [aug[i], aug[pivot]] = [aug[pivot], aug[i]];

        const factor = aug[i][i];
        if (Math.abs(factor) < 1e-10) {
          throw new Error('sklearn_linear_fit: 행렬이 특이(singular)합니다');
        }

        for (let j = 0; j < 2 * n; j++) aug[i][j] /= factor;

        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const f = aug[j][i];
            for (let k = 0; k < 2 * n; k++) aug[j][k] -= f * aug[i][k];
          }
        }
      }

      const XTX_inv: number[][] = [];
      for (let i = 0; i < n; i++) {
        XTX_inv[i] = aug[i].slice(n);
      }

      // θ = (X_aug^T @ X_aug)^-1 @ X_aug^T @ y
      const theta: number[] = [];
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += XTX_inv[i][j] * XTy[j];
        }
        theta[i] = sum;
      }

      const intercept = theta[0];
      const coef = theta.slice(1);

      return { coef, intercept };
    }
  });

  /**
   * Linear Regression - predict
   * 학습된 모델로 예측
   * 입력: X (2D 배열), model ({coef, intercept})
   * 출력: y_pred (1D 배열)
   */
  registry.register({
    name: 'sklearn_linear_predict',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const model = args[1] as any;
      const { coef, intercept } = model;

      if (!X || X.length === 0) {
        throw new Error('sklearn_linear_predict: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;

      if (coef.length !== n_features) {
        throw new Error('sklearn_linear_predict: 특성 개수가 일치하지 않습니다');
      }

      const y_pred: number[] = [];
      for (let i = 0; i < n_samples; i++) {
        let pred = intercept;
        for (let j = 0; j < n_features; j++) {
          pred += X[i][j] * coef[j];
        }
        y_pred.push(pred);
      }

      return y_pred;
    }
  });

  /**
   * Logistic Regression - fit
   * 경사하강법을 사용한 로지스틱 회귀 학습
   * sigmoid(x) = 1 / (1 + e^-x)
   * 손실함수: binary cross-entropy
   * 입력: X (2D 배열), y (1D 배열), learning_rate (float, 기본 0.01), epochs (int, 기본 100)
   * 출력: {coef: Array, intercept: number, loss_history: Array}
   */
  registry.register({
    name: 'sklearn_logistic_fit',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const y = args[1] as number[];
      const learning_rate = args[2] !== undefined ? args[2] : 0.01;
      const epochs = args[3] !== undefined ? args[3] : 100;

      if (!X || !y || X.length === 0 || y.length === 0 || X.length !== y.length) {
        throw new Error('sklearn_logistic_fit: X와 y의 길이가 일치하지 않습니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;

      // 절편항 추가 (augmented)
      const X_aug: number[][] = [];
      for (let i = 0; i < n_samples; i++) {
        X_aug[i] = [1, ...X[i]];
      }

      // 가중치 초기화
      let theta: number[] = new Array(n_features + 1).fill(0);

      // sigmoid 함수
      const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

      // 경사하강법
      const loss_history: number[] = [];

      for (let epoch = 0; epoch < epochs; epoch++) {
        // 예측값 계산
        const predictions: number[] = [];
        for (let i = 0; i < n_samples; i++) {
          let z = 0;
          for (let j = 0; j < n_features + 1; j++) {
            z += X_aug[i][j] * theta[j];
          }
          predictions.push(sigmoid(z));
        }

        // 손실 계산 (binary cross-entropy)
        let loss = 0;
        for (let i = 0; i < n_samples; i++) {
          const pred = predictions[i];
          const eps = 1e-15; // numerical stability
          const safePred = Math.max(eps, Math.min(1 - eps, pred));
          loss -= y[i] * Math.log(safePred) + (1 - y[i]) * Math.log(1 - safePred);
        }
        loss /= n_samples;
        loss_history.push(loss);

        // 그래디언트 계산 및 가중치 업데이트
        const gradients: number[] = new Array(n_features + 1).fill(0);
        for (let i = 0; i < n_samples; i++) {
          const error = predictions[i] - y[i];
          for (let j = 0; j < n_features + 1; j++) {
            gradients[j] += error * X_aug[i][j];
          }
        }

        // 가중치 업데이트
        for (let j = 0; j < n_features + 1; j++) {
          theta[j] -= learning_rate * (gradients[j] / n_samples);
        }
      }

      const intercept = theta[0];
      const coef = theta.slice(1);

      return { coef, intercept, loss_history };
    }
  });

  /**
   * Logistic Regression - predict
   * 이진 분류 예측 (0 또는 1)
   * 입력: X (2D 배열), model ({coef, intercept})
   * 출력: y_pred (1D 배열, 0 또는 1)
   */
  registry.register({
    name: 'sklearn_logistic_predict',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const model = args[1] as any;
      const { coef, intercept } = model;

      if (!X || X.length === 0) {
        throw new Error('sklearn_logistic_predict: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;

      if (coef.length !== n_features) {
        throw new Error('sklearn_logistic_predict: 특성 개수가 일치하지 않습니다');
      }

      const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
      const threshold = 0.5;

      const y_pred: number[] = [];
      for (let i = 0; i < n_samples; i++) {
        let z = intercept;
        for (let j = 0; j < n_features; j++) {
          z += X[i][j] * coef[j];
        }
        const prob = sigmoid(z);
        y_pred.push(prob >= threshold ? 1 : 0);
      }

      return y_pred;
    }
  });

  /**
   * Logistic Regression - predict_proba
   * 확률 예측 (0~1)
   * 입력: X (2D 배열), model ({coef, intercept})
   * 출력: probabilities (1D 배열, 0~1 범위)
   */
  registry.register({
    name: 'sklearn_logistic_predict_proba',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as number[][];
      const model = args[1] as any;
      const { coef, intercept } = model;

      if (!X || X.length === 0) {
        throw new Error('sklearn_logistic_predict_proba: X는 비어있지 않은 배열이어야 합니다');
      }

      const n_samples = X.length;
      const n_features = X[0].length;

      if (coef.length !== n_features) {
        throw new Error('sklearn_logistic_predict_proba: 특성 개수가 일치하지 않습니다');
      }

      const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

      const probabilities: number[] = [];
      for (let i = 0; i < n_samples; i++) {
        let z = intercept;
        for (let j = 0; j < n_features; j++) {
          z += X[i][j] * coef[j];
        }
        const prob = sigmoid(z);
        probabilities.push(prob);
      }

      return probabilities;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 3: KMeans Clustering (4개 함수)
  // ════════════════════════════════════════════════════════════════

  /**
   * 유클리드 거리 계산 헬퍼
   * @param p1 첫 번째 점 (Array)
   * @param p2 두 번째 점 (Array)
   * @returns 거리값 (number)
   */
  const euclidean_distance = (p1: any[], p2: any[]): number => {
    let sum = 0;
    for (let i = 0; i < p1.length; i++) {
      const diff = (p1[i] as number) - (p2[i] as number);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  };

  /**
   * 배열의 합 계산 헬퍼
   */
  const sum_array = (arr: any[]): number => {
    return arr.reduce((acc: number, val: any) => acc + (val as number), 0);
  };

  /**
   * sklearn_kmeans_fit
   * K-Means 클러스터링 학습
   *
   * @param X 입력 데이터 (2D Array: Array<Array<number>>)
   * @param n_clusters 클러스터 개수 (number)
   * @param max_iter 최대 반복 횟수 (number, 기본값: 300)
   * @param random_seed 난수 시드 (number, 선택사항)
   * @returns 모델 객체 {centers, labels, inertia}
   */
  registry.register({
    name: 'sklearn_kmeans_fit',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as any[]; // Array<Array<number>>
      const n_clusters = args[1] as number;
      const max_iter = args[2] as number || 300;
      const random_seed = args[3] as number;

      // 데이터 유효성 검사
      if (!Array.isArray(X) || X.length === 0) {
        throw new Error('sklearn_kmeans_fit: X must be non-empty array');
      }
      if (n_clusters <= 0 || n_clusters > X.length) {
        throw new Error(
          `sklearn_kmeans_fit: n_clusters must be between 1 and ${X.length}`
        );
      }

      const n_samples = X.length;
      const n_features = (X[0] as any[]).length;

      // 1️⃣ 초기 중심점 설정 (K-Means++ 방식 선택)
      const centers: any[] = [];
      const rng = random_seed !== undefined ? random_seed : Date.now();
      let seed = rng;

      // 첫 번째 중심점: 무작위 선택
      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const first_idx = Math.floor(pseudoRandom() * n_samples);
      centers.push([...(X[first_idx] as any[])] as any[]);

      // K-Means++ 방식으로 나머지 중심점 선택
      for (let k = 1; k < n_clusters; k++) {
        let max_dist = -Infinity;
        let farthest_idx = 0;

        for (let i = 0; i < n_samples; i++) {
          let min_dist_to_center = Infinity;

          for (let c = 0; c < centers.length; c++) {
            const dist = euclidean_distance(X[i] as any[], centers[c] as any[]);
            if (dist < min_dist_to_center) {
              min_dist_to_center = dist;
            }
          }

          if (min_dist_to_center > max_dist) {
            max_dist = min_dist_to_center;
            farthest_idx = i;
          }
        }

        centers.push([...(X[farthest_idx] as any[])] as any[]);
      }

      let labels = new Array(n_samples).fill(0);
      let prev_inertia = Infinity;

      // 2️⃣ Lloyd's 알고리즘 반복
      for (let iteration = 0; iteration < max_iter; iteration++) {
        // 각 점을 최근접 중심에 할당
        for (let i = 0; i < n_samples; i++) {
          let min_dist = Infinity;
          let nearest_cluster = 0;

          for (let c = 0; c < n_clusters; c++) {
            const dist = euclidean_distance(X[i] as any[], centers[c] as any[]);
            if (dist < min_dist) {
              min_dist = dist;
              nearest_cluster = c;
            }
          }

          labels[i] = nearest_cluster;
        }

        // 3️⃣ 중심점 재계산
        const new_centers: any[] = [];
        for (let c = 0; c < n_clusters; c++) {
          const cluster_points: any[] = [];

          for (let i = 0; i < n_samples; i++) {
            if (labels[i] === c) {
              cluster_points.push(X[i] as any[]);
            }
          }

          // 클러스터가 비어있으면 이전 중심 유지
          if (cluster_points.length === 0) {
            new_centers.push([...(centers[c] as any[])] as any[]);
          } else {
            // 클러스터의 평균 계산
            const new_center = [];
            for (let f = 0; f < n_features; f++) {
              let sum = 0;
              for (let p = 0; p < cluster_points.length; p++) {
                sum += cluster_points[p][f] as number;
              }
              new_center.push(sum / cluster_points.length);
            }
            new_centers.push(new_center);
          }
        }

        // 수렴 여부 확인 (inertia 계산)
        let inertia = 0;
        for (let i = 0; i < n_samples; i++) {
          const dist = euclidean_distance(
            X[i] as any[],
            new_centers[labels[i]] as any[]
          );
          inertia += dist * dist;
        }

        if (Math.abs(prev_inertia - inertia) < 1e-6) {
          // 수렴
          break;
        }

        prev_inertia = inertia;
        for (let c = 0; c < n_clusters; c++) {
          centers[c] = [...(new_centers[c] as any[])] as any[];
        }
      }

      // 최종 inertia 계산
      let final_inertia = 0;
      for (let i = 0; i < n_samples; i++) {
        const dist = euclidean_distance(
          X[i] as any[],
          centers[labels[i]] as any[]
        );
        final_inertia += dist * dist;
      }

      return {
        centers: centers,
        labels: labels,
        inertia: final_inertia,
        n_clusters: n_clusters,
        n_features: n_features
      };
    }
  });

  /**
   * sklearn_kmeans_predict
   * 학습된 KMeans 모델로 새 데이터 예측
   *
   * @param X 예측할 데이터 (2D Array)
   * @param model 학습된 모델 (fit의 반환값)
   * @returns 예측 라벨 배열 (Array<number>)
   */
  registry.register({
    name: 'sklearn_kmeans_predict',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as any[];
      const model = args[1] as any;

      if (!model.centers) {
        throw new Error('sklearn_kmeans_predict: invalid model');
      }

      const centers = model.centers as any[];
      const predictions: number[] = [];

      for (let i = 0; i < X.length; i++) {
        let min_dist = Infinity;
        let nearest_cluster = 0;

        for (let c = 0; c < centers.length; c++) {
          const dist = euclidean_distance(X[i] as any[], centers[c] as any[]);
          if (dist < min_dist) {
            min_dist = dist;
            nearest_cluster = c;
          }
        }

        predictions.push(nearest_cluster);
      }

      return predictions;
    }
  });

  /**
   * sklearn_kmeans_fit_predict
   * 학습 + 예측을 한 번에 수행
   *
   * @param X 입력 데이터 (2D Array)
   * @param n_clusters 클러스터 개수 (number)
   * @param max_iter 최대 반복 횟수 (number, 기본값: 300)
   * @returns 예측 라벨 배열 (Array<number>)
   */
  registry.register({
    name: 'sklearn_kmeans_fit_predict',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as any[];
      const n_clusters = args[1] as number;
      const max_iter = args[2] as number || 300;
      const random_seed = args[3] as number;

      // 데이터 유효성 검사
      if (!Array.isArray(X) || X.length === 0) {
        throw new Error('sklearn_kmeans_fit_predict: X must be non-empty array');
      }
      if (n_clusters <= 0 || n_clusters > X.length) {
        throw new Error(
          `sklearn_kmeans_fit_predict: n_clusters must be between 1 and ${X.length}`
        );
      }

      const n_samples = X.length;
      const n_features = (X[0] as any[]).length;

      // 초기 중심점 설정
      const centers: any[] = [];
      const rng = random_seed !== undefined ? random_seed : Date.now();
      let seed = rng;

      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const first_idx = Math.floor(pseudoRandom() * n_samples);
      centers.push([...(X[first_idx] as any[])] as any[]);

      for (let k = 1; k < n_clusters; k++) {
        let max_dist = -Infinity;
        let farthest_idx = 0;

        for (let i = 0; i < n_samples; i++) {
          let min_dist_to_center = Infinity;

          for (let c = 0; c < centers.length; c++) {
            const dist = euclidean_distance(X[i] as any[], centers[c] as any[]);
            if (dist < min_dist_to_center) {
              min_dist_to_center = dist;
            }
          }

          if (min_dist_to_center > max_dist) {
            max_dist = min_dist_to_center;
            farthest_idx = i;
          }
        }

        centers.push([...(X[farthest_idx] as any[])] as any[]);
      }

      let labels = new Array(n_samples).fill(0);
      let prev_inertia = Infinity;

      // Lloyd's 알고리즘 반복
      for (let iteration = 0; iteration < max_iter; iteration++) {
        // 각 점을 최근접 중심에 할당
        for (let i = 0; i < n_samples; i++) {
          let min_dist = Infinity;
          let nearest_cluster = 0;

          for (let c = 0; c < n_clusters; c++) {
            const dist = euclidean_distance(X[i] as any[], centers[c] as any[]);
            if (dist < min_dist) {
              min_dist = dist;
              nearest_cluster = c;
            }
          }

          labels[i] = nearest_cluster;
        }

        // 중심점 재계산
        const new_centers: any[] = [];
        for (let c = 0; c < n_clusters; c++) {
          const cluster_points: any[] = [];

          for (let i = 0; i < n_samples; i++) {
            if (labels[i] === c) {
              cluster_points.push(X[i] as any[]);
            }
          }

          if (cluster_points.length === 0) {
            new_centers.push([...(centers[c] as any[])] as any[]);
          } else {
            const new_center = [];
            for (let f = 0; f < n_features; f++) {
              let sum = 0;
              for (let p = 0; p < cluster_points.length; p++) {
                sum += cluster_points[p][f] as number;
              }
              new_center.push(sum / cluster_points.length);
            }
            new_centers.push(new_center);
          }
        }

        // 수렴 여부 확인
        let inertia = 0;
        for (let i = 0; i < n_samples; i++) {
          const dist = euclidean_distance(
            X[i] as any[],
            new_centers[labels[i]] as any[]
          );
          inertia += dist * dist;
        }

        if (Math.abs(prev_inertia - inertia) < 1e-6) {
          break;
        }

        prev_inertia = inertia;
        for (let c = 0; c < n_clusters; c++) {
          centers[c] = [...(new_centers[c] as any[])] as any[];
        }
      }

      return labels;
    }
  });

  /**
   * sklearn_kmeans_inertia
   * 모델의 inertia (클러스터 내부 거리 제곱의 합) 계산
   *
   * @param X 입력 데이터 (2D Array)
   * @param model 학습된 모델
   * @returns inertia 값 (number)
   */
  registry.register({
    name: 'sklearn_kmeans_inertia',
    module: 'sklearn',
    executor: (args) => {
      const X = args[0] as any[];
      const model = args[1] as any;

      if (!model.centers) {
        throw new Error('sklearn_kmeans_inertia: invalid model');
      }

      const centers = model.centers as any[];
      let inertia = 0;

      // predict 로직 인라인
      const predictions: number[] = [];
      for (let i = 0; i < X.length; i++) {
        let min_dist = Infinity;
        let nearest_cluster = 0;

        for (let c = 0; c < centers.length; c++) {
          const dist = euclidean_distance(X[i] as any[], centers[c] as any[]);
          if (dist < min_dist) {
            min_dist = dist;
            nearest_cluster = c;
          }
        }

        predictions.push(nearest_cluster);
      }

      // inertia 계산
      for (let i = 0; i < X.length; i++) {
        const dist = euclidean_distance(
          X[i] as any[],
          centers[predictions[i]] as any[]
        );
        inertia += dist * dist;
      }

      return inertia;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 4: K-Nearest Neighbors (4개 함수)
  // ════════════════════════════════════════════════════════════════

  /**
   * sklearn_knn_fit
   * KNN 모델 학습 (데이터 저장)
   *
   * @param X_train 학습 데이터 (2D Array)
   * @param y_train 학습 라벨 (1D Array)
   * @returns 모델 객체 {X_train, y_train}
   */
  registry.register({
    name: 'sklearn_knn_fit',
    module: 'sklearn',
    executor: (args) => {
      const X_train = args[0] as any[];
      const y_train = args[1] as any[];

      if (!Array.isArray(X_train) || !Array.isArray(y_train)) {
        throw new Error('sklearn_knn_fit: X_train and y_train must be arrays');
      }

      if (X_train.length !== y_train.length) {
        throw new Error(
          'sklearn_knn_fit: X_train and y_train must have same length'
        );
      }

      return {
        X_train: X_train,
        y_train: y_train,
        is_knn_model: true
      };
    }
  });

  /**
   * sklearn_knn_predict
   * KNN 회귀 예측 (가장 가까운 k개 이웃의 평균)
   *
   * @param X_test 예측할 데이터 (2D Array)
   * @param model 학습된 모델
   * @param n_neighbors 이웃 개수 (number, 기본값: 5)
   * @returns 예측값 배열 (Array<number>)
   */
  registry.register({
    name: 'sklearn_knn_predict',
    module: 'sklearn',
    executor: (args) => {
      const X_test = args[0] as any[];
      const model = args[1] as any;
      const n_neighbors = args[2] as number || 5;

      if (!model.X_train || !model.y_train) {
        throw new Error('sklearn_knn_predict: invalid model');
      }

      const X_train = model.X_train as any[];
      const y_train = model.y_train as any[];
      const predictions: number[] = [];

      for (let i = 0; i < X_test.length; i++) {
        // 모든 학습 데이터와의 거리 계산
        const distances: Array<{ dist: number; idx: number }> = [];

        for (let j = 0; j < X_train.length; j++) {
          const dist = euclidean_distance(X_test[i] as any[], X_train[j] as any[]);
          distances.push({ dist: dist, idx: j });
        }

        // 거리 기준으로 정렬
        distances.sort((a, b) => a.dist - b.dist);

        // 가장 가까운 k개 이웃의 평균 계산
        let sum = 0;
        const k = Math.min(n_neighbors, distances.length);
        for (let k_idx = 0; k_idx < k; k_idx++) {
          sum += y_train[distances[k_idx].idx] as number;
        }

        predictions.push(sum / k);
      }

      return predictions;
    }
  });

  /**
   * sklearn_knn_classify
   * KNN 분류 (가장 가까운 k개 이웃의 다수결)
   *
   * @param X_test 예측할 데이터 (2D Array)
   * @param model 학습된 모델
   * @param n_neighbors 이웃 개수 (number, 기본값: 5)
   * @returns 예측 라벨 배열 (Array<number|string>)
   */
  registry.register({
    name: 'sklearn_knn_classify',
    module: 'sklearn',
    executor: (args) => {
      const X_test = args[0] as any[];
      const model = args[1] as any;
      const n_neighbors = args[2] as number || 5;

      if (!model.X_train || !model.y_train) {
        throw new Error('sklearn_knn_classify: invalid model');
      }

      const X_train = model.X_train as any[];
      const y_train = model.y_train as any[];
      const predictions: any[] = [];

      for (let i = 0; i < X_test.length; i++) {
        // 모든 학습 데이터와의 거리 계산
        const distances: Array<{ dist: number; idx: number }> = [];

        for (let j = 0; j < X_train.length; j++) {
          const dist = euclidean_distance(X_test[i] as any[], X_train[j] as any[]);
          distances.push({ dist: dist, idx: j });
        }

        // 거리 기준으로 정렬
        distances.sort((a, b) => a.dist - b.dist);

        // 가장 가까운 k개 이웃의 다수결
        const vote_count: { [key: string]: number } = {};
        const k = Math.min(n_neighbors, distances.length);

        for (let k_idx = 0; k_idx < k; k_idx++) {
          const label = String(y_train[distances[k_idx].idx]);
          vote_count[label] = (vote_count[label] || 0) + 1;
        }

        // 가장 많은 표를 받은 라벨 선택
        let max_votes = -1;
        let predicted_label: any = null;

        for (const label in vote_count) {
          if (vote_count[label] > max_votes) {
            max_votes = vote_count[label];
            predicted_label = label;
          }
        }

        // 원본 타입으로 변환
        if (predicted_label !== null && !isNaN(Number(predicted_label))) {
          predictions.push(Number(predicted_label));
        } else {
          predictions.push(predicted_label);
        }
      }

      return predictions;
    }
  });

  /**
   * sklearn_knn_neighbors
   * 각 테스트 점에서 가장 가까운 k개 이웃의 거리와 인덱스 반환
   *
   * @param X_test 예측할 데이터 (2D Array)
   * @param model 학습된 모델
   * @param n_neighbors 이웃 개수 (number, 기본값: 5)
   * @returns {distances, indices} 객체
   */
  registry.register({
    name: 'sklearn_knn_neighbors',
    module: 'sklearn',
    executor: (args) => {
      const X_test = args[0] as any[];
      const model = args[1] as any;
      const n_neighbors = args[2] as number || 5;

      if (!model.X_train || !model.y_train) {
        throw new Error('sklearn_knn_neighbors: invalid model');
      }

      const X_train = model.X_train as any[];
      const distances_result: any[] = [];
      const indices_result: any[] = [];

      for (let i = 0; i < X_test.length; i++) {
        // 모든 학습 데이터와의 거리 계산
        const distances: Array<{ dist: number; idx: number }> = [];

        for (let j = 0; j < X_train.length; j++) {
          const dist = euclidean_distance(X_test[i] as any[], X_train[j] as any[]);
          distances.push({ dist: dist, idx: j });
        }

        // 거리 기준으로 정렬
        distances.sort((a, b) => a.dist - b.dist);

        // 상위 k개 추출
        const k = Math.min(n_neighbors, distances.length);
        const dists: number[] = [];
        const idxs: number[] = [];

        for (let k_idx = 0; k_idx < k; k_idx++) {
          dists.push(distances[k_idx].dist);
          idxs.push(distances[k_idx].idx);
        }

        distances_result.push(dists);
        indices_result.push(idxs);
      }

      return {
        distances: distances_result,
        indices: indices_result
      };
    }
  });
}
