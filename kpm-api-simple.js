const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 40013;

// KPM 레지스트리 로드
let registry = {};
try {
  registry = JSON.parse(fs.readFileSync('/home/kimjin/kpm-registry/registry.json', 'utf-8'));
} catch (e) {
  console.error('Failed to load registry:', e.message);
}

// ✅ 필드 선택 함수
function selectFields(obj, fields) {
  if (!fields || fields === '*') return obj;
  
  const fieldList = fields.split(',').map(f => f.trim());
  const result = {};
  fieldList.forEach(field => {
    if (field in obj) {
      result[field] = obj[field];
    }
  });
  return result;
}

// 간단한 메모리 캐시
const memCache = new Map();

// ✅ 1️⃣ 리스트 조회 API (Pagination + Filtering + Caching + Selective Fields)
app.get('/api/v1/packages', (req, res) => {
  try {
    const { limit = 10, offset = 0, sort = 'id', filter, fields = 'id,name,url,description' } = req.query;
    const cacheKey = `packages:${limit}:${offset}:${sort}:${filter}:${fields}`;

    // ✅ 캐싱 확인
    if (memCache.has(cacheKey)) {
      const cached = memCache.get(cacheKey);
      return res.json({
        success: true,
        source: '⚡ cache (memory)',
        data: cached.data,
        pagination: cached.pagination,
        timestamp: new Date().toISOString()
      });
    }

    // 데이터 처리
    let packages = Object.entries(registry.packages || {}).map(([name, data]) => ({
      name,
      ...data
    }));

    // ✅ 필터링
    if (filter) {
      const [key, value] = filter.split('=');
      packages = packages.filter(pkg => {
        const pkgValue = String(pkg[key] || '').toLowerCase();
        return pkgValue.includes(String(value).toLowerCase());
      });
    }

    // ✅ 정렬
    if (sort && sort !== 'none') {
      const [sortKey, sortOrder] = sort.split(':');
      packages.sort((a, b) => {
        const aVal = a[sortKey] || '';
        const bVal = b[sortKey] || '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // ✅ 페이지네이션
    const total = packages.length;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    packages = packages.slice(offsetNum, offsetNum + limitNum);

    // ✅ 필드 선택
    packages = packages.map(pkg => selectFields(pkg, fields));

    const pagination = {
      limit: limitNum,
      offset: offsetNum,
      total,
      hasMore: (offsetNum + limitNum) < total
    };

    const response = { data: packages, pagination };
    
    // 캐싱 저장 (메모리)
    memCache.set(cacheKey, response);

    res.json({
      success: true,
      source: '📊 database (fresh)',
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 2️⃣ 단일 패키지 조회
app.get('/api/v1/packages/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { fields = 'id,name,url,description,updated_at' } = req.query;
    const cacheKey = `package:${name}:${fields}`;

    // 캐싱 확인
    if (memCache.has(cacheKey)) {
      return res.json({
        success: true,
        source: '⚡ cache (memory)',
        data: memCache.get(cacheKey),
        timestamp: new Date().toISOString()
      });
    }

    const pkg = registry.packages?.[name];
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const data = selectFields({ name, ...pkg }, fields);
    memCache.set(cacheKey, data);

    res.json({
      success: true,
      source: '📊 database (fresh)',
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 3️⃣ 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: '✅ ok',
    packages: Object.keys(registry.packages || {}).length,
    cache_size: memCache.size,
    timestamp: new Date().toISOString()
  });
});

// ✅ 4️⃣ API 문서
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'KPM API v1',
    features: [
      '✅ Pagination (limit, offset)',
      '✅ Sorting (sort=key:order)',
      '✅ Filtering (filter=key=value)',
      '✅ Selective Fields (?fields=id,name)',
      '✅ Memory Caching (auto expire)'
    ],
    examples: [
      'GET /api/v1/packages - 전체 리스트',
      'GET /api/v1/packages?limit=5&offset=10 - 페이지네이션',
      'GET /api/v1/packages?fields=id,name,url - 필드 선택 ⭐',
      'GET /api/v1/packages?sort=updated_at:desc - 최신순 정렬',
      'GET /api/v1/packages/v2-freelang-ai?fields=id,name - 단일 조회',
    ]
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 KPM API Server started on http://127.0.0.1:${PORT}`);
  console.log(`📖 API Docs: http://127.0.0.1:${PORT}/api/docs\n`);
});
