import axios from 'axios';

export const axiosInstance = axios.create({
    baseURL: import.meta.env.MODE==="deployment"?"http://localhost:5001/api":"/api", 
    withCredentials: true, // This allows cookies to be sent with requests
});