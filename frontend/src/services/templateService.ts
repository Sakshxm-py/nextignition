import api from './api';

export type FilledTemplateSlide = {
    id: string;
    name?: string;
    content: Record<string, any>;
};

export type TemplateOption = {
    id: string;
    type: string;
    name: string;
    description: string;
    tier: string;
    slideCount: number;
};

export const listTemplates = async (type = 'pitch-deck') => {
    const response = await api.get(`/templates`, { params: { type } });
    return response.data as TemplateOption[];
};

export const fillTemplate = async (templateId: string, payload: { dealRoomId?: string; fundingApplicationId?: string }) => {
    const response = await api.post(`/templates/${templateId}/fill`, payload);
    return response.data as { templateId: string; templateName: string; slides: FilledTemplateSlide[] };
};

export const exportTemplatePptx = async (
    templateId: string,
    payload: { dealRoomId?: string; fundingApplicationId?: string; slides?: FilledTemplateSlide[]; format?: 'pdf' | 'pptx' | 'jpg' }
) => {
    const response = await api.post(`/templates/${templateId}/export`, payload);
    return response.data as { downloadUrl?: string; renderUrl?: string; fileName: string; templateId: string; templateName: string; slides?: any[] };
};
