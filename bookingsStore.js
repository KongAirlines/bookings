const fs = require('node:fs');
const crypto = require('node:crypto');

// File persistence is suitable for this single-process demo, not a production database.
class BookingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.bookings = {};
    if (fs.existsSync(filePath)) this.bookings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  getAccountBookings(accountId) {
    if (!Object.hasOwn(this.bookings, accountId)) {
      const ticket = crypto.createHash('sha256').update(accountId).digest('hex').slice(0, 12).toUpperCase();
      this.bookings[accountId] = [{
        ticket_number: ticket,
        seat: '18A',
        flight: {
          number: 'KA0288',
          route_id: 'LHR-BOM',
          scheduled_departure: '2027-02-13T09:30:00Z',
          scheduled_arrival: '2027-02-13T18:40:00Z',
        },
      }];
    }
    return this.bookings[accountId];
  }

  getAccountBooking(accountId, ticketNumber) {
    return this.getAccountBookings(accountId).find(booking => booking.ticket_number === ticketNumber);
  }

  addBooking(accountId, booking) {
    this.getAccountBookings(accountId).push(booking);
    fs.writeFileSync(this.filePath, JSON.stringify(this.bookings));
  }
}

module.exports = BookingsStore;
