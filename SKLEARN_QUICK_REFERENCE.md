# FreeLang scikit-learn Phase 1-2 Quick Reference

## 📍 File Location
`/home/kimjin/Desktop/kim/v2-freelang-ai/src/stdlib-sklearn.ts` (1244 lines, 19 functions)

---

## 🚀 Quick Start

### Phase 1: Preprocessing

```typescript
// StandardScaler (표준화)
const scaler = sklearn_scaler_fit(X);              // fit
const X_scaled = sklearn_scaler_transform(X, scaler);  // transform
const {X_scaled, scaler} = sklearn_scaler_fit_transform(X);  // combined

// MinMaxScaler (정규화 0-1)
const minmax = sklearn_minmax_fit(X);              // fit
const X_norm = sklearn_minmax_transform(X, minmax);   // transform

// train_test_split
const {X_train, X_test, y_train, y_test} =
  sklearn_train_test_split(X, y, 0.2, 42);  // 80/20 split
```

### Phase 2: Linear Models

```typescript
// Linear Regression
const linreg = sklearn_linear_fit(X_train, y_train);
const y_pred = sklearn_linear_predict(X_test, linreg);

// Logistic Regression (분류)
const logreg = sklearn_logistic_fit(X_train, y_train, 0.01, 100);
const pred = sklearn_logistic_predict(X_test, logreg);        // 0/1
const proba = sklearn_logistic_predict_proba(X_test, logreg); // 0~1
```

---

## 📋 Full API Reference

### Phase 1: Preprocessing (6 functions)

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `sklearn_scaler_fit` | X: 2D | {mean, std} | Calculate normalization stats |
| `sklearn_scaler_transform` | X: 2D, params | X_scaled: 2D | Apply standardization |
| `sklearn_scaler_fit_transform` | X: 2D | {X_scaled, scaler} | Combined fit+transform |
| `sklearn_minmax_fit` | X: 2D | {min, max} | Calculate min/max |
| `sklearn_minmax_transform` | X: 2D, params | X_norm: 2D | Apply 0-1 normalization |
| `sklearn_train_test_split` | X, y, size?, seed? | {X_train, X_test, y_train, y_test} | Split data |

### Phase 2: Linear Models (5 functions)

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `sklearn_linear_fit` | X: 2D, y: 1D | {coef, intercept} | Train regression |
| `sklearn_linear_predict` | X: 2D, model | y_pred: 1D | Predict values |
| `sklearn_logistic_fit` | X: 2D, y: 1D, lr?, epochs? | {coef, intercept, loss_history} | Train classifier |
| `sklearn_logistic_predict` | X: 2D, model | pred: 1D (0/1) | Binary classification |
| `sklearn_logistic_predict_proba` | X: 2D, model | proba: 1D (0~1) | Class probabilities |

---

## 🎯 Common Patterns

### Pattern 1: Full ML Pipeline

```typescript
// 1. Split
const {X_train, X_test, y_train, y_test} =
  sklearn_train_test_split(X, y, 0.2, 42);

// 2. Preprocess (fit on train only!)
const scaler = sklearn_scaler_fit(X_train);
const X_train_scaled = sklearn_scaler_transform(X_train, scaler);
const X_test_scaled = sklearn_scaler_transform(X_test, scaler);

// 3. Train
const model = sklearn_logistic_fit(X_train_scaled, y_train, 0.01, 1000);

// 4. Evaluate
const y_train_pred = sklearn_logistic_predict(X_train_scaled, model);
const y_test_pred = sklearn_logistic_predict(X_test_scaled, model);
const train_acc = accuracy(y_train, y_train_pred);
const test_acc = accuracy(y_test, y_test_pred);
```

### Pattern 2: Multiple Scaler Types

```typescript
// Compare StandardScaler vs MinMaxScaler
const {X_scaled: X1, scaler: s1} = sklearn_scaler_fit_transform(X);
const minmax = sklearn_minmax_fit(X);
const X2 = sklearn_minmax_transform(X, minmax);

// Train models with both
const m1 = sklearn_logistic_fit(X1, y);
const m2 = sklearn_logistic_fit(X2, y);
```

### Pattern 3: Loss Tracking

```typescript
const model = sklearn_logistic_fit(X, y, 0.01, 100);

// Plot loss_history to monitor convergence
console.log('Loss history:', model.loss_history);
console.log('Initial:', model.loss_history[0]);
console.log('Final:', model.loss_history[model.loss_history.length-1]);
```

---

## ⚠️ Key Notes

### StandardScaler
- Formula: `(x - mean) / std`
- ✓ Use for features with different scales
- ✓ Handles std=0 (treats as 1)
- ✗ Don't use if data has outliers (use RobustScaler instead)

### MinMaxScaler
- Formula: `(x - min) / (max - min)`
- ✓ Use to get [0, 1] range
- ✓ Handles range=0 (treats as 1)
- ✗ Sensitive to outliers

