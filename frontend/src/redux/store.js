import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import resumeReducer from './resumeSlice';
import atsReducer from './atsSlice';
import aiReducer from './aiSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        resume: resumeReducer,
        ats: atsReducer,
        ai: aiReducer,
    },
});

export default store;
