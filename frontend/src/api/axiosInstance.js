import axios from 'axios';
import { API_TIMEOUT } from '@/utils/constants';
import { clearAuthToken, getAuthToken } from '@/utils/helpers';

const resolveBaseUrl = () => {
    const envValue = String(import.meta.env.VITE_API_URL || '').trim();
    if (envValue) {
        return envValue.replace(/\/+$/, '');
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'http://localhost:5000';
};

const BASE_URL = resolveBaseUrl();

const axiosInstance = axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: API_TIMEOUT,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            clearAuthToken();
        }
        return Promise.reject(error);
    },
);

export default axiosInstance;
