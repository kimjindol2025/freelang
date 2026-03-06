/**
 * Phase 14: Validation & Schema Library
 * 스키마 검증 및 입력값 정제
 * Tier 1 (Priority 95)
 */

import { registerBuiltinFunction } from './cli/function-registry';

// ============================================
// schema: 동적 스키마 정의 및 검증
// ============================================

type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';

interface SchemaDefinition {
  type: SchemaType;
  required?: boolean;
  default?: any;
  validate?: (value: any) => boolean;
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  enum?: any[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}

interface ValidationError {
  path: string;
  message: string;
  value: any;
}

class Schema {
  private definition: SchemaDefinition;

  constructor(def: SchemaDefinition) {
    this.definition = def;
  }

  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    this.validateValue(data, this.definition, '', errors);
    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined,
    };
  }

  private validateValue(
    value: any,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[]
  ): void {
    // Required check
    if (schema.required && (value === null || value === undefined)) {
      errors.push({
        path: path || 'root',
        message: `Field is required`,
        value,
      });
      return;
    }

    if (value === null || value === undefined) {
      return; // Skip further checks if optional and null
    }

    // Type check
    if (!this.typeMatches(value, schema.type)) {
      errors.push({
        path: path || 'root',
        message: `Expected type ${schema.type}, got ${typeof value}`,
        value,
      });
      return;
    }

    // Enum check
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        path: path || 'root',
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value,
      });
    }

    // Number bounds
    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push({
          path: path || 'root',
          message: `Value must be >= ${schema.min}`,
          value,
        });
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push({
          path: path || 'root',
          message: `Value must be <= ${schema.max}`,
          value,
        });
      }
    }

    // String length
    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path: path || 'root',
          message: `String length must be >= ${schema.minLength}`,
          value,
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path: path || 'root',
          message: `String length must be <= ${schema.maxLength}`,
          value,
        });
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path: path || 'root',
            message: `String does not match pattern ${schema.pattern}`,
            value,
          });
        }
      }
    }

    // Object properties
    if (schema.type === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = path ? `${path}.${key}` : key;
        this.validateValue(value[key], propSchema, propPath, errors);
      }
    }

    // Array items
    if (schema.type === 'array' && schema.items) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${path}[${i}]`;
          this.validateValue(value[i], schema.items, itemPath, errors);
        }
      }
    }

    // Custom validation
    if (schema.validate && !schema.validate(value)) {
      errors.push({
        path: path || 'root',
        message: 'Custom validation failed',
        value,
      });
    }
  }

  private typeMatches(value: any, type: SchemaType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'any':
        return true;
      default:
        return false;
    }
  }
}

// ============================================
// json-schema: JSON Schema 검증
// ============================================

interface JSONSchema {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  [key: string]: any;
}

class JSONSchemaValidator {
  private schema: JSONSchema;

  constructor(schema: JSONSchema) {
    this.schema = schema;
  }

  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    this.validateValue(data, this.schema, '', errors);
    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined,
    };
  }

  private validateValue(
    value: any,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (!schema) return;

    // Type check
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      let typeMatched = false;
      for (const t of types) {
        if (this.typeMatches(value, t)) {
          typeMatched = true;
          break;
        }
      }
      if (!typeMatched) {
        errors.push({
          path: path || 'root',
          message: `Expected type ${schema.type}`,
          value,
        });
        return;
      }
    }

    // Enum
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        path: path || 'root',
        message: `Must be one of: ${schema.enum.join(', ')}`,
        value,
      });
    }

    // String validation
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path: path || 'root',
          message: `Length must be >= ${schema.minLength}`,
          value,
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path: path || 'root',
          message: `Length must be <= ${schema.maxLength}`,
          value,
        });
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path: path || 'root',
            message: `Does not match pattern`,
            value,
          });
        }
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path: path || 'root',
          message: `Must be >= ${schema.minimum}`,
          value,
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path: path || 'root',
          message: `Must be <= ${schema.maximum}`,
          value,
        });
      }
    }

    // Object properties
    if (typeof value === 'object' && !Array.isArray(value) && schema.properties) {
      if (schema.required) {
        for (const req of schema.required) {
          if (!(req in value)) {
            errors.push({
              path: path ? `${path}.${req}` : req,
              message: `Required field missing`,
              value: undefined,
            });
          }
        }
      }
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          const propPath = path ? `${path}.${key}` : key;
          this.validateValue(value[key], propSchema, propPath, errors);
        }
      }
    }

    // Array items
    if (Array.isArray(value) && schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${path}[${i}]`;
        this.validateValue(value[i], schema.items, itemPath, errors);
      }
    }
  }

  private typeMatches(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return false;
    }
  }
}

// ============================================
// sanitize: 입력값 정제
// ============================================

class Sanitizer {
  static trim(value: string): string {
    return value.trim();
  }

  static lowercase(value: string): string {
    return value.toLowerCase();
  }

  static uppercase(value: string): string {
    return value.toUpperCase();
  }

  static removeHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  }

  static removeTags(value: string, tags: string[]): string {
    let result = value;
    for (const tag of tags) {
      const regex = new RegExp(`<${tag}[^>]*>|</${tag}>`, 'gi');
      result = result.replace(regex, '');
    }
    return result;
  }

  static escapeHtml(value: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return value.replace(/[&<>"']/g, (char) => map[char]);
  }

  static removeWhitespace(value: string): string {
    return value.replace(/\s/g, '');
  }

  static normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}

// ============================================
// Register builtin functions
// ============================================

registerBuiltinFunction('schema_create', (def: any) => {
  return new Schema(def);
});

registerBuiltinFunction('schema_validate', (schema: any, data: any) => {
  if (schema instanceof Schema) {
    const result = schema.validate(data);
    return {
      valid: result.valid,
      errors: result.errors,
    };
  }
  return { valid: false, errors: [] };
});

registerBuiltinFunction('json_schema_create', (schema: any) => {
  return new JSONSchemaValidator(schema);
});

registerBuiltinFunction('json_schema_validate', (validator: any, data: any) => {
  if (validator instanceof JSONSchemaValidator) {
    const result = validator.validate(data);
    return {
      valid: result.valid,
      errors: result.errors,
    };
  }
  return { valid: false, errors: [] };
});

registerBuiltinFunction('sanitize_trim', (value: string) => {
  return Sanitizer.trim(value);
});

registerBuiltinFunction('sanitize_lowercase', (value: string) => {
  return Sanitizer.lowercase(value);
});

registerBuiltinFunction('sanitize_uppercase', (value: string) => {
  return Sanitizer.uppercase(value);
});

registerBuiltinFunction('sanitize_remove_html', (value: string) => {
  return Sanitizer.removeHtml(value);
});

registerBuiltinFunction('sanitize_escape_html', (value: string) => {
  return Sanitizer.escapeHtml(value);
});

registerBuiltinFunction('sanitize_normalize_whitespace', (value: string) => {
  return Sanitizer.normalizeWhitespace(value);
});

export { Schema, JSONSchemaValidator, Sanitizer };
