import api from './api';

export const createBooking = async (bookingData: {
    expert: string;
    date: string;
    startTime: string;
    duration?: number;
    topic: string;
    notes?: string;
}) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
};

export const getMyBookings = async () => {
    const response = await api.get('/bookings');
    return response.data;
};

export const updateBookingStatus = async (id: string, status: string) => {
    const response = await api.put(`/bookings/${id}/status`, { status });
    return response.data;
};
