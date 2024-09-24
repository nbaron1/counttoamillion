import axiosLib from 'axios';
import { config } from './config';

const authAxios = axiosLib.create({
  baseURL: config.backendApiHost,
  withCredentials: true,
});

authAxios.interceptors.response.use(
  (response) => {
    const locationHeader = response.headers['location'];

    if (
      typeof locationHeader === 'string' &&
      window.location.pathname !== locationHeader
    ) {
      window.location.pathname = locationHeader;
    }

    // Return the response for further processing
    return response;
  },
  (error) => {
    const locationHeader = error.response.headers['location'];

    if (
      typeof locationHeader === 'string' &&
      window.location.pathname !== locationHeader &&
      // Make sure the location header is a relative path
      locationHeader.startsWith('/')
    ) {
      window.location.pathname = locationHeader;
    }

    // Handle the error response
    return Promise.reject(error);
  }
);

export { authAxios };
