import { Injectable, NotFoundException } from '@nestjs/common';
import crypto from 'crypto';
import { db } from '../../db/database';

function formatTzTime(prop: string, date: string, time: string, tz: string | null): string {
  const dStr = date.replace(/-/g, '');
  const tStr = time.replace(/:/g, '').padEnd(6, '0').substring(0, 6);
  if (tz) {
    return `${prop};TZID=${tz}:${dStr}T${tStr}`;
  }
  return `${prop}:${dStr}T${tStr}`;
}

function toIcsDate(dateStr: string, addDays = 0): string {
  const d = new Date(dateStr);
  if (addDays) d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function toIcsDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const parts = String(dateStr).match(/\d+/g);
  if (!parts || parts.length < 3) return null;

  const year = parts[0].padStart(4, '0');
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  const hour = (parts[3] || '00').padStart(2, '0');
  const min = (parts[4] || '00').padStart(2, '0');
  const sec = (parts[5] || '00').padStart(2, '0');

  return `${year}${month}${day}T${hour}${min}${sec}`;
}

function getIcsTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(str: string | null): string {
  if (!str) return '';
  return String(str).replace(/[\\;,]/g, (match) => '\\' + match).replace(/\r?\n/g, '\\n');
}

function extractMetadataInfo(obj: any): string[] {
  if (!obj || typeof obj !== 'object') return [];

  const lines: string[] = [];
  const skipKeys = new Set(['@type', '@context', 'id', 'url', 'image', 'potentialaction']);

  const traverse = (current: any, path: string[]) => {
    if (current === null || current === undefined || current === '') return;

    if (typeof current !== 'object') {
      const label = path.length > 0 ? path[path.length - 1] : '';
      if (label && !skipKeys.has(label.toLowerCase())) {
        const readableLabel = label.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()).trim();
        lines.push(`${readableLabel}: ${current}`);
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((item) => traverse(item, path));
      return;
    }

    for (const [key, value] of Object.entries(current)) {
      traverse(value, [...path, key]);
    }
  };

  traverse(obj, []);
  return [...new Set(lines)];
}

