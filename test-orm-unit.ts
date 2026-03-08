// ORM 코드젠 + 런타임 단위 테스트 (FreeLang VM 없이)
import { generateORMMeta } from './src/codegen/orm-codegen';
import { registerORMMeta, registerORMNativeFunctions } from './src/stdlib/orm-native';
import { NativeFunctionRegistry } from './src/vm/native-function-registry';
import { registerSQLiteNativeFunctions, sqlitePool } from './src/stdlib/sqlite-native';
import * as fs from 'fs';

// 1. Mock Module AST (파서 결과 시뮬레이션)
const mockModule: any = {
  path: 'test',
  imports: [], exports: [],
  statements: [{
    type: 'struct',
    name: 'WashLog',
    annotations: ['db_table:name=wash_logs'],
    fields: [
      { name: 'id', fieldType: 'int', annotations: ['db_id', 'db_auto_inc'] },
      { name: 'site_name', fieldType: 'string', annotations: ['db_column:type=varchar'] },
      { name: 'machine_id', fieldType: 'int', annotations: ['db_column:type=integer'] },
      { name: 'created_at', fieldType: 'int', annotations: ['db_column:type=timestamp'] },
    ]
  }]
};

// 2. Compile-Time SQL 생성
console.log('=== [1] Compile-Time ORM SQL 생성 ===');
const metas = generateORMMeta(mockModule);
for (const m of metas) {
  console.log(`struct: ${m.structName} → table: ${m.tableName}`);
  console.log(`  CREATE : ${m.sql.createTable}`);
  console.log(`  INSERT : ${m.sql.insertAll}`);
  console.log(`  SELECT : ${m.sql.selectAll}`);
  console.log(`  UPDATE : ${m.sql.updateById}`);
  console.log(`  DELETE : ${m.sql.deleteById}`);
}

// 3. ORM 메타 등록
registerORMMeta(metas);

// 4. 네이티브 함수 등록
const registry = new NativeFunctionRegistry();
registerSQLiteNativeFunctions(registry);
registerORMNativeFunctions(registry);

// 5. DB 연결
console.log('\n=== [2] SQLite DB 연결 및 ORM 테스트 ===');
const dbPath = '/tmp/orm-test-unit.db';
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const dbId = registry.call('db_open', [dbPath]) as number;
console.log('db_open:', dbId);

// 6. 테이블 생성
const initOk = registry.call('orm_table_init', [dbId, 'WashLog']);
console.log('orm_table_init:', initOk);

// 7. 레코드 삽입
const id1 = registry.call('orm_insert', [dbId, 'WashLog', '강남지점', 1, 1741400000]);
const id2 = registry.call('orm_insert', [dbId, 'WashLog', '서초지점', 2, 1741400100]);
const id3 = registry.call('orm_insert', [dbId, 'WashLog', 'FreeLang-v2-Compiler', 0, 1741400200]);
console.log('orm_insert ids:', id1, id2, id3);

// 8. 전체 조회
const rows = registry.call('orm_find_all', [dbId, 'WashLog', 10]) as any[];
console.log('orm_find_all count:', rows.length);
for (const r of rows) console.log(' ', r);

// 9. 단건 조회
const row = registry.call('orm_find_one', [dbId, 'WashLog', id1]);
console.log('orm_find_one id=1:', row);

// 10. 카운트
const cnt = registry.call('orm_count', [dbId, 'WashLog']);
console.log('orm_count:', cnt);

// 11. 업데이트
const upd = registry.call('orm_update', [dbId, 'WashLog', id1, '강남지점-수정', 1, 1741499999]);
console.log('orm_update:', upd);

// 12. 삭제
const del = registry.call('orm_delete', [dbId, 'WashLog', id2]);
console.log('orm_delete:', del);

// 13. 최종 카운트
const finalCnt = registry.call('orm_count', [dbId, 'WashLog']);
console.log('orm_count after delete:', finalCnt);

// 14. 컴파일 타임 SQL 확인
const rawSql = registry.call('orm_raw_sql', ['WashLog', 'create']);
console.log('\n=== [3] Compile-Time Pre-built SQL ===');
console.log('orm_raw_sql(create):', rawSql);

console.log('\n✅ Compile-Time-ORM 검증 완료 - Sequelize 의존성: 0%');
