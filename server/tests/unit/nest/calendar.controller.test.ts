import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarController } from '../../../src/nest/calendar/calendar.controller';
import { CalendarService } from '../../../src/nest/calendar/calendar.service';

describe('CalendarController', () => {
  let controller: CalendarController;
  let service: CalendarService;

  const mockResponse = () => ({
    type: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        {
          provide: CalendarService,
          useValue: {
            generateUserCalendarFeed: vi.fn(),
            rotateCalendarToken: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
    service = module.get<CalendarService>(CalendarService);
  });

  describe('getFeed', () => {
    it('should return a valid ICS feed with correct headers', () => {
      const mockFeed = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR';
      const token = 'valid-token.ics';
      const res = mockResponse();

      vi.spyOn(service, 'generateUserCalendarFeed').mockReturnValue(mockFeed);

      controller.getFeed(token, res as any);

      expect(service.generateUserCalendarFeed).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/calendar; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith(mockFeed);
    });

    it('should let NotFoundExceptions bubble up for invalid tokens', () => {
      const res = mockResponse();
      vi.spyOn(service, 'generateUserCalendarFeed').mockImplementation(() => {
        throw new NotFoundException('Invalid calendar token');
      });

      expect(() => controller.getFeed('bad-token.ics', res as any)).toThrow(NotFoundException);
      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe('rotateToken', () => {
    it('should call the service to rotate the token for the authenticated user', () => {
      const mockUser = { id: 1 };
      const mockNewToken = 'new-hex-token-123';

      vi.spyOn(service, 'rotateCalendarToken').mockReturnValue(mockNewToken);

      const result = controller.rotateToken(mockUser as any);

      expect(service.rotateCalendarToken).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ calendar_token: mockNewToken });
    });
  });
});