function createVEvent(opts: {
  uid: string;
  dtstamp: string;
  startLine: string;
  endLine: string;
  summary: string;
  locationName?: string;
  locationCode?: string;
  address?: string;
  status?: string;
  confirmation?: string;
  metadataObj?: any;
  times?: string[];
  phone?: string;
  website?: string;
  notes?: (string | null | undefined)[];
}): string[] {
  let loc = opts.locationName || '';
  if (opts.locationCode && !loc.toUpperCase().includes(opts.locationCode.toUpperCase())) {
    loc += ` (${opts.locationCode})`;
  }
  if (opts.address && !loc.includes(opts.address)) {
    loc = loc ? `${loc}, ${opts.address}` : opts.address;
  }

  const desc: string[] = [];

  if (opts.status && opts.status !== 'confirmed') desc.push(`Status: [${opts.status.toUpperCase()}]`);
  if (opts.confirmation) desc.push(`Booking Ref: ${opts.confirmation}`);
  if (opts.times && opts.times.length > 0) desc.push(opts.times.join(' | '));

  if (opts.metadataObj) {
    const metaLines = extractMetadataInfo(opts.metadataObj);
    if (metaLines.length > 0) desc.push(metaLines.join('\n'));
  }

  const contact = [];
  if (opts.phone) contact.push(`Phone: ${opts.phone}`);
  if (opts.website) contact.push(`Website: ${opts.website}`);
  if (contact.length > 0) desc.push(contact.join(' | '));

  const rawNotes = (opts.notes || []).filter(n => n && String(n).trim().length > 0) as string[];
  if (rawNotes.length > 0) {
    desc.push([...new Set(rawNotes)].join('\n\n'));
  }

  if (desc.length === 0) desc.push('Planned in TREK');

  return [
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${opts.dtstamp}`,
    opts.startLine,
    opts.endLine,
    `SUMMARY:${escapeIcs(opts.summary)}`,
    `LOCATION:${escapeIcs(loc.trim())}`,
    `DESCRIPTION:${escapeIcs(desc.join('\n\n'))}`,
    'END:VEVENT'
  ];
}

@Injectable()
export class CalendarService {
  rotateCalendarToken(userId: number): string {
    const token = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE users SET calendar_token = ? WHERE id = ?').run(token, userId);
    return token;
  }

  generateUserCalendarFeed(token: string): string {
    const user = db.prepare('SELECT id, username FROM users WHERE calendar_token = ?').get(token) as any;
    if (!user) throw new NotFoundException('Invalid calendar token');

    const dtstamp = getIcsTimestamp();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TREK//Calendar Sync//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:TREK Trips - ${user.username}`,
      'X-PUBLISHED-TTL:PT12H'
    ];

    const trips = db.prepare(`
      SELECT DISTINCT t.id, t.title, t.start_date, t.end_date, t.description
      FROM trips t
      LEFT JOIN trip_members tm ON t.id = tm.trip_id
      WHERE (t.user_id = ? OR tm.user_id = ?)
        AND t.start_date IS NOT NULL
    `).all(user.id, user.id) as any[];

    for (const trip of trips) {
      const start = toIcsDate(trip.start_date);
      const end = toIcsDate(trip.end_date || trip.start_date, 1);

      lines.push(...createVEvent({
        uid: `trek-trip-${trip.id}@${process.env.APP_URL?.replace(/^https?:\/\//, '') || 'local'}`,
        dtstamp,
        startLine: `DTSTART;VALUE=DATE:${start}`,
        endLine: `DTEND;VALUE=DATE:${end}`,
        summary: `Trip: ${trip.title}`,
        notes: [trip.description]
      }));
    }

    let getEndpointsStmt: any = null;
    try {
      getEndpointsStmt = db.prepare('SELECT * FROM reservation_endpoints WHERE reservation_id = ? ORDER BY sequence ASC');
    } catch (e) { }

    const reservations = db.prepare(`
      SELECT DISTINCT
        r.*,
        p.name as place_name,
        p.address as place_address,
        p.phone as place_phone,
        p.website as place_website,
        p.description as place_desc,
        p.notes as place_notes,
        p.reservation_notes as place_res_notes,
        da.notes as da_notes,
        da.reservation_notes as da_res_notes
      FROM reservations r
      JOIN trips t ON r.trip_id = t.id
      LEFT JOIN places p ON r.place_id = p.id
      LEFT JOIN day_assignments da ON r.assignment_id = da.id
      LEFT JOIN trip_members tm ON t.id = tm.trip_id
      WHERE (t.user_id = ? OR tm.user_id = ?)
        AND r.reservation_time IS NOT NULL
    `).all(user.id, user.id) as any[];

    for (const res of reservations) {
      const start = toIcsDateTime(res.reservation_time);
      if (!start) continue;
      const end = toIcsDateTime(res.reservation_end_time) || start;

      let startLine = `DTSTART:${start}`;
      let endLine = `DTEND:${end}`;

      let locationName = '';
      let locationCode = '';
      let address = '';

      if (getEndpointsStmt) {
        try {
          const endpoints = getEndpointsStmt.all(res.id) as any[];
          if (endpoints && endpoints.length > 0) {
            const dep = endpoints.find((e: any) => e.role === 'from') || endpoints[0];
            const arr = endpoints.find((e: any) => e.role === 'to') || endpoints[endpoints.length - 1];

            locationName = dep.name || '';
            locationCode = dep.code || '';

            if (dep.local_date && dep.local_time && dep.timezone) {
              startLine = formatTzTime('DTSTART', dep.local_date, dep.local_time, dep.timezone);
            }
            if (arr.local_date && arr.local_time && arr.timezone) {
              endLine = formatTzTime('DTEND', arr.local_date, arr.local_time, arr.timezone);
            }
          }
        } catch (e) { }
      }

      let parsedLoc: any = null;
      try { parsedLoc = JSON.parse(res.location); } catch (e) { }
      if (parsedLoc && typeof parsedLoc === 'object') {
        if (!locationName) locationName = parsedLoc.name || parsedLoc.title || '';
        if (parsedLoc.address) address = parsedLoc.address;
      }

      let parsedMeta: any = null;
      try { parsedMeta = JSON.parse(res.metadata); } catch (e) { }
      if (parsedMeta && typeof parsedMeta === 'object') {
        if (!address && parsedMeta.address) address = parsedMeta.address;
        if (!address && parsedMeta.streetAddress) address = parsedMeta.streetAddress;
        if (!address && parsedMeta._venue?.address) address = parsedMeta._venue.address;
      }

      if (!locationName && res.place_name) locationName = res.place_name;
      if (!address && res.place_address) address = res.place_address;
      if (!locationName && res.location && typeof res.location === 'string' && !res.location.startsWith('{')) {
        locationName = res.location;
      }

      lines.push(...createVEvent({
        uid: `trek-res-${res.id}@${process.env.APP_URL?.replace(/^https?:\/\//, '') || 'local'}`,
        dtstamp,
        startLine,
        endLine,
        summary: res.title,
        locationName,
        locationCode,
        address,
        status: res.status,
        confirmation: res.confirmation_number,
        metadataObj: parsedMeta,
        phone: res.place_phone,
        website: res.place_website,
        notes: [res.notes, res.da_notes, res.da_res_notes, res.place_res_notes, res.place_notes, res.place_desc]
      }));
    }

    const accommodations = db.prepare(`
      SELECT DISTINCT
        a.id,
        p.name as place_name,
        p.address as place_address,
        p.phone as place_phone,
        p.website as place_website,
        p.description as place_desc,
        p.notes as place_notes,
        p.reservation_notes as place_res_notes,
        a.check_in,
        a.check_out,
        a.confirmation,
        a.notes as acc_notes,
        sd.date as start_date,
        ed.date as end_date,
        sd.day_number as day_number,
        (SELECT id FROM reservations WHERE accommodation_id = a.id OR accommodation_id = CAST(a.id AS TEXT) LIMIT 1) as linked_res_id
      FROM day_accommodations a
      JOIN trips t ON a.trip_id = t.id
      LEFT JOIN places p ON a.place_id = p.id
      LEFT JOIN days sd ON a.start_day_id = sd.id
      LEFT JOIN days ed ON a.end_day_id = ed.id
      LEFT JOIN trip_members tm ON t.id = tm.trip_id
      WHERE (t.user_id = ? OR tm.user_id = ?)
    `).all(user.id, user.id) as any[];

    for (const acc of accommodations) {
      if (!acc.start_date) continue;

      let accTz: string | null = null;

      if (acc.linked_res_id && getEndpointsStmt) {
        try {
          const endpoints = getEndpointsStmt.all(acc.linked_res_id) as any[];
          if (endpoints && endpoints.length > 0) {
            const ep = endpoints.find((e: any) => e.timezone) || endpoints[0];
            if (ep && ep.timezone) {
              accTz = ep.timezone;
            }
          }
        } catch (e) { }
      }

      let startLine = '';
      let endLine = '';

      if (acc.check_in) {
        startLine = formatTzTime('DTSTART', acc.start_date, acc.check_in, accTz);

        const endDateStr = acc.end_date || acc.start_date;
        if (acc.check_out) {
          endLine = formatTzTime('DTEND', endDateStr, acc.check_out, accTz);
        } else {
          endLine = formatTzTime('DTEND', endDateStr, '11:00', accTz);
        }
      } else {
        const start = toIcsDate(acc.start_date);
        const end = toIcsDate(acc.end_date || acc.start_date, 1);
        startLine = `DTSTART;VALUE=DATE:${start}`;
        endLine = `DTEND;VALUE=DATE:${end}`;
      }

      lines.push(...createVEvent({
        uid: `trek-acc-${acc.id}@${process.env.APP_URL?.replace(/^https?:\/\//, '') || 'local'}`,
        dtstamp,
        startLine,
        endLine,
        summary: `Accommodation: ${acc.place_name || 'Day ' + acc.day_number}`,
        locationName: acc.place_name,
        address: acc.place_address,
        confirmation: acc.confirmation,
        times: [
          acc.check_in ? `Check-in: ${acc.check_in}` : null,
          acc.check_out ? `Check-out: ${acc.check_out}` : null
        ].filter(Boolean) as string[],
        phone: acc.place_phone,
        website: acc.place_website,
        notes: [acc.acc_notes, acc.place_res_notes, acc.place_notes, acc.place_desc]
      }));
    }

    lines.push('END:VCALENDAR');

    // RFC 5545 Line Folding: Fold individual properties cleanly
    return lines
      .map(line => {
        const chunks = line.match(/.{1,74}/gu);
        return chunks ? chunks.join('\r\n ') : line;
      })
      .join('\r\n');
  }
}
