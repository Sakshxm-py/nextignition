import api from './api';

export const createInvestorProfile = async (profileData?: any) => {
  const response = await api.post('/funding/create-investor-profile', profileData || {});
  return response.data;
};
