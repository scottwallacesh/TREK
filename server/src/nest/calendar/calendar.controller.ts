import { Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import type { User } from '../../types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@Controller('api/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) { }

  /**
   * PUBLIC ENDPOINT: Serves the live .ics feed to external calendar apps.
   * Do NOT attach JwtAuthGuard here!
   */
  @Get('feed/:token.ics')
  getFeed(@Param('token') token: string, @Res() res: Response) {
    const feed = this.calendarService.generateUserCalendarFeed(token);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="trek-feed.ics"');

    res.setHeader('Cache-Control', 'public, max-age=43200');

    res.send(feed);
  }

  /**
   * PROTECTED ENDPOINT: Generates/Rotates the token for the currently logged-in user.
   */
  @Post('rotate')
  @UseGuards(JwtAuthGuard)
  rotateToken(@CurrentUser() user: User) {
    const newToken = this.calendarService.rotateCalendarToken(user.id);
    return { calendar_token: newToken };
  }
}
