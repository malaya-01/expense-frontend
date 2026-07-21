import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface userState{
    id: string;
    email: string;
    full_name: string;
}

const defaultState: userState = {
    id: '',
    email: '',
    full_name: '',
}

interface userSliceState{
    user: userState;
}

const initialState: userSliceState = {
    user: defaultState,
}

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers:{
        setUserDetails:(state, action: PayloadAction<userState>) => {
            state.user = action.payload;
        },
        clearUserDetails:(state) => {
            state.user = defaultState;
        }
    }
})

export const{setUserDetails, clearUserDetails} = userSlice.actions;
export default userSlice.reducer;