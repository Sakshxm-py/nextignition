import api from './api';

export const getInvestorPipeline = async () => {
  const response = await api.get('/startups/investor/pipeline');
  return response.data;
};

export const updateStartupPipelineStage = async (startupId: string, stage: string) => {
  const response = await api.put(`/startups/investor/pipeline/${startupId}`, { stage });
  return response.data;
};

export const getInvestorDiscovery = async (filters: any = {}) => {
  const response = await api.get('/startups/investor/discover', { params: filters });
  return response.data;
};

export const getInvestorPortfolio = async () => {
  const response = await api.get('/startups/investor/portfolio');
  return response.data;
};

export const addStartupToPipeline = async (startupId: string) => {
  const response = await api.post(`/startups/investor/pipeline/${startupId}`);
  return response.data;
};
