/**
 * Native-Chart 빌트인 통합 테스트
 * chart_bar / chart_line / chart_pie / chart_scatter
 * chart_sparkline / chart_render_html / chart_save / chart_multi / chart_palette
 */

const { NativeFunctionRegistry } = require('./src/vm/native-function-registry');
const registry = new NativeFunctionRegistry();
const { registerStdlibFunctions } = require('./src/stdlib-builtins');
registerStdlibFunctions(registry);

function call(name) {
  const args = Array.prototype.slice.call(arguments, 1);
  const fn = registry.get(name);
  if (!fn) throw new Error('빌트인 없음: ' + name);
  return fn.executor(args);
}

// 1. 막대 차트
const barSvg = call('chart_bar', [120,150,180,90,210,300], ['1월','2월','3월','4월','5월','6월'], '월별 매출', '#4e79a7');
console.log('Bar SVG length:', barSvg.length);

// 2. 선 차트
const lineSvg = call('chart_line', [10,25,15,30,22,45], ['Mon','Tue','Wed','Thu','Fri','Sat'], '주간 트래픽', '#f28e2b');
console.log('Line SVG length:', lineSvg.length);

// 3. 파이 차트
const pieSvg = call('chart_pie', [40,30,20,10], ['서울','부산','대구','기타'], '지역별 매출');
console.log('Pie SVG length:', pieSvg.length);

// 4. 산점도
const scatterSvg = call('chart_scatter', [1,2,3,4,5], [3,7,2,9,5], '산점도', '#e15759');
console.log('Scatter SVG length:', scatterSvg.length);

// 5. 스파크라인
const sparkSvg = call('chart_sparkline', [10,25,15,30,22,45,38]);
console.log('Sparkline SVG length:', sparkSvg.length);

// 6. HTML 래퍼
const html = call('chart_render_html', barSvg, 'FreeLang Native Chart Demo');
call('chart_save', html, '/tmp/freelang-chart-demo.html');
console.log('HTML saved:', html.length, 'chars → /tmp/freelang-chart-demo.html');

// 7. SVG 파일 저장
call('chart_save', pieSvg, '/tmp/freelang-pie-demo.svg');
console.log('Pie SVG saved → /tmp/freelang-pie-demo.svg');

// 8. 복합 대시보드
const dashboard = call('chart_multi', [barSvg, lineSvg, pieSvg, scatterSvg], 2);
call('chart_save', dashboard, '/tmp/freelang-dashboard.svg');
console.log('Dashboard SVG length:', dashboard.length, '→ /tmp/freelang-dashboard.svg');

// 9. 팔레트
const col = call('chart_palette', 3);
console.log('Palette[3]:', col);

// 검증
console.log('\n=== SVG 구조 검증 ===');
console.log('bar <rect:', barSvg.includes('<rect'));
console.log('line <path:', lineSvg.includes('<path'));
console.log('pie <path:', pieSvg.includes('<path'));
console.log('scatter <circle:', scatterSvg.includes('<circle'));
console.log('sparkline <polyline:', sparkSvg.includes('<polyline'));
console.log('html DOCTYPE:', html.includes('<!DOCTYPE'));
console.log('html Chart.js refs:', html.includes('cdn.jsdelivr') || html.includes('chartjs'));
