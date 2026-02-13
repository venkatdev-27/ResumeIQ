import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMeAPI, loginAPI, registerAPI } from '@/api/authAPI';
import { clearAuthToken, getAuthToken, getErrorMessage, setAuthToken, unwrapApiPayload } from '@/utils/helpers';

const savedToken = getAuthToken();

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { rejectWithValue }) => {
    try {
        const response = await loginAPI(credentials);
        const data = unwrapApiPayload(response);
        const token = data.token || data.accessToken;

        if (!token) {
            throw new Error('Authentication token is missing in response.');
        }

        const user = data.user || {
            name: data.name || credentials.email?.split('@')[0] || 'User',
            email: data.email || credentials.email,
        };

        return { token, user };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Login failed.'));
    }
});

export const registerUser = createAsyncThunk('auth/registerUser', async (payload, { rejectWithValue }) => {
    try {
        const response = await registerAPI(payload);
        const data = unwrapApiPayload(response);
        const token = data.token || data.accessToken || null;
        const user = data.user || {
            name: data.name || payload.name || 'User',
            email: data.email || payload.email,
        };

        return { token, user, message: data.message || 'Registration successful.' };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Registration failed.'));
    }
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_payload, { rejectWithValue }) => {
    try {
        const response = await getMeAPI();
        const data = unwrapApiPayload(response);

        if (!data?.user) {
            throw new Error('Unable to load user profile.');
        }

        return data.user;
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch current user.'));
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        token: savedToken || null,
        user: null,
        isAuthenticated: Boolean(savedToken),
        status: 'idle',
        registerStatus: 'idle',
        error: null,
        registerMessage: null,
    },
    reducers: {
        logout(state) {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            state.status = 'idle';
            state.error = null;
            clearAuthToken();
        },
        clearAuthError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                setAuthToken(action.payload.token);
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Unable to login.';
            })
            .addCase(registerUser.pending, (state) => {
                state.registerStatus = 'loading';
                state.error = null;
                state.registerMessage = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.registerStatus = 'succeeded';
                state.registerMessage = action.payload.message;

                if (action.payload.token) {
                    state.token = action.payload.token;
                    state.user = action.payload.user;
                    state.isAuthenticated = true;
                    setAuthToken(action.payload.token);
                }
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.registerStatus = 'failed';
                state.error = action.payload || 'Unable to register.';
            })
            .addCase(fetchCurrentUser.pending, (state) => {
                state.error = null;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(fetchCurrentUser.rejected, (state) => {
                state.token = null;
                state.user = null;
                state.isAuthenticated = false;
                clearAuthToken();
            });
    },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
