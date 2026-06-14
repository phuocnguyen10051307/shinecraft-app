export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceCategory {
  _id: string;
  name: string;
  description: string;
}

export interface BookingService {
  _id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface BookingVehicle {
  _id: string;
  name: string;
  licensePlate: string;
  type: 'car' | 'motorbike';
}

export interface Appointment {
  _id: string;
  code: string;
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  appointmentDate: string;
  timeSlot: string;
  scheduledAt: string;
  status: AppointmentStatus;
  note?: string;
  totalEstimatedPrice: number;
  totalDurationMinutes: number;
  assignedStaffId?: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    _id: 'category-wash',
    name: 'Rửa xe',
    description: 'Làm sạch ngoại thất từ cơ bản đến chuyên sâu.',
  },
  {
    _id: 'category-interior',
    name: 'Nội thất',
    description: 'Vệ sinh, khử mùi và chăm sóc khoang xe.',
  },
  {
    _id: 'category-paint',
    name: 'Sơn & bảo vệ',
    description: 'Khôi phục độ bóng và bảo vệ bề mặt sơn.',
  },
  {
    _id: 'category-maintenance',
    name: 'Bảo dưỡng',
    description: 'Kiểm tra và bảo dưỡng vận hành định kỳ.',
  },
];

export const bookingServices: BookingService[] = [
  {
    _id: 'service-premium-wash',
    categoryId: 'category-wash',
    slug: 'premium-car-wash',
    name: 'Rửa xe cao cấp',
    description: 'Rửa thân xe, mâm lốp và hút bụi nhanh.',
    durationMinutes: 45,
    price: 180000,
    isActive: true,
  },
  {
    _id: 'service-detailing',
    categoryId: 'category-wash',
    slug: 'exterior-detailing',
    name: 'Detailing ngoại thất',
    description: 'Làm sạch chuyên sâu các khe, kính và bề mặt sơn.',
    durationMinutes: 120,
    price: 850000,
    isActive: true,
  },
  {
    _id: 'service-interior',
    categoryId: 'category-interior',
    slug: 'interior-deep-clean',
    name: 'Vệ sinh nội thất chuyên sâu',
    description: 'Vệ sinh ghế, trần, sàn và khử mùi khoang xe.',
    durationMinutes: 150,
    price: 1200000,
    isActive: true,
  },
  {
    _id: 'service-ceramic',
    categoryId: 'category-paint',
    slug: 'ceramic-coating',
    name: 'Phủ ceramic',
    description: 'Tạo lớp phủ bóng và bảo vệ sơn lâu dài.',
    durationMinutes: 300,
    price: 3500000,
    isActive: true,
  },
  {
    _id: 'service-polish',
    categoryId: 'category-paint',
    slug: 'one-step-polish',
    name: 'Đánh bóng một bước',
    description: 'Xử lý xước nhẹ và khôi phục độ bóng bề mặt.',
    durationMinutes: 180,
    price: 1800000,
    isActive: true,
  },
  {
    _id: 'service-maintenance',
    categoryId: 'category-maintenance',
    slug: 'periodic-maintenance',
    name: 'Bảo dưỡng định kỳ',
    description: 'Kiểm tra dầu, lọc, phanh, lốp và hệ thống điện.',
    durationMinutes: 90,
    price: 650000,
    isActive: true,
  },
];

export const bookingVehicles: BookingVehicle[] = [
  {
    _id: 'vehicle-mercedes',
    name: 'Mercedes-Benz C 300',
    licensePlate: '51H-248.19',
    type: 'car',
  },
  {
    _id: 'vehicle-tesla',
    name: 'Tesla Model Y',
    licensePlate: '30K-556.72',
    type: 'car',
  },
];

export const initialAppointments: Appointment[] = [
  {
    _id: 'appointment-001',
    code: 'SC-260614-01',
    customerId: 'customer-demo',
    vehicleId: 'vehicle-mercedes',
    serviceIds: ['service-detailing'],
    appointmentDate: '2026-06-16',
    timeSlot: '09:30',
    scheduledAt: '2026-06-16T09:30:00+07:00',
    status: 'confirmed',
    totalEstimatedPrice: 850000,
    totalDurationMinutes: 120,
    assignedStaffId: 'staff-detailing-01',
  },
  {
    _id: 'appointment-002',
    code: 'SC-260615-02',
    customerId: 'customer-demo',
    vehicleId: 'vehicle-tesla',
    serviceIds: ['service-interior'],
    appointmentDate: '2026-06-18',
    timeSlot: '13:00',
    scheduledAt: '2026-06-18T13:00:00+07:00',
    status: 'pending',
    note: 'Vui lòng kiểm tra kỹ mùi điều hòa.',
    totalEstimatedPrice: 1200000,
    totalDurationMinutes: 150,
  },
];

export const timeSlots = ['08:00', '09:30', '11:00', '13:00', '14:30', '16:00'];

export function createBookingDates(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    const value = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');

    return {
      value,
      weekday: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      day: String(date.getDate()).padStart(2, '0'),
      month: `Th${date.getMonth() + 1}`,
    };
  });
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} giờ ${remaining} phút` : `${hours} giờ`;
}
