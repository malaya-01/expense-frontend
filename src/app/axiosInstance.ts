import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import Cookies from 'js-cookie';

const createAxiosInstance = (): AxiosInstance =>{
    const instance = axios.create({
        baseURL: process.env.VITE_API_BASE_URL || "http://localhost:9000/api",
        headers:{
            "Content-Type": "application/json"
        }

    })

    instance.interceptors.request.use((config:InternalAxiosRequestConfig):InternalAxiosRequestConfig =>{
        const accessToken = Cookies.get('access_token');

        if(!config.headers || !(config.headers instanceof axios.AxiosHeaders)) {
            config.headers = new axios.AxiosHeaders();
        }

        if(accessToken){
            config.headers.set('Authorization', `Bearer ${accessToken}`);
        }

        return config;
    })
    
    instance.interceptors.response.use(
        (response:AxiosResponse) => response,
        (error: any) => Promise.reject(error)
    );

    return instance;
}

export default createAxiosInstance;
