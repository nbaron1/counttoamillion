import axios from 'axios';
import { useAccessToken } from '../context/Auth';
import { config } from './config';

const useAxios = () => {
  const token = useAccessToken();

  const axiosInstace = axios.create({
    baseURL: config.backendApiHost,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return axiosInstace;
};

export { useAxios };
