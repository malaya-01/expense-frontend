'use client'

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {FLUSH, PAUSE, PERSIST, persistReducer, PURGE, REGISTER, REHYDRATE, persistStore} from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import authReducer from "./feature/authSlice";
import { TypedUseSelectorHook, useSelector } from "react-redux";
import userReducer from "./feature/userSlice";

const createNoopStorage = () =>{
    return {
        getItem(_key:any){
            return Promise.resolve(null);
        },
        setItem(_key:any, _value:any){
            return Promise.resolve();
        },
        removeItem(_key:any){
            return Promise.resolve();
        }
    }
}

const storageEngine = typeof window !== 'undefined' ? createWebStorage('local'): createNoopStorage();

const persistConfig = {
    key: 'root',
    storage: storageEngine,
    whitelist:['auth', 'user']
}

const appReducer = combineReducers({
    auth: authReducer,
    user: userReducer,
})

const rootReducer = (state:any, action:any)=>{
    if(action.type === 'RESET_STORE'){
        state = undefined;
    }
    return appReducer(state, action);
}

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoredActions:['persist/PERSIST', 'persist/REHYDRATE', FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
        }
    })
})

export const handleLogout = async () =>{
    await resetReduxStore();
}

export const resetReduxStore = async() =>{
    persistor.pause();
    store.dispatch({type: 'RESET_STORE'})
    await persistor.flush();
    await persistor.purge()
}

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;