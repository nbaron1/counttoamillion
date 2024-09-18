import axios from 'axios';
import { config } from './config';

export const axiosInstance = axios.create({
  baseURL: config.backendHost,
  withCredentials: true,
});

axiosInstance.interceptors.response.use((res) => {
  // todo: check if status code is 403 and redirect to auth page
  console.log('INTERCEPTED', res.status);

  // check if Location header exists. If so redirect to that location

  return res;
});
