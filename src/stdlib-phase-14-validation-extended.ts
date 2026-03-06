/**
 * Phase 14 Extended: Email, Phone, Custom Validators (Tier 1)
 * 특화된 검증 함수들
 */

import { registerBuiltinFunction } from './cli/function-registry';

// ============================================
// email: 이메일 검증
// ============================================

class EmailValidator {
  private static pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static validate(email: string): boolean {
    return this.pattern.test(email);
  }

  static isValid(email: string): boolean {
    return this.validate(email);
  }

  static normalize(email: string): string {
    return email.toLowerCase().trim();
  }

  static getDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : null;
  }
}

// ============================================
// phone: 전화번호 검증
// ============================================

class PhoneValidator {
  static validate(phone: string): boolean {
    const cleaned = this.clean(phone);
    return /^\d{7,15}$/.test(cleaned);
  }

  static clean(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  static format(phone: string, format: string = 'INTERNATIONAL'): string {
    const cleaned = this.clean(phone);

    switch (format) {
      case 'INTERNATIONAL':
        if (cleaned.length === 10) return `+1-${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        return `+${cleaned}`;
      case 'NATIONAL':
        if (cleaned.length === 10) return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        return cleaned;
      default:
        return cleaned;
    }
  }

  static getCountryCode(phone: string): string {
    const cleaned = this.clean(phone);
    if (cleaned.startsWith('1')) return '1'; // US
    if (cleaned.startsWith('44')) return '44'; // UK
    if (cleaned.startsWith('33')) return '33'; // France
    return '1'; // Default
  }
}

// ============================================
// credit-card: 신용카드 검증
// ============================================

class CreditCardValidator {
  static validate(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  static getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (/^4/.test(cleaned)) return 'VISA';
    if (/^5[1-5]/.test(cleaned)) return 'MASTERCARD';
    if (/^3[47]/.test(cleaned)) return 'AMEX';
    if (/^6(?:011|5)/.test(cleaned)) return 'DISCOVER';
    if (/^(?:2131|1800|35\d{3})/.test(cleaned)) return 'JCB';

    return 'UNKNOWN';
  }

  static mask(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    const last4 = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);
    return `${masked}${last4}`;
  }
}

// ============================================
// ip-address: IP 주소 검증
// ============================================

class IpValidator {
  static validateIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && String(num) === part;
    });
  }

  static validateIPv6(ip: string): boolean {
    const pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;
    return pattern.test(ip);
  }

  static isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }

  static getVersion(ip: string): 'IPv4' | 'IPv6' | 'UNKNOWN' {
    if (this.validateIPv4(ip)) return 'IPv4';
    if (this.validateIPv6(ip)) return 'IPv6';
    return 'UNKNOWN';
  }
}

// ============================================
// slug: 추가 검증 함수 (확장)
// ============================================

class StringValidator {
  static isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  static isUuid(str: string): boolean {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return pattern.test(str);
  }

  static isJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  static isIpAddress(str: string): boolean {
    return IpValidator.validateIPv4(str) || IpValidator.validateIPv6(str);
  }

  static isUpperCase(str: string): boolean {
    return str === str.toUpperCase();
  }

  static isLowerCase(str: string): boolean {
    return str === str.toLowerCase();
  }

  static isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*$/.test(str);
  }

  static isKebabCase(str: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str);
  }

  static isSnakeCase(str: string): boolean {
    return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(str);
  }
}

// ============================================
// Register builtin functions
// ============================================

registerBuiltinFunction('email_validate', (email: string) => {
  return EmailValidator.validate(email);
});

registerBuiltinFunction('email_normalize', (email: string) => {
  return EmailValidator.normalize(email);
});

registerBuiltinFunction('email_domain', (email: string) => {
  return EmailValidator.getDomain(email);
});

registerBuiltinFunction('phone_validate', (phone: string) => {
  return PhoneValidator.validate(phone);
});

registerBuiltinFunction('phone_clean', (phone: string) => {
  return PhoneValidator.clean(phone);
});

registerBuiltinFunction('phone_format', (phone: string, format?: string) => {
  return PhoneValidator.format(phone, format ?? 'INTERNATIONAL');
});

registerBuiltinFunction('phone_country_code', (phone: string) => {
  return PhoneValidator.getCountryCode(phone);
});

registerBuiltinFunction('credit_card_validate', (cardNumber: string) => {
  return CreditCardValidator.validate(cardNumber);
});

registerBuiltinFunction('credit_card_type', (cardNumber: string) => {
  return CreditCardValidator.getCardType(cardNumber);
});

registerBuiltinFunction('credit_card_mask', (cardNumber: string) => {
  return CreditCardValidator.mask(cardNumber);
});

registerBuiltinFunction('ip_validate_v4', (ip: string) => {
  return IpValidator.validateIPv4(ip);
});

registerBuiltinFunction('ip_validate_v6', (ip: string) => {
  return IpValidator.validateIPv6(ip);
});

registerBuiltinFunction('ip_is_private', (ip: string) => {
  return IpValidator.isPrivateIPv4(ip);
});

registerBuiltinFunction('ip_version', (ip: string) => {
  return IpValidator.getVersion(ip);
});

registerBuiltinFunction('string_is_url', (str: string) => {
  return StringValidator.isUrl(str);
});

registerBuiltinFunction('string_is_uuid', (str: string) => {
  return StringValidator.isUuid(str);
});

registerBuiltinFunction('string_is_json', (str: string) => {
  return StringValidator.isJson(str);
});

registerBuiltinFunction('string_is_ipaddress', (str: string) => {
  return StringValidator.isIpAddress(str);
});

registerBuiltinFunction('string_is_uppercase', (str: string) => {
  return StringValidator.isUpperCase(str);
});

registerBuiltinFunction('string_is_lowercase', (str: string) => {
  return StringValidator.isLowerCase(str);
});

registerBuiltinFunction('string_is_pascalcase', (str: string) => {
  return StringValidator.isPascalCase(str);
});

registerBuiltinFunction('string_is_kebabcase', (str: string) => {
  return StringValidator.isKebabCase(str);
});

registerBuiltinFunction('string_is_snakecase', (str: string) => {
  return StringValidator.isSnakeCase(str);
});

export { EmailValidator, PhoneValidator, CreditCardValidator, IpValidator, StringValidator };
