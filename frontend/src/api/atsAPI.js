import axiosInstance from './axiosInstance';

export const fetchATSScoreAPI = async (payload) => {
    const response = await axiosInstance.post('/ats/score', payload);
    return response.data;
};
