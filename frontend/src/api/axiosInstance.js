import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/utils/constants';
import { clearAuthToken, getAuthToken } from '@/utils/helpers';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error('Network error / Server not reachable');
    }

    if (error?.response?.status === 401) {
      clearAuthToken();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
