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
      // makes sure we don't retain the query string in the redirect
      // the google auth flow will keep the query string when redirected back to the home page without this
      window.location.href = `${window.location.origin}${locationHeader}`;
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
      // makes sure we don't retain the query string in the redirect
      // the google auth flow will keep the query string when redirected back to the home page without this
      window.location.href = `${window.location.origin}${locationHeader}`;
    }

    // Handle the error response
    return Promise.reject(error);
  }
);

export { authAxios };