### train_test_split
- Default: 80% train, 20% test
- ✓ Use random_seed for reproducibility
- ✓ Supports any test_size (0~1)
- ✗ Don't use on already split data

### Linear Regression
- Formula: `y = coef @ X + intercept`
- ✓ Closed-form solution (fast)
- ✗ Doesn't handle singular matrices (will throw error)
- ⚠️ Sensitive to feature scaling

### Logistic Regression
- Formula: `P(y=1) = sigmoid(coef @ X + intercept)`
- ✓ Gradient descent convergence guaranteed (convex)
- ✓ Returns loss_history for monitoring
- ⚠️ Sensitive to learning_rate and epochs
- Threshold for classification: 0.5

---

## 📊 Data Shapes

```
Input Shapes:
  X: (n_samples, n_features)       # 2D array
  y: (n_samples,)                   # 1D array

Output Shapes:
  scaler params: {mean/min: (n_features,), std/max: (n_features,)}
  predictions: (n_samples,)          # 1D array
  model: {coef: (n_features,), intercept: scalar, ...}
```

---

## 🔧 Default Parameters

```typescript
// sklearn_train_test_split
test_size = 0.2          // 20% test, 80% train
random_seed = undefined  // Use Math.random() if not provided

// sklearn_logistic_fit
learning_rate = 0.01
epochs = 100
```

---

## ✅ Type Hints

```typescript
// Phase 1 Types
type Scaler = {mean: number[], std: number[]}
type MinMaxScaler = {min: number[], max: number[]}
type TrainTestSplit = {
  X_train: number[][], X_test: number[][],
  y_train: number[], y_test: number[]
}

// Phase 2 Types
type LinearModel = {coef: number[], intercept: number}
type LogisticModel = {
  coef: number[],
  intercept: number,
  loss_history: number[]
}

// Predictions
type Prediction = number[]
type Probability = number[]
```

---

## 🧮 Complexity Analysis

| Function | Time | Space |
|----------|------|-------|
| scaler_fit | O(nm) | O(m) |
| scaler_transform | O(nm) | O(nm) |
| minmax_fit | O(nm) | O(m) |
| minmax_transform | O(nm) | O(nm) |
| train_test_split | O(n) | O(n) |
| linear_fit | O(m³) | O(m²) |
| linear_predict | O(nm) | O(n) |
| logistic_fit | O(E·nm) | O(m) |
| logistic_predict | O(nm) | O(n) |
| logistic_predict_proba | O(nm) | O(n) |

Legend: n=samples, m=features, E=epochs

---

## 🐛 Common Issues

### Issue 1: All zeros after scaling
```
Cause: std[j] == 0 (feature is constant)
Fix: Already handled (treated as 1)
```

### Issue 2: NaN in predictions
```
Cause: Feature scaling mismatch
Fix: Use same scaler for train and test
```

### Issue 3: Logistic regression doesn't converge
```
Solutions:
  - Decrease learning_rate (0.001)
  - Increase epochs (1000+)
  - Normalize features first
```

### Issue 4: Linear regression singular matrix
```
Cause: Features are linearly dependent
Fix: Remove redundant features or use regularization
```

---

## 🎓 Learning Recommendations

1. **Always preprocess**: StandardScaler or MinMaxScaler
2. **Always split**: train_test_split before training
3. **Fit on train**: Never fit scaler/model on test data
4. **Apply to test**: Use same scaler parameters for test
5. **Monitor loss**: Check loss_history in logistic regression
6. **Validate**: Evaluate on both train and test sets

---

## 📚 Complete Example

```typescript
// Iris-like classification task
const data = [
  {X: [5.1, 3.5], y: 0},
  {X: [4.9, 3.0], y: 0},
  {X: [7.0, 3.2], y: 1},
  {X: [6.4, 3.2], y: 1},
];

const X = data.map(d => d.X);
const y = data.map(d => d.y);

// 1. Split
const {X_train, X_test, y_train, y_test} =
  sklearn_train_test_split(X, y, 0.25, 42);

// 2. Scale
const scaler = sklearn_scaler_fit(X_train);
const Xt = sklearn_scaler_transform(X_train, scaler);
const Xte = sklearn_scaler_transform(X_test, scaler);

// 3. Train
const model = sklearn_logistic_fit(Xt, y_train, 0.1, 100);

// 4. Predict
const pred = sklearn_logistic_predict(Xte, model);
const proba = sklearn_logistic_predict_proba(Xte, model);

console.log('Predictions:', pred);
console.log('Probabilities:', proba);
console.log('Model coefficients:', model.coef);
console.log('Model intercept:', model.intercept);
```

---

**Updated**: 2026-03-06
**Status**: ✅ Complete (19/19 functions)
**Compatibility**: FreeLang v2, Node.js 12+, TypeScript 3.8+
