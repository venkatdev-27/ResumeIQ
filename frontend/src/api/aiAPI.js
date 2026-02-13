import axiosInstance from './axiosInstance';

export const fetchAISuggestionsAPI = async (payload) => {
    const response = await axiosInstance.post('/ai/improve', payload);
    return response.data;
};

export const improveResumeContentAPI = async (payload) => {
    const response = await axiosInstance.post('/ai/improve', payload);
    return response.data;
};
