/**
 * TypeScript 동적 폼 빌더
 * 엄격한 타입 시스템 활용
 *
 * 특징: 컴파일 타임 타입 안전성, 인터페이스/제네릭 활용
 * 문제: 동적 타입이 복잡해지면 any 사용 증가, 코드 길어짐
 */

// ============ 타입 정의 (30줄) ============

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'select';

interface FieldOption {
  label: string;
  value: string | number;
}

interface FormField<T extends FieldType = FieldType> {
  name: string;
  type: T;
  label: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  options?: FieldOption[];
}

interface FormSchema {
  id: string;
  title: string;
  fields: FormField[];
  created_at: Date;
}

interface FormData {
  [key: string]: string | number | boolean | Date | any;
}

interface ValidationResult {
  valid: boolean;
  errors: {
    [fieldName: string]: string;
  };
}

// ============ 폼 빌더 클래스 (120줄) ============

class DynamicFormBuilder {
  private schema: FormSchema;
  private formData: FormData = {};

  constructor(id: string, title: string) {
    this.schema = {
      id,
      title,
      fields: [],
      created_at: new Date(),
    };
  }

  // 필드 추가 (20줄)
  addField<T extends FieldType>(
    name: string,
    type: T,
    config: {
      label: string;
      required?: boolean;
      validation?: any;
      options?: FieldOption[];
    }
  ): this {
    const field: FormField<T> = {
      name,
      type,
      label: config.label,
      required: config.required ?? false,
      validation: config.validation,
      options: config.options,
    };

    // 타입별 기본 검증
    if (type === 'string' && !field.validation?.maxLength) {
      field.validation = { ...field.validation, maxLength: 255 };
    }
    if (type === 'number' && !field.validation?.max) {
      field.validation = { ...field.validation, max: 999999 };
    }

    this.schema.fields.push(field);
    return this;
  }

  // 데이터 설정 (10줄)
  setData(key: string, value: any): this {
    const field = this.schema.fields.find(f => f.name === key);
    if (!field) throw new Error(`Field ${key} not found`);

    this.formData[key] = value;
    return this;
  }

  // 검증 (70줄)
  validate(): ValidationResult {
    const errors: { [key: string]: string } = {};

    for (const field of this.schema.fields) {
      const value = this.formData[field.name];

      // Required 검증
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.name] = `${field.label} is required`;
        continue;
      }

      // 타입별 검증
      switch (field.type) {
        case 'string':
          this._validateString(field, value, errors);
          break;
        case 'number':
          this._validateNumber(field, value, errors);
          break;
        case 'boolean':
          this._validateBoolean(field, value, errors);
          break;
        case 'date':
          this._validateDate(field, value, errors);
          break;
        case 'select':
          this._validateSelect(field, value, errors);
          break;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  private _validateString(
    field: FormField<'string'>,
    value: any,
    errors: any
  ): void {
    if (typeof value !== 'string') {
      errors[field.name] = `${field.label} must be a string`;
      return;
    }

    if (field.validation?.minLength && value.length < field.validation.minLength) {
      errors[field.name] = `${field.label} must be at least ${field.validation.minLength} characters`;
    }
    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
      errors[field.name] = `${field.label} must not exceed ${field.validation.maxLength} characters`;
    }
    if (field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors[field.name] = `${field.label} format is invalid`;
      }
    }
  }

  private _validateNumber(
    field: FormField<'number'>,
    value: any,
    errors: any
  ): void {
    if (typeof value !== 'number') {
      errors[field.name] = `${field.label} must be a number`;
      return;
    }

    if (field.validation?.min !== undefined && value < field.validation.min) {
      errors[field.name] = `${field.label} must be at least ${field.validation.min}`;
    }
    if (field.validation?.max !== undefined && value > field.validation.max) {
      errors[field.name] = `${field.label} must not exceed ${field.validation.max}`;
    }
  }

  private _validateBoolean(
    field: FormField<'boolean'>,
    value: any,
    errors: any
  ): void {
    if (typeof value !== 'boolean') {
      errors[field.name] = `${field.label} must be a boolean`;
    }
  }

  private _validateDate(field: FormField<'date'>, value: any, errors: any): void {
    if (!(value instanceof Date)) {
      errors[field.name] = `${field.label} must be a valid date`;
    }
  }

  private _validateSelect(
    field: FormField<'select'>,
    value: any,
    errors: any
  ): void {
    if (!field.options) return;
    const validValues = field.options.map(opt => opt.value);
    if (!validValues.includes(value)) {
      errors[field.name] = `${field.label} has invalid selection`;
    }
  }

  // JSON 스키마 생성 (15줄)
  generateJsonSchema(): any {
    const properties: any = {};
    const required: string[] = [];

    for (const field of this.schema.fields) {
      const schema: any = {
        type: this._typeToJsonSchemaType(field.type),
        title: field.label,
      };

      if (field.validation?.minLength) schema.minLength = field.validation.minLength;
      if (field.validation?.maxLength) schema.maxLength = field.validation.maxLength;
      if (field.validation?.min !== undefined) schema.minimum = field.validation.min;
      if (field.validation?.max !== undefined) schema.maximum = field.validation.max;
      if (field.options) schema.enum = field.options.map(opt => opt.value);

      properties[field.name] = schema;

      if (field.required) required.push(field.name);
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: this.schema.title,
      properties,
      required,
    };
  }

  private _typeToJsonSchemaType(type: FieldType): string {
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'string'; // ISO 8601
      case 'select': return 'string';
      default: return 'any';
    }
  }

  // 데이터 반환
  getData(): FormData {
    return this.formData;
  }

  getSchema(): FormSchema {
    return this.schema;
  }
}

// ============ 사용 예 (25줄) ============

// 타입 안전한 폼 구축
const form = new DynamicFormBuilder('contact-form', '연락처 양식');

form
  .addField('name', 'string', {
    label: '이름',
    required: true,
    validation: { minLength: 2, maxLength: 50 },
  })
  .addField('age', 'number', {
    label: '나이',
    required: true,
    validation: { min: 0, max: 150 },
  })
  .addField('email', 'string', {
    label: '이메일',
    required: true,
    validation: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
  })
  .addField('subscribe', 'boolean', {
    label: '뉴스레터 구독',
    required: false,
  })
  .addField('country', 'select', {
    label: '국가',
    required: true,
    options: [
      { label: '한국', value: 'KR' },
      { label: '미국', value: 'US' },
      { label: '일본', value: 'JP' },
    ],
  });

// 데이터 입력
form
  .setData('name', 'Alice')
  .setData('age', 25)
  .setData('email', 'alice@example.com')
  .setData('subscribe', true)
  .setData('country', 'KR');

// 검증
const result = form.validate();
console.log('Valid:', result.valid);
console.log('Errors:', result.errors);

// JSON 스키마 생성
const jsonSchema = form.generateJsonSchema();
console.log('JSON Schema:', JSON.stringify(jsonSchema, null, 2));

console.log('Form Data:', form.getData());

// ============ 통계 ============
// 총 라인수: ~200줄
// - 타입 정의: 30줄
// - 클래스: 120줄
// - 검증 로직: 70줄
// - 사용 예: 25줄
//
// 특징:
// ✅ 컴파일 타임 타입 안전성
// ✅ 자동 완성 (IDE)
// ✅ 타입 힌트
// ❌ 코드 량 많음
// ❌ 타입 정의 복잡
// ❌ 동적 타입이 많아지면 any 유혹
