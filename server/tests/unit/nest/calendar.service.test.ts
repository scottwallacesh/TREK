import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { db } from '../../../src/db/database';
import { CalendarService } from '../../../src/nest/calendar/calendar.service';

vi.mock('../../../src/db/database', () => ({
  db: {
    prepare: vi.fn(),
  },
}));

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalendarService],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    vi.clearAllMocks();
  });

  describe('rotateCalendarToken', () => {
    it('should generate a new hex token and update the database', () => {
      const mockRun = vi.fn();
      (db.prepare as Mock).mockReturnValue({ run: mockRun });

      const token = service.rotateCalendarToken(1);

      expect(token).toBeDefined();
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(db.prepare).toHaveBeenCalledWith('UPDATE users SET calendar_token = ? WHERE id = ?');
      expect(mockRun).toHaveBeenCalledWith(token, 1);
    });
  });

  describe('generateUserCalendarFeed', () => {
    it('should throw NotFoundException if token is invalid', () => {
      (db.prepare as Mock).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });

      expect(() => service.generateUserCalendarFeed('bad-token')).toThrow(NotFoundException);
    });

    it('should generate a valid ICS feed with CRLF endings and proper folding', () => {
      const mockUser = { id: 1, username: 'testuser' };

      const mockTrips = [{
        id: 10,
        title: 'Japan Trip',
        start_date: '2026-07-01',
        end_date: '2026-07-10',
        description: 'A very long description that will definitely exceed the seventy-five character limit imposed by the RFC 5545 specification and force the line folding logic to kick in safely.'
      }];

      const mockReservations = [{
        id: 20,
        trip_title: 'Japan Trip',
        title: 'Flight to Tokyo',
        reservation_time: '2026-07-01T10:00:00Z',
        reservation_end_time: '2026-07-01T22:00:00Z',
        type: 'flight',
        status: 'confirmed',
        confirmation_number: 'XYZ123',
        location: JSON.stringify({ name: 'Heathrow' }),
        metadata: JSON.stringify({ airline: 'JAL', flightNumber: 'JL43', seat: '2A', _venue: { address: 'Terminal 3' } }),
        place_address: 'Hounslow, UK'
      }];

      const mockAccommodations = [{
        id: 30,
        trip_title: 'Japan Trip',
        place_name: 'Tokyo Hotel',
        place_address: '123 Tokyo St',
        check_in: '15:00',
        check_out: '11:00',
        confirmation: 'HTL999',
        start_date: '2026-07-01',
        end_date: '2026-07-05',
        acc_notes: 'Late check-in requested'
      }];

      (db.prepare as Mock).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, username FROM users')) return { get: () => mockUser };
        if (sql.includes('FROM trips t')) return { all: () => mockTrips };
        if (sql.includes('reservation_endpoints')) return { all: () => [{ role: 'from', name: 'Heathrow', code: 'LHR' }] };
        if (sql.includes('FROM reservations r')) return { all: () => mockReservations };
        if (sql.includes('FROM day_accommodations a')) return { all: () => mockAccommodations };
        return { all: () => [], get: () => null, run: () => { } };
      });

      const feed = service.generateUserCalendarFeed('valid-token');

      expect(feed.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
      expect(feed.endsWith('\r\nEND:VCALENDAR')).toBe(true);
      expect(feed.split('\n').every(line => line.endsWith('\r') || line === 'END:VCALENDAR')).toBe(true);

      const lines = feed.split('\r\n');
      const foldedLine = lines.find(line => line.startsWith(' '));
      expect(foldedLine).toBeDefined();

      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(75);
      });

      const unfoldedFeed = feed.replace(/\r\n /g, '');

      expect(unfoldedFeed).toContain('Airline: JAL');
      expect(unfoldedFeed).toContain('Flight Number: JL43');
      expect(unfoldedFeed).toContain('Seat: 2A');
      expect(unfoldedFeed).toContain('Booking Ref: XYZ123');

      expect(unfoldedFeed).toContain('LOCATION:Heathrow (LHR)\\, Terminal 3');

      expect(unfoldedFeed).toContain('Check-in: 15:00 | Check-out: 11:00');
    });
  });
});
