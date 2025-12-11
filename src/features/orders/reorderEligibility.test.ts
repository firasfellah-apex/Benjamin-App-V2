/**
 * Unit tests for reorder eligibility validation
 */

import { describe, it, expect } from 'vitest';
import { validateReorderEligibility } from './reorderEligibility';
import type { OrderWithDetails } from '@/types/types';
import type { Profile } from '@/types/types';
import type { CustomerAddress } from '@/types/types';

// Helper to create mock data
function createMockProfile(hasBank: boolean = true): Profile {
  return {
    id: 'user-1',
    email: 'test@example.com',
    role: ['customer'],
    plaid_item_id: hasBank ? 'plaid-item-123' : null,
  } as Profile;
}

function createMockAddress(id: string): CustomerAddress {
  return {
    id,
    customer_id: 'user-1',
    label: 'Home',
    line1: '123 Main St',
    city: 'Miami',
    state: 'FL',
    postal_code: '33139',
    latitude: 25.7617,
    longitude: -80.1918,
    icon: 'Home',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockOrder(
  addressId: string | null = 'address-1',
  status: string = 'Completed',
  cancelledAt: string | null = null
): OrderWithDetails {
  return {
    id: 'order-1',
    customer_id: 'user-1',
    requested_amount: 300,
    status: status as any,
    address_id: addressId,
    address_snapshot: addressId ? null : {
      line1: '123 Main St',
      city: 'Miami',
      state: 'FL',
      postal_code: '33139',
      latitude: 25.7617,
      longitude: -80.1918,
    },
    cancelled_at: cancelledAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as OrderWithDetails;
}

describe('validateReorderEligibility', () => {
  describe('all checks pass', () => {
    it('should return ok: true when all conditions are met', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder('address-1', 'Completed', null);

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return ok: true when order has address_snapshot but no address_id', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder(null, 'Completed', null); // null address_id, has snapshot

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('missing bank', () => {
    it('should return ok: false with missing_bank reason when profile has no plaid_item_id', () => {
      const profile = createMockProfile(false); // no bank
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder('address-1', 'Completed', null);

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_bank');
      expect(result.message).toContain('bank account');
    });

    it('should return ok: false when profile is null', () => {
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder('address-1', 'Completed', null);

      const result = validateReorderEligibility({
        profile: null,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_bank');
    });
  });

  describe('missing address', () => {
    it('should return ok: false with missing_address reason when address_id does not exist in addresses', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-2')]; // different address
      const order = createMockOrder('address-1', 'Completed', null); // order references address-1

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_address');
      expect(result.message).toContain('address');
    });

    it('should return ok: false when order has no address_id and no address_snapshot', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-1')];
      const order = {
        ...createMockOrder('address-1', 'Completed', null),
        address_id: null,
        address_snapshot: null,
      };

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_address');
    });

    it('should return ok: true when order has address_snapshot even if address_id is missing', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-1')];
      const order = {
        ...createMockOrder(null, 'Completed', null),
        address_snapshot: {
          line1: '123 Main St',
          city: 'Miami',
          state: 'FL',
          postal_code: '33139',
          latitude: 25.7617,
          longitude: -80.1918,
        },
      };

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('blocked order', () => {
    it('should return ok: false with blocked_order reason when order is cancelled', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder('address-1', 'Cancelled', null);

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('blocked_order');
      expect(result.message).toContain("can't be reused");
    });

    it('should return ok: false when order has cancelled_at timestamp', () => {
      const profile = createMockProfile(true);
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder('address-1', 'Completed', new Date().toISOString());

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('blocked_order');
    });
  });

  describe('edge cases', () => {
    it('should handle empty addresses array', () => {
      const profile = createMockProfile(true);
      const addresses: CustomerAddress[] = [];
      const order = createMockOrder('address-1', 'Completed', null);

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_address');
    });

    it('should prioritize missing_bank over missing_address', () => {
      const profile = createMockProfile(false); // no bank
      const addresses: CustomerAddress[] = []; // no addresses
      const order = createMockOrder('address-1', 'Completed', null);

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      // Should fail on bank check first
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_bank');
    });

    it('should prioritize missing_bank over blocked_order', () => {
      const profile = createMockProfile(false); // no bank
      const addresses = [createMockAddress('address-1')];
      const order = createMockOrder('address-1', 'Cancelled', null);

      const result = validateReorderEligibility({
        profile,
        addresses,
        previousOrder: order,
      });

      // Should fail on bank check first
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_bank');
    });
  });
});

