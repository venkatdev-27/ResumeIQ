import axiosInstance from './axiosInstance';

export const loginAPI = async (payload) => {
    const response = await axiosInstance.post('/auth/login', payload);
    return response.data;
};

export const registerAPI = async (payload) => {
    const response = await axiosInstance.post('/auth/register', payload);
    return response.data;
};

export const getMeAPI = async () => {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
};
